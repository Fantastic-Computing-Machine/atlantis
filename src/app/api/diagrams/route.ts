import { ensureCsrfCookie, csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { createDiagram, getDiagramPage } from '@/lib/data';
import { logApiError } from '@/lib/logger';
import { NextResponse } from 'next/server';

const DEFAULT_LIMIT = 24;

export async function GET(request: Request) {
  try {
    await ensureCsrfCookie();
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');
    const query = url.searchParams.get('query') || undefined;

    const limitNumber = limit ? Number.parseInt(limit, 10) : DEFAULT_LIMIT;
    const offsetNumber = offset ? Number.parseInt(offset, 10) : 0;

    const page = await getDiagramPage({ limit: limitNumber, offset: offsetNumber, query });
    return NextResponse.json(page);
  } catch (error) {
    logApiError('GET /api/diagrams', error);
    return NextResponse.json({ error: 'Failed to load diagrams' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await validateCsrfToken(request))) {
    return csrfFailureResponse();
  }

  try {
    const body = await request.json();
    const newDiagram = await createDiagram({
      title: body.title,
      content: body.content,
      emoji: body.emoji,
    });

    return NextResponse.json(newDiagram);
  } catch (error) {
    logApiError('POST /api/diagrams', error);
    return NextResponse.json({ error: 'Unable to create diagram' }, { status: 500 });
  }
}
