import { getDiagrams, saveDiagrams } from '@/lib/data';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const diagrams = await getDiagrams();

  const index = diagrams.findIndex((d) => d.id === id);
  if (index === -1) {
    return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
  }

  const updatedDiagram = {
    ...diagrams[index],
    ...body,
    updatedAt: new Date().toISOString(),
  };

  diagrams[index] = updatedDiagram;
  await saveDiagrams(diagrams);

  return NextResponse.json(updatedDiagram);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const diagrams = await getDiagrams();

  const newDiagrams = diagrams.filter((d) => d.id !== id);
  await saveDiagrams(newDiagrams);

  return NextResponse.json({ success: true });
}
