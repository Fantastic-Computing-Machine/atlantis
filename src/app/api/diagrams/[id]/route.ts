import { NextResponse } from 'next/server';

import { csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { deleteDiagramById, getDiagramById, updateDiagramById } from '@/lib/data';
import { logApiError } from '@/lib/logger';
import { publishSyncEvent } from '@/lib/pubsub';
import { diagramSchema } from '@/lib/schemas';

type DiagramRouteParams = {
  params: Promise<{ id: string }>;
};

const toEtag = (id: string, updatedAt: string) => `W/"diagram-${id}-${updatedAt}"`;

export async function GET(request: Request, { params }: DiagramRouteParams) {
  try {
    const { id } = await params;
    const diagram = await getDiagramById(id);
    if (!diagram) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
    }

    const etag = toEtag(id, diagram.updatedAt);
    if (request.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    const response = NextResponse.json(diagram);
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', 'no-cache');
    return response;
  } catch (error) {
    logApiError('GET /api/diagrams/[id]', error);
    return NextResponse.json({ error: 'Failed to load diagram' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: DiagramRouteParams) {
  if (!(await validateCsrfToken(request))) {
    return csrfFailureResponse();
  }

  try {
    const { id } = await params;
    const result = diagramSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const updatedDiagram = await updateDiagramById(id, result.data);
    if (!updatedDiagram) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
    }

    const source = request.headers.get('x-client-id') ?? undefined;
    await publishSyncEvent({
      topic: `doc:diagram:${id}`,
      payload: { id, updatedAt: updatedDiagram.updatedAt },
      source,
    });
    await publishSyncEvent({
      topic: 'list:diagrams',
      payload: { id, updatedAt: updatedDiagram.updatedAt },
      source,
    });

    const response = NextResponse.json(updatedDiagram);
    response.headers.set('ETag', toEtag(id, updatedDiagram.updatedAt));
    return response;
  } catch (error) {
    logApiError('PUT /api/diagrams/[id]', error);
    return NextResponse.json({ error: 'Failed to update diagram' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: DiagramRouteParams) {
  if (!(await validateCsrfToken(request))) {
    return csrfFailureResponse();
  }

  try {
    const { id } = await params;
    if (!(await deleteDiagramById(id))) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
    }

    const source = request.headers.get('x-client-id') ?? undefined;
    await publishSyncEvent({ topic: `doc:diagram:${id}`, payload: { id, deleted: true }, source });
    await publishSyncEvent({ topic: 'list:diagrams', payload: { id, deleted: true }, source });

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('DELETE /api/diagrams/[id]', error);
    return NextResponse.json({ error: 'Failed to delete diagram' }, { status: 500 });
  }
}