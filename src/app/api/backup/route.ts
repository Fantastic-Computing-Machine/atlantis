import { csrfFailureResponse, ensureCsrfCookie, validateCsrfToken } from '@/lib/csrf';
import { getDiagrams, restoreDiagrams } from '@/lib/data';
import { logApiError } from '@/lib/logger';
import { backupSchema } from '@/lib/schemas';
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
    const result = backupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid backup format', details: result.error.flatten() },
        { status: 400 }
      );
    }

    await restoreDiagrams(result.data as import('@/lib/types').Diagram[]);
    return NextResponse.json({ success: true, count: result.data.length });
  } catch (error) {
    logApiError('POST /api/backup', error);
    return NextResponse.json({ error: 'Failed to restore backup' }, { status: 400 });
  }
}
