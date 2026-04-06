import { NextResponse } from 'next/server';

import {
  CacheKeys,
  CachePrefixes,
  DEFAULT_TTL_MS,
  getCache,
  type CacheStatus,
  withCacheHeader,
  withNoCacheHeaders,
} from '@/lib/cache';
import { ensureCsrfCookie, csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { logApiError } from '@/lib/logger';
import { createNote, getNotePage } from '@/lib/notes-data';
import { publishSyncEvent } from '@/lib/pubsub';
import { noteCreateSchema } from '@/lib/schemas';

const DEFAULT_LIMIT = 24;

export async function GET(request: Request) {
  try {
    await ensureCsrfCookie();
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');
    const query = url.searchParams.get('query') || undefined;
    const sort = (url.searchParams.get('sort') as import('@/lib/types').NoteSortOption) || 'recent';
    const starredOnly = url.searchParams.get('starred') === 'true';
    const fresh = url.searchParams.get('fresh') === 'true';

    const limitNumber = limit ? Number.parseInt(limit, 10) : DEFAULT_LIMIT;
    const offsetNumber = offset ? Number.parseInt(offset, 10) : 0;

    if (fresh || query || starredOnly) {
      const page = await getNotePage({
        limit: limitNumber,
        offset: offsetNumber,
        query,
        sort,
        starredOnly,
      });
      const status: CacheStatus = fresh ? 'BYPASS' : 'MISS';
      const response = withCacheHeader(NextResponse.json(page), status);
      return fresh ? withNoCacheHeaders(response) : response;
    }

    const cache = getCache();
    const cacheKey = CacheKeys.noteList(sort, offsetNumber, limitNumber);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return withCacheHeader(NextResponse.json(cached), 'HIT');
    }

    const page = await getNotePage({
      limit: limitNumber,
      offset: offsetNumber,
      query,
      sort,
      starredOnly,
    });
    await cache.set(cacheKey, page, DEFAULT_TTL_MS);
    return withCacheHeader(NextResponse.json(page), 'MISS');
  } catch (error) {
    logApiError('GET /api/notes', error);
    return NextResponse.json({ error: 'Failed to load notes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await validateCsrfToken(request))) {
    return csrfFailureResponse();
  }

  try {
    const body = await request.json();
    const result = noteCreateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const newNote = await createNote(result.data);

    const cache = getCache();
    await cache.deletePrefix(CachePrefixes.notesList);

    const source = request.headers.get('x-client-id') ?? undefined;
    await publishSyncEvent({
      topic: 'list:notes',
      payload: { id: newNote.id, created: true },
      source,
    });

    return NextResponse.json({
      id: newNote.id,
      title: newNote.title,
      language: newNote.language,
      emoji: newNote.emoji,
      starred: newNote.starred,
      private: newNote.private,
      tags: newNote.tags,
      createdAt: newNote.createdAt,
      updatedAt: newNote.updatedAt,
    });
  } catch (error) {
    logApiError('POST /api/notes', error);
    return NextResponse.json({ error: 'Unable to create note' }, { status: 500 });
  }
}
