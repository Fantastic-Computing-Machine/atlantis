import { NextResponse } from 'next/server';

import {
  CacheKeys,
  CachePrefixes,
  DEFAULT_TTL_MS,
  getCache,
  deleteDocSnapshot,
  getDocSnapshot,
  setDocSnapshot,
  withCacheHeader,
  withNoCacheHeaders,
  type CacheStatus,
} from '@/lib/cache';
import { csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { deleteDiagramById, getDiagramById, updateDiagramById } from '@/lib/data';
import { logApiError } from '@/lib/logger';
import { publishSyncEvent } from '@/lib/pubsub';
import { diagramSchema } from '@/lib/schemas';

type DiagramRouteParams = {
  params: Promise<{ id: string }>;
};

const toEtag = (id: string, updatedAt: string) => `W/"diagram-${id}-${updatedAt}"`;

const diagramsCacheStatus = (fromSnapshot: boolean, fresh: boolean): CacheStatus => {
  if (fresh) return 'BYPASS';
  return fromSnapshot ? 'HIT' : 'MISS';
};

export async function GET(request: Request, { params }: DiagramRouteParams) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const fresh = url.searchParams.get('fresh') === 'true';
    const ifNoneMatch = request.headers.get('if-none-match');

    // Prefer snapshot (Redis/memory)
    const snapshot = await getDocSnapshot<import('@/lib/types').Diagram>('diagram', id);
    if (snapshot) {
      const etag = toEtag(id, snapshot.updatedAt);
      if (ifNoneMatch && ifNoneMatch === etag) {
        return new NextResponse(null, {
          status: 304,
          headers: { ETag: etag },
        });
      }
      const response = NextResponse.json(snapshot);
      response.headers.set('ETag', etag);
      response.headers.set('Cache-Control', 'no-cache');
      const withCache = withCacheHeader(response, diagramsCacheStatus(true, fresh));
      return fresh ? withNoCacheHeaders(withCache) : withCache;
    }

    const cache = getCache();
    const cacheKey = CacheKeys.diagram(id);

    const cached = await cache.get<import('@/lib/types').Diagram>(cacheKey);
    if (cached) {
      const etag = toEtag(id, cached.updatedAt);
      if (ifNoneMatch && ifNoneMatch === etag) {
        return new NextResponse(null, {
          status: 304,
          headers: { ETag: etag },
        });
      }
      const response = NextResponse.json(cached);
      response.headers.set('ETag', etag);
      response.headers.set('Cache-Control', 'no-cache');
      return withCacheHeader(response, 'HIT');
    }

    const diagram = await getDiagramById(id);

    if (!diagram) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
    }

    await cache.set(cacheKey, diagram, DEFAULT_TTL_MS);
    await setDocSnapshot('diagram', id, diagram);
    const etag = toEtag(id, diagram.updatedAt);

    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: etag },
      });
    }

    const response = NextResponse.json(diagram);
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', 'no-cache');
    return withCacheHeader(response, 'MISS');
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

    const updatedDiagram = await updateDiagramById(id, result.data);

    if (!updatedDiagram) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
    }

    const cache = getCache();
    await cache.delete(CacheKeys.diagram(id));
    await cache.deletePrefix(CachePrefixes.diagramsList);
    await deleteDocSnapshot('diagram', id);
    const etag = toEtag(id, updatedDiagram.updatedAt);

    await setDocSnapshot('diagram', id, updatedDiagram);

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
    response.headers.set('ETag', etag);
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
    const deleted = await deleteDiagramById(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
    }

    const cache = getCache();
    await cache.delete(CacheKeys.diagram(id));
    await cache.deletePrefix(CachePrefixes.diagramsList);

    await deleteDocSnapshot('diagram', id);

    const source = request.headers.get('x-client-id') ?? undefined;
    await publishSyncEvent({ topic: `doc:diagram:${id}`, payload: { id, deleted: true }, source });
    await publishSyncEvent({ topic: 'list:diagrams', payload: { id, deleted: true }, source });

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('DELETE /api/diagrams/[id]', error);
    return NextResponse.json({ error: 'Failed to delete diagram' }, { status: 500 });
  }
}
