import { csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { deleteDiagramById, getDiagramById, updateDiagramById } from '@/lib/data';
import { logApiError } from '@/lib/logger';
import { diagramSchema } from '@/lib/schemas';
import { getCache, CacheKeys, CachePrefixes, DEFAULT_TTL_MS } from '@/lib/cache';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cache = getCache();
    const cacheKey = CacheKeys.diagram(id);

    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const diagram = await getDiagramById(id);

    if (!diagram) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
    }

    // Cache the result
    await cache.set(cacheKey, diagram, DEFAULT_TTL_MS);

    return NextResponse.json(diagram);
  } catch (error) {
    logApiError('GET /api/diagrams/[id]', error);
    return NextResponse.json({ error: 'Failed to load diagram' }, { status: 500 });
  }
}
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateCsrfToken(request))) {
    return csrfFailureResponse();
  }

  try {
    const { id } = await params;
    const json = await request.json();
    const result = diagramSchema.safeParse(json);

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

    // Invalidate cache
    const cache = getCache();
    await cache.delete(CacheKeys.diagram(id));
    await cache.deletePrefix(CachePrefixes.diagramsList);

    return NextResponse.json(updatedDiagram);
  } catch (error) {
    logApiError('PUT /api/diagrams/[id]', error);
    return NextResponse.json({ error: 'Failed to update diagram' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateCsrfToken(request))) {
    return csrfFailureResponse();
  }

  try {
    const { id } = await params;
    const deleted = await deleteDiagramById(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
    }

    // Invalidate cache
    const cache = getCache();
    await cache.delete(CacheKeys.diagram(id));
    await cache.deletePrefix(CachePrefixes.diagramsList);

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('DELETE /api/diagrams/[id]', error);
    return NextResponse.json({ error: 'Failed to delete diagram' }, { status: 500 });
  }
}
