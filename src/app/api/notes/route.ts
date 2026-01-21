import { ensureCsrfCookie, csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { createNote, getNotePage } from '@/lib/notes-data';
import { logApiError } from '@/lib/logger';
import { noteCreateSchema } from '@/lib/schemas';
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

        const limitNumber = limit ? Number.parseInt(limit, 10) : DEFAULT_LIMIT;
        const offsetNumber = offset ? Number.parseInt(offset, 10) : 0;

        const page = await getNotePage({ limit: limitNumber, offset: offsetNumber, query, sort, starredOnly });
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
        });

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
