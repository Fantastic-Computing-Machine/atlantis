import { csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { getAiApiKey, getAiProvider, setAiApiKey, setAiProvider } from '@/lib/settings';
import { logApiError } from '@/lib/logger';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const value = await getAiApiKey();
    const provider = await getAiProvider();
    return NextResponse.json({ hasKey: Boolean(value), provider });
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
    return NextResponse.json({ success: true, hasKey: Boolean(apiKey), provider: resolvedProvider });
  } catch (error) {
    logApiError('PUT /api/settings/ai-key', error);
    return NextResponse.json({ error: 'Failed to save AI key' }, { status: 500 });
  }
}
