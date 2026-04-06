import { ensureCsrfCookie } from '@/lib/csrf';
import { getNoteById } from '@/lib/notes-data';
import { logApiError } from '@/lib/logger';
import { NextResponse } from 'next/server';

const apiAccessEnabled = process.env.ENABLE_API_ACCESS?.trim().toLowerCase() === 'true';
const PRIVATE_CONTENT_MESSAGE = 'Content policy in effect.';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!apiAccessEnabled) {
    return new NextResponse('API Access Disabled', { status: 403 });
  }

  try {
    await ensureCsrfCookie();
    const { id } = await params;
    const note = await getNoteById(id);

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (note.private) {
      return NextResponse.json({
        ...note,
        content: PRIVATE_CONTENT_MESSAGE,
      });
    }

    return NextResponse.json(note);
  } catch (error) {
    logApiError('GET /api/access/notes/[id]', error);
    return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 });
  }
}
