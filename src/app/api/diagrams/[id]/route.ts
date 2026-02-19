import { NextResponse } from 'next/server';

import {
  CacheKeys,
  CachePrefixes,
  DEFAULT_TTL_MS,
  getCache,
  withCacheHeader,
  withNoCacheHeaders,
} from '@/lib/cache';
import { csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { deleteDiagramById, getDiagramById, getDiagramUpdatedAt, updateDiagramById } from '@/lib/data';
import { logApiError } from '@/lib/logger';
import { diagramSchema } from '@/lib/schemas';

type DiagramRouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: DiagramRouteParams) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const fresh = url.searchParams.get('fresh') === 'true';
    const select = url.searchParams.get('select');

    if (fresh) {
      if (select === 'updatedAt') {
        const meta = await getDiagramUpdatedAt(id);
        if (!meta) {
          return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
        }
        return withNoCacheHeaders(withCacheHeader(NextResponse.json(meta), 'BYPASS'));
      }

      const diagram = await getDiagramById(id);
      if (!diagram) {
        return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
      }
      return withNoCacheHeaders(withCacheHeader(NextResponse.json(diagram), 'BYPASS'));
    }

    const cache = getCache();
    const cacheKey = CacheKeys.diagram(id);

    const cached = await cache.get(cacheKey);
    if (cached) {
      return withCacheHeader(NextResponse.json(cached), 'HIT');
    }

    const diagram = await getDiagramById(id);

    if (!diagram) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
    }

    await cache.set(cacheKey, diagram, DEFAULT_TTL_MS);

    return withCacheHeader(NextResponse.json(diagram), 'MISS');
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
    const json = await request.json();
    const result = diagramSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const updatedDiagram = await updateDiagramById(id, {
      ...result.data,
      tags: result.data.tags,
    });

    if (!updatedDiagram) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
    }

    const cache = getCache();
    await cache.delete(CacheKeys.diagram(id));
    await cache.deletePrefix(CachePrefixes.diagramsList);

    return NextResponse.json(updatedDiagram);
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
    const deleted = await deleteDiagramById(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
    }

    const cache = getCache();
    await cache.delete(CacheKeys.diagram(id));
    await cache.deletePrefix(CachePrefixes.diagramsList);

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('DELETE /api/diagrams/[id]', error);
    return NextResponse.json({ error: 'Failed to delete diagram' }, { status: 500 });
  }
}
