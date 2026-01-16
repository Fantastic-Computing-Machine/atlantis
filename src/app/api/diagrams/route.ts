import { ensureCsrfCookie, csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { getDiagramPage, getDiagrams, saveDiagrams } from '@/lib/data';
import { logApiError } from '@/lib/logger';
import { Diagram } from '@/lib/types';
import { generateShortId, getRandomEmoji } from '@/lib/utils';
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
    const diagrams = await getDiagrams();

    let id = generateShortId();
    while (diagrams.some((d) => d.id === id)) {
      id = generateShortId();
    }

    const newDiagram: Diagram = {
      id,
      title: body.title || 'Untitled Diagram',
      content: body.content || 'graph TD\n    A[Start] --> B[End]',
      emoji: getRandomEmoji(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: false,
    };

    await saveDiagrams([newDiagram, ...diagrams]);
    return NextResponse.json(newDiagram);
  } catch (error) {
    logApiError('POST /api/diagrams', error);
    return NextResponse.json({ error: 'Unable to create diagram' }, { status: 500 });
  }
}
