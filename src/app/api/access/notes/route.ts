import { NextResponse } from 'next/server';

import { ensureCsrfCookie, csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { logApiError } from '@/lib/logger';
import { createNote, getNotePage } from '@/lib/notes-data';
import { publishSyncEvent } from '@/lib/pubsub';
import { noteCreateSchema } from '@/lib/schemas';

const apiAccessEnabled = process.env.ENABLE_API_ACCESS?.trim().toLowerCase() === 'true';

export async function GET(request: Request) {
  if (!apiAccessEnabled) return new NextResponse('API Access Disabled', { status: 403 });

  try {
    await ensureCsrfCookie();
    const { searchParams } = new URL(request.url);
    const page = Math.max(Number.parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.max(Number.parseInt(searchParams.get('limit') || '10', 10), 1);
    const notesPage = await getNotePage({ limit, offset: (page - 1) * limit });

    return NextResponse.json({
      data: notesPage.items.map(({ id, title, language, createdAt, updatedAt }) => ({ id, title, language, createdAt, updatedAt })),
      pagination: { page, limit, total: notesPage.total, totalPages: Math.ceil(notesPage.total / limit) },
    });
  } catch (error) {
    logApiError('GET /api/access/notes', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!apiAccessEnabled) return new NextResponse('API Access Disabled', { status: 403 });
  if (!(await validateCsrfToken(request))) return csrfFailureResponse();

  try {
    const result = noteCreateSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 });
    }

    const newNote = await createNote(result.data);
    await publishSyncEvent({ topic: 'list:notes', payload: { id: newNote.id, created: true } });
    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    logApiError('POST /api/access/notes', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}