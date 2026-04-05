import { NextResponse } from 'next/server';
import type { Note } from '@/lib/types';

import {
  CacheKeys,
  CachePrefixes,
  DEFAULT_TTL_MS,
  deleteDocSnapshot,
  getCache,
  getDocSnapshot,
  setDocSnapshot,
  withCacheHeader,
  withNoCacheHeaders,
} from '@/lib/cache';
import { csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { logApiError } from '@/lib/logger';
import { deleteNoteById, getNoteById, updateNoteById } from '@/lib/notes-data';
import { publishSyncEvent } from '@/lib/pubsub';
import { noteUpdateSchema } from '@/lib/schemas';

const PRIVATE_CONTENT_MESSAGE = 'Content policy in effect.';
type NoteRouteParams = {
  params: Promise<{ id: string }>;
};

const maskPrivateNote = (note: Note): Note => ({
  ...note,
  content: PRIVATE_CONTENT_MESSAGE,
});

const toEtag = (id: string, updatedAt: string) => `W/"note-${id}-${updatedAt}"`;

export async function GET(request: Request, { params }: NoteRouteParams) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const fresh = url.searchParams.get('fresh') === 'true';
    const ifNoneMatch = request.headers.get('if-none-match');

    const snapshot = await getDocSnapshot<Note>('note', id);
    if (snapshot) {
      const etag = toEtag(id, snapshot.updatedAt);
      if (ifNoneMatch && ifNoneMatch === etag) {
        return new NextResponse(null, { status: 304, headers: { ETag: etag } });
      }
      const payload = snapshot.private ? maskPrivateNote(snapshot) : snapshot;
      const response = NextResponse.json(payload);
      response.headers.set('ETag', etag);
      response.headers.set('Cache-Control', 'no-cache');
      const withCache = withCacheHeader(response, fresh ? 'BYPASS' : 'HIT');
      return fresh ? withNoCacheHeaders(withCache) : withCache;
    }

    if (fresh) {
      const note = await getNoteById(id);
      if (!note) {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }
      const finalNote = note.private ? maskPrivateNote(note) : note;
      await setDocSnapshot('note', id, finalNote as Note);
      const etag = toEtag(id, finalNote.updatedAt);
      const response = withCacheHeader(NextResponse.json(finalNote), 'BYPASS');
      response.headers.set('ETag', etag);
      response.headers.set('Cache-Control', 'no-cache');
      return withNoCacheHeaders(response);
    }

    const cache = getCache();
    const cacheKey = CacheKeys.note(id);

    const cached = await cache.get<{ private?: boolean; updatedAt?: string; createdAt?: string }>(
      cacheKey
    );
    if (cached) {
      const etag = toEtag(id, cached.updatedAt ?? cached.createdAt ?? '');
      if (ifNoneMatch && ifNoneMatch === etag) {
        return new NextResponse(null, { status: 304, headers: { ETag: etag } });
      }
      const response = NextResponse.json(cached);
      response.headers.set('ETag', etag);
      response.headers.set('Cache-Control', 'no-cache');
      return withCacheHeader(response, 'HIT');
    }

    const note = await getNoteById(id);

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const finalNote = note.private ? maskPrivateNote(note) : note;
    await cache.set(cacheKey, finalNote, DEFAULT_TTL_MS);
    await setDocSnapshot('note', id, finalNote as Note);
    const etag = toEtag(id, finalNote.updatedAt);
    const response = NextResponse.json(finalNote);
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', 'no-cache');
    return withCacheHeader(response, 'MISS');
  } catch (error) {
    logApiError('GET /api/notes/[id]', error);
    return NextResponse.json({ error: 'Failed to load note' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: NoteRouteParams) {
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

    const cache = getCache();
    await cache.delete(CacheKeys.note(id));
    await cache.deletePrefix(CachePrefixes.notesList);
    await deleteDocSnapshot('note', id);

    await setDocSnapshot('note', id, updatedNote);

    const source = request.headers.get('x-client-id') ?? undefined;
    await publishSyncEvent({
      topic: `doc:note:${id}`,
      payload: { id, updatedAt: updatedNote.updatedAt },
      source,
    });
    await publishSyncEvent({
      topic: 'list:notes',
      payload: { id, updatedAt: updatedNote.updatedAt },
      source,
    });

    const etag = toEtag(id, updatedNote.updatedAt);
    const response = NextResponse.json(updatedNote);
    response.headers.set('ETag', etag);
    return response;
  } catch (error) {
    logApiError('PATCH /api/notes/[id]', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: NoteRouteParams) {
  if (!(await validateCsrfToken(request))) {
    return csrfFailureResponse();
  }

  try {
    const { id } = await params;
    const deleted = await deleteNoteById(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const cache = getCache();
    await cache.delete(CacheKeys.note(id));
    await cache.deletePrefix(CachePrefixes.notesList);

    await publishSyncEvent({
      topic: `doc:note:${id}`,
      payload: { id, deleted: true },
      source: request.headers.get('x-client-id') ?? undefined,
    });
    await publishSyncEvent({
      topic: 'list:notes',
      payload: { id, deleted: true },
      source: request.headers.get('x-client-id') ?? undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('DELETE /api/notes/[id]', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
