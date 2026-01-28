import { ensureCsrfCookie, csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { createDiagram, getDiagramPage } from '@/lib/data';
import { logApiError } from '@/lib/logger';
import { diagramSchema } from '@/lib/schemas';
import { getCache, CacheKeys, CachePrefixes, DEFAULT_TTL_MS, withCacheHeader, withNoCacheHeaders, type CacheStatus } from '@/lib/cache';
import { NextResponse } from 'next/server';

const DEFAULT_LIMIT = 24;

export async function GET(request: Request) {
  try {
    await ensureCsrfCookie();
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');
    const query = url.searchParams.get('query') || undefined;
    const sort = (url.searchParams.get('sort') as import('@/lib/types').SortOption) || 'recent';
    const fresh = url.searchParams.get('fresh') === 'true';

    const limitNumber = limit ? Number.parseInt(limit, 10) : DEFAULT_LIMIT;
    const offsetNumber = offset ? Number.parseInt(offset, 10) : 0;

    // Bypass cache if fresh=true or if searching
    if (fresh || query) {
      const page = await getDiagramPage({ limit: limitNumber, offset: offsetNumber, query, sort });
      const status: CacheStatus = fresh ? 'BYPASS' : 'MISS';
      const response = withCacheHeader(NextResponse.json(page), status);
      // Add no-cache headers for fresh requests to prevent browser/proxy caching
      return fresh ? withNoCacheHeaders(response) : response;
    }

    // Try cache first (only for non-search requests)
    const cache = getCache();
    const cacheKey = CacheKeys.diagramList(sort, offsetNumber, limitNumber);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return withCacheHeader(NextResponse.json(cached), 'HIT');
    }

    const page = await getDiagramPage({ limit: limitNumber, offset: offsetNumber, query, sort });
    await cache.set(cacheKey, page, DEFAULT_TTL_MS);
    return withCacheHeader(NextResponse.json(page), 'MISS');
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
    const json = await request.json();
    const result = diagramSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { title, content, emoji, description } = result.data;

    const newDiagram = await createDiagram({
      title,
      content,
      emoji,
      description,
      tags: result.data.tags,
    });

    // Invalidate list cache on create
    const cache = getCache();
    await cache.deletePrefix(CachePrefixes.diagramsList);

    return NextResponse.json(newDiagram);
  } catch (error) {
    logApiError('POST /api/diagrams', error);
    return NextResponse.json({ error: 'Unable to create diagram' }, { status: 500 });
  }
}
