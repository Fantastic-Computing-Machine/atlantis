import { NextResponse } from 'next/server';
import type { Note } from '@/lib/types';

import {
  CacheKeys,
  CachePrefixes,
  DEFAULT_TTL_MS,
  getCache,
  withCacheHeader,
  withNoCacheHeaders,
} from '@/lib/cache';
import { csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { logApiError } from '@/lib/logger';
import { deleteNoteById, getNoteById, updateNoteById } from '@/lib/notes-data';
import { noteUpdateSchema } from '@/lib/schemas';

const PRIVATE_CONTENT_MESSAGE = 'Content policy in effect.';
type NoteRouteParams = {
  params: Promise<{ id: string }>;
};

const maskPrivateNote = (note: Note) => ({
  id: note.id,
  title: note.title,
  content: PRIVATE_CONTENT_MESSAGE,
  language: note.language,
  starred: note.starred,
  private: note.private,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
});

export async function GET(request: Request, { params }: NoteRouteParams) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const fresh = url.searchParams.get('fresh') === 'true';

    if (fresh) {
      const note = await getNoteById(id);
      if (!note) {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }
      if (note.private) {
        const privateNote = maskPrivateNote(note);
        return withNoCacheHeaders(withCacheHeader(NextResponse.json(privateNote), 'BYPASS'));
      }
      return withNoCacheHeaders(withCacheHeader(NextResponse.json(note), 'BYPASS'));
    }

    const cache = getCache();
    const cacheKey = CacheKeys.note(id);

    const cached = await cache.get<{ private?: boolean }>(cacheKey);
    if (cached) {
      return withCacheHeader(NextResponse.json(cached), 'HIT');
    }

    const note = await getNoteById(id);

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (note.private) {
      const privateNote = maskPrivateNote(note);
      await cache.set(cacheKey, privateNote, DEFAULT_TTL_MS);
      return withCacheHeader(NextResponse.json(privateNote), 'MISS');
    }

    await cache.set(cacheKey, note, DEFAULT_TTL_MS);
    return withCacheHeader(NextResponse.json(note), 'MISS');
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

    return NextResponse.json(updatedNote);
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

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('DELETE /api/notes/[id]', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
