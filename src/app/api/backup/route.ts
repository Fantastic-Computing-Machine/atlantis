import { getDiagrams, saveDiagrams } from '@/lib/data';
import { NextResponse } from 'next/server';

export async function GET() {
  const diagrams = await getDiagrams();
  // Return as a downloadable file
  return new NextResponse(JSON.stringify(diagrams, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="atlantis-backup.json"',
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      throw new Error('Invalid backup format');
    }
    // Basic validation
    const isValid = body.every(d => d.id && d.title && d.content);
    if (!isValid) {
      throw new Error('Invalid diagram data in backup');
    }

    await saveDiagrams(body);
    return NextResponse.json({ success: true, count: body.length });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to restore backup' }, { status: 400 });
  }
}
