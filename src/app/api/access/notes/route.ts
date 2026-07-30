import { ensureCsrfCookie, csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { createNote, getNotePage } from '@/lib/notes-data';
import { CachePrefixes, getCache } from '@/lib/cache';
import { logApiError } from '@/lib/logger';
import { publishSyncEvent } from '@/lib/pubsub';
import { NextResponse } from 'next/server';
import { noteCreateSchema } from '@/lib/schemas';

const apiAccessEnabled = process.env.ENABLE_API_ACCESS?.trim().toLowerCase() === 'true';

export async function GET(request: Request) {
  if (!apiAccessEnabled) {
    return new NextResponse('API Access Disabled', { status: 403 });
  }

  try {
    await ensureCsrfCookie();

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.max(parseInt(searchParams.get('limit') || '10', 10), 1);
    const offset = (page - 1) * limit;

    const notesPage = await getNotePage({ limit, offset });

    // Transform to consistent API response format
    const paginatedNotes = notesPage.items.map((n) => ({
      id: n.id,
      title: n.title,
      language: n.language,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }));

    return NextResponse.json({
      data: paginatedNotes,
      pagination: {
        page,
        limit,
        total: notesPage.total,
        totalPages: Math.ceil(notesPage.total / limit),
      },
    });
  } catch (error) {
    logApiError('GET /api/access/notes', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!apiAccessEnabled) {
    return new NextResponse('API Access Disabled', { status: 403 });
  }

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

    const { title, content, language } = result.data;

    const newNote = await createNote({ title, content, language });
    await getCache().deletePrefix(CachePrefixes.notesList);
    await publishSyncEvent({ topic: 'list:notes', payload: { id: newNote.id, created: true } });

    return NextResponse.json(
      {
        id: newNote.id,
        title: newNote.title,
        language: newNote.language,
        starred: newNote.starred,
        private: newNote.private,
        createdAt: newNote.createdAt,
        updatedAt: newNote.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    logApiError('POST /api/access/notes', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
