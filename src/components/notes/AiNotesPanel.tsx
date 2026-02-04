'use client';

import { GeminiSpark } from '@/components/icons/GeminiSpark';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CSRF_HEADER_NAME, ensureCsrfToken } from '@/lib/csrf-client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Check, FileText, Eraser, MoveHorizontal, MoveVertical, SendHorizontal } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AiNotesPanelProps {
    noteContent: string;
    language?: string;
    onApply: (content: string) => void;
}

const QUICK_ACTIONS = [
    {
        id: 'proof',
        label: 'Proofread',
        icon: Check,
        prompt: 'Act as an expert copy editor. Proofread the following text for grammar, spelling, punctuation, and style correctness. Maintain the original voice but ensure it is polished and error-free. Output only the corrected text.'
    },
    {
        id: 'cleanup',
        label: 'Cleanup',
        icon: Eraser,
        prompt: 'Act as a professional formatter. Clean up the structure and formatting of the following text. Consolidate fragmented lines, fix indentation, and ensure consistent styling. Output only the cleaned text.'
    },
    {
        id: 'summarize',
        label: 'Summarize',
        icon: FileText,
        prompt: 'Act as a concise summarizer. Create a clear, high-level summary of the following text that captures the main arguments and key details. Output only the summary.'
    },
    {
        id: 'shorten',
        label: 'Shorten',
        icon: MoveHorizontal,
        prompt: 'Act as a ruthless editor. Shorten the following text by removing redundancy and fluff while preserving the core meaning and tone. Output only the shortened text.'
    },
    {
        id: 'lengthen',
        label: 'Expand',
        icon: MoveVertical,
        prompt: 'Act as a creative ghostwriter. Expand on the following text by adding relevant details, examples, and depth. Enhance the narrative flow. Output only the expanded text.'
    },
];

export function AiNotesPanel({ noteContent, language, onApply }: AiNotesPanelProps) {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorText, setErrorText] = useState<string | null>(null);

    const handleSend = async (customPrompt?: string) => {
        const promptToSend = customPrompt || prompt;
        if (!promptToSend.trim()) return;

        setIsLoading(true);
        setErrorText(null);
        try {
            const csrf = await ensureCsrfToken();
            const res = await fetch('/api/ai/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [CSRF_HEADER_NAME]: csrf,
                },
                body: JSON.stringify({ prompt: promptToSend, content: noteContent, language }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                const msg = typeof data.error === 'string' ? data.error : 'AI request failed';
                const detail = typeof data.details === 'string' ? data.details : null;
                const full = detail ? `${msg}: ${detail}` : msg;
                setErrorText(full);
                toast.error(full);
                return;
            }

            if (typeof data.content !== 'string') throw new Error('Invalid AI response');
            onApply(data.content);
            toast.success('AI changes applied');
            if (!customPrompt) setPrompt('');
        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'AI request failed';
            setErrorText(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="border-t bg-muted/40 p-2 space-y-2">
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                    <GeminiSpark className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium text-foreground">AI Writer</span>
                </div>

                <div className="w-px h-4 bg-border mx-1" />

                <div className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar mask-grad-right">
                    {QUICK_ACTIONS.map((action) => (
                        <Tooltip key={action.id}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                                    onClick={() => handleSend(action.prompt)}
                                    disabled={isLoading}
                                >
                                    <action.icon className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                {action.label}
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>

                {isLoading && <span className="text-[10px] text-muted-foreground animate-pulse whitespace-nowrap">Thinking...</span>}
            </div>

            <div className="flex items-end gap-2">
                <Textarea
                    placeholder="Tell the expert writer what to do..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isLoading}
                    className="min-h-[40px] max-h-[120px] resize-y text-sm py-2 bg-background/50 focus:bg-background transition-colors disabled:opacity-50 flex-1"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                />
                <Button
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => handleSend()}
                    disabled={isLoading || !prompt.trim()}
                    variant="secondary"
                >
                    <SendHorizontal className="h-4 w-4" />
                </Button>
            </div>

            {errorText && (
                <p className="text-xs text-red-500 px-1" role="alert">
                    {errorText}
                </p>
            )}
        </div>
    );
}
