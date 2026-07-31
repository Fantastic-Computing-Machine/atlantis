import { NextResponse } from 'next/server';

import { csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { logApiError } from '@/lib/logger';
import { deleteNoteById, getNoteById, updateNoteById } from '@/lib/notes-data';
import { publishSyncEvent } from '@/lib/pubsub';
import { noteUpdateSchema } from '@/lib/schemas';
import type { Note } from '@/lib/types';

const PRIVATE_CONTENT_MESSAGE = 'Content policy in effect.';
type NoteRouteParams = {
  params: Promise<{ id: string }>;
};

const maskPrivateNote = (note: Note): Note => ({ ...note, content: PRIVATE_CONTENT_MESSAGE });
const toEtag = (id: string, updatedAt: string) => `W/"note-${id}-${updatedAt}"`;

export async function GET(request: Request, { params }: NoteRouteParams) {
  try {
    const { id } = await params;
    const note = await getNoteById(id);
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const payload = note.private ? maskPrivateNote(note) : note;
    const etag = toEtag(id, payload.updatedAt);
    if (request.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    const response = NextResponse.json(payload);
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', 'no-cache');
    return response;
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
    const result = noteUpdateSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const updatedNote = await updateNoteById(id, result.data);
    if (!updatedNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

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

    const response = NextResponse.json(updatedNote);
    response.headers.set('ETag', toEtag(id, updatedNote.updatedAt));
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
    if (!(await deleteNoteById(id))) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const source = request.headers.get('x-client-id') ?? undefined;
    await publishSyncEvent({ topic: `doc:note:${id}`, payload: { id, deleted: true }, source });
    await publishSyncEvent({ topic: 'list:notes', payload: { id, deleted: true }, source });

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('DELETE /api/notes/[id]', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}