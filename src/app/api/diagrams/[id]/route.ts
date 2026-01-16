import { csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { getDiagrams, saveDiagrams } from '@/lib/data';
import { logApiError } from '@/lib/logger';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateCsrfToken(request))) {
    return csrfFailureResponse();
  }

  try {
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
  } catch (error) {
    logApiError('PUT /api/diagrams/[id]', error);
    return NextResponse.json({ error: 'Failed to update diagram' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateCsrfToken(request))) {
    return csrfFailureResponse();
  }

  try {
    const { id } = await params;
    const diagrams = await getDiagrams();

    const newDiagrams = diagrams.filter((d) => d.id !== id);
    await saveDiagrams(newDiagrams);

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('DELETE /api/diagrams/[id]', error);
    return NextResponse.json({ error: 'Failed to delete diagram' }, { status: 500 });
  }
}
