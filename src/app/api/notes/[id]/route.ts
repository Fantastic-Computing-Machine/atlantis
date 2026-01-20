import { csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { getNoteById, updateNoteById, deleteNoteById } from '@/lib/notes-data';
import { logApiError } from '@/lib/logger';
import { NextResponse } from 'next/server';

const PRIVATE_CONTENT_MESSAGE = 'Content policy in effect.';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const note = await getNoteById(id);

        if (!note) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        // If private, hide content
        if (note.private) {
            return NextResponse.json({
                id: note.id,
                title: note.title,
                content: PRIVATE_CONTENT_MESSAGE,
                language: note.language,
                starred: note.starred,
                private: note.private,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
            });
        }

        return NextResponse.json(note);
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

        const updatedNote = await updateNoteById(id, {
            title: body.title,
            content: body.content,
            language: body.language,
            starred: body.starred,
            private: body.private,
        });

        if (!updatedNote) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

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

        return NextResponse.json({ success: true });
    } catch (error) {
        logApiError('DELETE /api/notes/[id]', error);
        return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
    }
}
