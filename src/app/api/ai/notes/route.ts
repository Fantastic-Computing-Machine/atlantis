import { csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { logApiError } from '@/lib/logger';
import { getAiApiKey, getAiProvider } from '@/lib/settings';
import { NextResponse } from 'next/server';

const OPENAI_MODEL = 'gpt-4o-mini';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

type Provider = 'openai' | 'gemini';

const SYSTEM_PROMPT = `
AS A: Expert Writer and Elite Copy Editor.
TASK: Improve, summarize, or modify the user's text based on their specific instruction.
CONTEXT: The user has provided a text note that they want to edit.
FORMAT: Return ONLY the modified text. Do not include markdown code fences (like \`\`\`), do not include introductory texts (like "Here is the summary"), and do not include explanations.

You must follow these rules:
1. Grounding: Use only the information provided in the user's text. Do not invent facts.
2. Preserve Formatting: Maintain the original formatting of the text, including markdown syntax (like # headers, **bold**, *italics*, bullet points, numbered lists, etc.). Do not strip, escape, or alter markdown characters unless the user explicitly asks for plain text.
3. Markdown Best Practices: When outputting markdown lists:
   - Use single space after list markers (e.g., "1. Item" not "1.  Item", "- Item" not "*   Item")
   - Use "-" for unordered lists instead of "*" (clearer parsing)
   - Use 2-space indentation for nested lists
   - Add a blank line before nested lists under numbered items
4. Tone: Professional, authoritative, and polished, unless the user requests a specific tone.
5. Constraints: Do not explain your changes. Do not chat. Just output the result.
`.trim();

function buildUserPrompt(content: string, prompt: string): string {
    return [
        'CTX: USER_CONTENT',
        '<<<USER_CONTENT',
        content,
        'USER_CONTENT>>>',
        '',
        'TASK: INSTRUCTION',
        '<<<INSTRUCTION',
        prompt,
        'INSTRUCTION>>>',
    ].join('\n');
}

function resolveProvider(apiKey: string, storedProvider: Provider | 'auto'): Provider {
    if (storedProvider !== 'auto') return storedProvider;
    if (apiKey.startsWith('AIza') || apiKey.startsWith('AI') || apiKey.startsWith('gsk_')) {
        return 'gemini';
    }
    return 'openai';
}

interface AiOptions {
    jsonMode?: boolean;
}

async function callProvider(apiKey: string, prompt: string, content: string, preferred: Provider | 'auto', options: AiOptions = {}): Promise<string> {
    const provider = resolveProvider(apiKey, preferred);
    if (provider === 'gemini') {
        return callGemini(apiKey, prompt, content, options);
    }
    return callOpenAI(apiKey, prompt, content, options);
}

async function callOpenAI(apiKey: string, prompt: string, content: string, options: AiOptions): Promise<string> {
    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const userPrompt = buildUserPrompt(content, prompt);
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: options.jsonMode ? SYSTEM_PROMPT + " Output valid JSON." : SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
            ],
            max_tokens: 8000,
            temperature: 1.0,
            response_format: options.jsonMode ? { type: "json_object" } : undefined,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`openai error: ${response.status} ${errorBody}`);
    }

    const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Empty AI response');
    return text;
}

async function callGemini(apiKey: string, prompt: string, content: string, options: AiOptions): Promise<string> {
    const userPrompt = buildUserPrompt(content, prompt);
    const attempt = async (model: string) => {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }],
                    },
                ],
                generationConfig: {
                    temperature: 1.0,
                    maxOutputTokens: 8000,
                    response_mime_type: options.jsonMode ? 'application/json' : 'text/plain',
                },
            }),
        });

        if (!response.ok) {
            // Handle 404 (model not found) specifically to try fallback
            if (response.status === 404) {
                throw new Error(`model not found: ${model}`);
            }
            const errorBody = await response.text();
            throw new Error(`gemini error: ${response.status} ${errorBody}`);
        }

        const data = (await response.json()) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!text) throw new Error('Empty AI response');
        return text;
    };

    try {
        return await attempt(GEMINI_MODEL);
    } catch (error) {
        if (GEMINI_MODEL.endsWith('-latest')) throw error;
        try {
            return await attempt(`${GEMINI_MODEL}-latest`);
        } catch {
            throw error;
        }
    }
}

// Strip outer markdown code blocks if the AI adds them (it shouldn't due to prompt, but safety first)
// Strip outer markdown code blocks if the AI adds them
function sanitizeResponse(text: string): string {
    const trimmed = text.trim();
    // Match code fences with 3 or more backticks across multiple lines
    // Group 1: The opening fence (e.g., "```" or "````")
    // Group 2: Optional language identifier
    // Group 3: The content (non-greedy, including newlines)
    // We match the closing fence to be the same length as Group 1
    const fenceMatch = trimmed.match(/^(`{3,})(?:[a-zA-Z0-9]*)?\s*([\s\S]*?)\s*\1$/);

    if (fenceMatch?.[2]) {
        return fenceMatch[2].trim();
    }
    return trimmed;
}

export async function POST(request: Request) {
    if (!(await validateCsrfToken(request))) {
        return csrfFailureResponse();
    }

    try {
        const apiKey = await getAiApiKey();
        const storedProvider = await getAiProvider();
        if (!apiKey) {
            return NextResponse.json({ error: 'AI key not configured' }, { status: 400 });
        }

        const body = await request.json();
        const { prompt, content, language } = body ?? {};

        if (typeof prompt !== 'string' || typeof content !== 'string') {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        let finalPrompt = prompt;
        const isTodo = language === 'todo';

        if (isTodo) {
            finalPrompt += `\n\nCRITICAL FORMATTING INSTRUCTION: The user is editing a Todo List. You MUST output a JSON object with a single key "tasks" containing an array of strings. Each string represents a task.
            - If a task is complete, prefix it strictly with "[x] ".
            - If a task is incomplete, prefix it strictly with "[ ] ".
            - Example: { "tasks": ["[ ] Buy milk", "[x] Walk dog"] }
            - Do not include numbered lists or other properties. Just the string array.`;
        }

        const updatedContent = await callProvider(apiKey, finalPrompt, content, storedProvider, { jsonMode: isTodo });

        let sanitized = sanitizeResponse(updatedContent);

        // If we requested JSON for todos, we need to parse it and convert back to markdown
        if (isTodo) {
            try {
                // Remove any markdown fencing that might still persist
                const jsonStr = sanitized.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                const parsed = JSON.parse(jsonStr) as { tasks: string[] };

                if (Array.isArray(parsed.tasks)) {
                    sanitized = parsed.tasks.map(t => {
                        // Ensure it starts with dash for the parser
                        if (t.startsWith('- ')) return t;
                        return `- ${t}`;
                    }).join('\n');
                }
            } catch (e) {
                // Fallback: if JSON parsing fails, use the raw text but try to salvage it
                console.error('Failed to parse Todo JSON', e);
            }
        }

        return NextResponse.json({ content: sanitized });
    } catch (error) {
        logApiError('POST /api/ai/notes', error);
        return NextResponse.json({ error: 'AI request failed' }, { status: 500 });
    }
}
