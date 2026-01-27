import { ensureCsrfCookie, csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { createNote, getNotePage } from '@/lib/notes-data';
import { logApiError } from '@/lib/logger';
import { noteCreateSchema } from '@/lib/schemas';
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
        const sort = (url.searchParams.get('sort') as import('@/lib/types').NoteSortOption) || 'recent';
        const starredOnly = url.searchParams.get('starred') === 'true';
        const fresh = url.searchParams.get('fresh') === 'true';

        const limitNumber = limit ? Number.parseInt(limit, 10) : DEFAULT_LIMIT;
        const offsetNumber = offset ? Number.parseInt(offset, 10) : 0;

        // Bypass cache if fresh=true, searching, or starred filter
        if (fresh || query || starredOnly) {
            const page = await getNotePage({ limit: limitNumber, offset: offsetNumber, query, sort, starredOnly });
            const status: CacheStatus = fresh ? 'BYPASS' : 'MISS';
            const response = withCacheHeader(NextResponse.json(page), status);
            // Add no-cache headers for fresh requests to prevent browser/proxy caching
            return fresh ? withNoCacheHeaders(response) : response;
        }

        // Try cache first
        const cache = getCache();
        const cacheKey = CacheKeys.noteList(sort, offsetNumber, limitNumber);
        const cached = await cache.get(cacheKey);
        if (cached) {
            return withCacheHeader(NextResponse.json(cached), 'HIT');
        }

        const page = await getNotePage({ limit: limitNumber, offset: offsetNumber, query, sort, starredOnly });
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

        const newNote = await createNote({
            title: result.data.title,
            content: result.data.content,
            language: result.data.language,
            tags: result.data.tags,
        });

        // Invalidate list cache on create
        const cache = getCache();
        await cache.deletePrefix(CachePrefixes.notesList);

        // Return metadata only (without content for consistency)
        return NextResponse.json({
            id: newNote.id,
            title: newNote.title,
            language: newNote.language,
            starred: newNote.starred,
            private: newNote.private,
            createdAt: newNote.createdAt,
            updatedAt: newNote.updatedAt,
        });
    } catch (error) {
        logApiError('POST /api/notes', error);
        return NextResponse.json({ error: 'Unable to create note' }, { status: 500 });
    }
}
