import { ensureCsrfCookie } from '@/lib/csrf';
import { getDiagramById } from '@/lib/data';
import { logApiError } from '@/lib/logger';
import { NextResponse } from 'next/server';

const apiAccessEnabled = process.env.ENABLE_API_ACCESS?.trim().toLowerCase() === 'true';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!apiAccessEnabled) {
    return new NextResponse('API Access Disabled', { status: 403 });
  }

  try {
    await ensureCsrfCookie();
    const { id } = await params;
    const diagram = await getDiagramById(id);

    if (!diagram) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
    }

    return NextResponse.json(diagram);
  } catch (error) {
    logApiError('GET /api/access/diagrams/[id]', error);
    return NextResponse.json({ error: 'Failed to fetch diagram' }, { status: 500 });
  }
}
