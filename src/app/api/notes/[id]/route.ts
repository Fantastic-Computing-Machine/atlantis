import { csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { getNoteById, updateNoteById, deleteNoteById } from '@/lib/notes-data';
import { logApiError } from '@/lib/logger';
import { noteUpdateSchema } from '@/lib/schemas';
import { getCache, CacheKeys, CachePrefixes, DEFAULT_TTL_MS, withCacheHeader, withNoCacheHeaders, type CacheStatus } from '@/lib/cache';
import { NextResponse } from 'next/server';

const PRIVATE_CONTENT_MESSAGE = 'Content policy in effect.';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const url = new URL(request.url);
        const fresh = url.searchParams.get('fresh') === 'true';

        // Bypass cache if fresh=true (live sync polling)
        if (fresh) {
            const note = await getNoteById(id);
            if (!note) {
                return NextResponse.json({ error: 'Note not found' }, { status: 404 });
            }
            // If private, hide content
            if (note.private) {
                const privateNote = {
                    id: note.id,
                    title: note.title,
                    content: PRIVATE_CONTENT_MESSAGE,
                    language: note.language,
                    starred: note.starred,
                    private: note.private,
                    createdAt: note.createdAt,
                    updatedAt: note.updatedAt,
                };
                return withNoCacheHeaders(withCacheHeader(NextResponse.json(privateNote), 'BYPASS'));
            }
            return withNoCacheHeaders(withCacheHeader(NextResponse.json(note), 'BYPASS'));
        }

        const cache = getCache();
        const cacheKey = CacheKeys.note(id);

        // Try cache first
        const cached = await cache.get<{ private?: boolean }>(cacheKey);
        if (cached) {
            // Return cached (already handles private)
            return withCacheHeader(NextResponse.json(cached), 'HIT');
        }

        const note = await getNoteById(id);

        if (!note) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        // If private, hide content
        if (note.private) {
            const privateNote = {
                id: note.id,
                title: note.title,
                content: PRIVATE_CONTENT_MESSAGE,
                language: note.language,
                starred: note.starred,
                private: note.private,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
            };
            // Cache the private version
            await cache.set(cacheKey, privateNote, DEFAULT_TTL_MS);
            return withCacheHeader(NextResponse.json(privateNote), 'MISS');
        }

        // Cache the full note
        await cache.set(cacheKey, note, DEFAULT_TTL_MS);
        return withCacheHeader(NextResponse.json(note), 'MISS');
    } catch (error) {
        logApiError('GET /api/notes/[id]', error);
        return NextResponse.json({ error: 'Failed to load note' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await validateCsrfToken(request))) {
        return csrfFailureResponse();
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const result = noteUpdateSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: result.error.flatten() },
                { status: 400 }
            );
        }

        const updatedNote = await updateNoteById(id, {
            title: result.data.title,
            content: result.data.content,
            language: result.data.language,
            starred: result.data.starred,
            private: result.data.private,
            tags: result.data.tags,
        });

        if (!updatedNote) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        // Invalidate cache
        const cache = getCache();
        await cache.delete(CacheKeys.note(id));
        await cache.deletePrefix(CachePrefixes.notesList);

        return NextResponse.json(updatedNote);
    } catch (error) {
        logApiError('PATCH /api/notes/[id]', error);
        return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
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
        const deleted = await deleteNoteById(id);

        if (!deleted) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        // Invalidate cache
        const cache = getCache();
        await cache.delete(CacheKeys.note(id));
        await cache.deletePrefix(CachePrefixes.notesList);

        return NextResponse.json({ success: true });
    } catch (error) {
        logApiError('DELETE /api/notes/[id]', error);
        return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
    }
}
