import { NextResponse } from 'next/server';
import mermaid from 'mermaid';

import { csrfFailureResponse, ensureCsrfCookie, validateCsrfToken } from '@/lib/csrf';
import { createDiagram, getDiagramPage } from '@/lib/data';
import { logApiError } from '@/lib/logger';
import { publishSyncEvent } from '@/lib/pubsub';

try {
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
} catch {
  // Mermaid parsing is still available in the route runtime.
}

const apiAccessEnabled = process.env.ENABLE_API_ACCESS?.trim().toLowerCase() === 'true';

export async function GET(request: Request) {
  if (!apiAccessEnabled) return new NextResponse('API Access Disabled', { status: 403 });

  try {
    await ensureCsrfCookie();
    const { searchParams } = new URL(request.url);
    const page = Math.max(Number.parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.max(Number.parseInt(searchParams.get('limit') || '10', 10), 1);
    const diagramsPage = await getDiagramPage({ limit, offset: (page - 1) * limit });

    return NextResponse.json({
      data: diagramsPage.items.map(({ id, title }) => ({ id, title })),
      pagination: { page, limit, total: diagramsPage.total, totalPages: Math.ceil(diagramsPage.total / limit) },
    });
  } catch (error) {
    logApiError('GET /api/access/diagrams', error);
    return NextResponse.json({ error: 'Failed to fetch diagrams' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!apiAccessEnabled) return new NextResponse('API Access Disabled', { status: 403 });
  if (!(await validateCsrfToken(request))) return csrfFailureResponse();

  try {
    const { title, content } = await request.json();
    if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

    try {
      await mermaid.parse(content);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid Mermaid syntax', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 400 }
      );
    }

    const newDiagram = await createDiagram({ title, content });
    await publishSyncEvent({ topic: 'list:diagrams', payload: { id: newDiagram.id, created: true } });
    return NextResponse.json(newDiagram, { status: 201 });
  } catch (error) {
    logApiError('POST /api/access/diagrams', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}