import { csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { getAiApiKey, getAiProvider, setAiApiKey, setAiProvider, isAiApiKeyFromEnv } from '@/lib/settings';
import { logApiError } from '@/lib/logger';
import { NextResponse } from 'next/server';

const OPENAI_MODEL = 'gpt-4o-mini';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function resolveModel(apiKey: string | null, provider: 'openai' | 'gemini' | 'auto'): string | null {
  if (!apiKey) return null;
  if (provider === 'gemini') return GEMINI_MODEL;
  if (provider === 'openai') return OPENAI_MODEL;
  // Auto-detect based on key prefix
  if (apiKey.startsWith('AIza') || apiKey.startsWith('AI') || apiKey.startsWith('gsk_')) {
    return GEMINI_MODEL;
  }
  return OPENAI_MODEL;
}

export async function GET() {
  try {
    const value = await getAiApiKey();
    const provider = await getAiProvider();
    const aiModel = resolveModel(value, provider);
    const fromEnv = isAiApiKeyFromEnv();
    return NextResponse.json({
      hasKey: Boolean(value),
      provider,
      aiModel,
      fromEnv,  // Indicates key is from environment variable (read-only)
    });
  } catch (error) {
    logApiError('GET /api/settings/ai-key', error);
    return NextResponse.json({ error: 'Failed to load AI key' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await validateCsrfToken(request))) {
    return csrfFailureResponse();
  }

  try {
    // Check if key is from environment variable (read-only)
    if (isAiApiKeyFromEnv()) {
      return NextResponse.json(
        { error: 'AI key is configured via environment variable and cannot be modified' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { apiKey, provider } = body ?? {};

    if (apiKey !== null && typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'Invalid apiKey' }, { status: 400 });
    }

    if (provider && provider !== 'openai' && provider !== 'gemini' && provider !== 'auto') {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    await setAiApiKey(apiKey ?? null);
    if (provider) {
      await setAiProvider(provider);
    }
    const resolvedProvider = provider ?? (await getAiProvider());
    return NextResponse.json({ success: true, hasKey: Boolean(apiKey), provider: resolvedProvider, fromEnv: false });
  } catch (error) {
    logApiError('PUT /api/settings/ai-key', error);
    return NextResponse.json({ error: 'Failed to save AI key' }, { status: 500 });
  }
}
