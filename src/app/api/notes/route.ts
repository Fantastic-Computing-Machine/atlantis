import { NextResponse } from 'next/server';

import { ensureCsrfCookie, csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { logApiError } from '@/lib/logger';
import { createNote, getNotePage } from '@/lib/notes-data';
import { publishSyncEvent } from '@/lib/pubsub';
import { noteCreateSchema } from '@/lib/schemas';
import type { NoteSortOption } from '@/lib/types';

const DEFAULT_LIMIT = 24;
const METADATA_SELECT = 'id,updatedAt';

function parseSort(rawSort: string | null): NoteSortOption {
  if (rawSort === 'old' || rawSort === 'alphabetical' || rawSort === 'recent') {
    return rawSort;
  }
  return 'recent';
}

export async function GET(request: Request) {
  try {
    await ensureCsrfCookie();
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');
    const query = url.searchParams.get('query') || undefined;
    const sort = parseSort(url.searchParams.get('sort'));
    const starredOnly = url.searchParams.get('starred') === 'true';
    const limitNumber = limit ? Number.parseInt(limit, 10) : DEFAULT_LIMIT;
    const offsetNumber = offset ? Number.parseInt(offset, 10) : 0;
    const metadataOnly = url.searchParams.get('select') === METADATA_SELECT;
    const page = await getNotePage({
      limit: limitNumber,
      offset: offsetNumber,
      query,
      sort,
      starredOnly,
      metadataOnly,
    });

    return NextResponse.json(page);
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
    const result = noteCreateSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const newNote = await createNote(result.data);
    await publishSyncEvent({
      topic: 'list:notes',
      payload: { id: newNote.id, created: true },
      source: request.headers.get('x-client-id') ?? undefined,
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