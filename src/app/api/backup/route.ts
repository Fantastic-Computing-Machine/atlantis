import { csrfFailureResponse, ensureCsrfCookie, validateCsrfToken } from '@/lib/csrf';
import { getDiagrams, saveDiagrams } from '@/lib/data';
import { logApiError } from '@/lib/logger';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await ensureCsrfCookie();
    const diagrams = await getDiagrams();
    return new NextResponse(JSON.stringify(diagrams, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="atlantis-backup.json"',
      },
    });
  } catch (error) {
    logApiError('GET /api/backup', error);
    return NextResponse.json({ error: 'Failed to generate backup' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await validateCsrfToken(request))) {
    return csrfFailureResponse();
  }

  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      throw new Error('Invalid backup format');
    }
    const isValid = body.every((d) => d.id && d.title && d.content);
    if (!isValid) {
      throw new Error('Invalid diagram data in backup');
    }

    await saveDiagrams(body);
    return NextResponse.json({ success: true, count: body.length });
  } catch (error) {
    logApiError('POST /api/backup', error);
    return NextResponse.json({ error: 'Failed to restore backup' }, { status: 400 });
  }
}
