import { NextResponse } from 'next/server';
import { getDiagrams } from '@/lib/data';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.ENABLE_API_ACCESS !== 'true') {
    return new NextResponse('API Access Disabled', { status: 403 });
  }

  const { id } = await params;
  const diagrams = await getDiagrams();
  
  const diagram = diagrams.find(d => d.id === id);
  
  if (!diagram) {
    return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
  }

  return NextResponse.json(diagram);
}
