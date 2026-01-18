import { csrfFailureResponse, ensureCsrfCookie, validateCsrfToken } from '@/lib/csrf';
import { createCheckpoint, getDiagramById, listCheckpoints } from '@/lib/data';
import { logApiError } from '@/lib/logger';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureCsrfCookie();
    const { id } = await params;
    const diagram = await getDiagramById(id);
    if (!diagram) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
    }

    const checkpoints = await listCheckpoints(id);
    return NextResponse.json({ checkpoints });
  } catch (error) {
    logApiError('GET /api/diagrams/[id]/checkpoint', error);
    return NextResponse.json({ error: 'Failed to load checkpoints' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateCsrfToken(request))) {
    return csrfFailureResponse();
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const content = body?.content;
    if (typeof content !== 'string' || !content.length) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    if (body?.title && body.title.length > 100) {
      return NextResponse.json({ error: 'Title too long (max 100 chars)' }, { status: 400 });
    }

    const result = await createCheckpoint(id, {
      content,
      title: body?.title,
      emoji: body?.emoji,
      isFavorite: body?.isFavorite,
    });

    if (!result) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    logApiError('POST /api/diagrams/[id]/checkpoint', error);
    return NextResponse.json({ error: 'Failed to create checkpoint' }, { status: 500 });
  }
}
