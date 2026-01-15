import { getDiagrams, saveDiagrams } from '@/lib/data';
import { Diagram } from '@/lib/types';
import { generateShortId, getRandomEmoji } from '@/lib/utils';
import { NextResponse } from 'next/server';

export async function GET() {
  const diagrams = await getDiagrams();
  return NextResponse.json(diagrams);
}

export async function POST(request: Request) {
  const body = await request.json();
  const diagrams = await getDiagrams();

  // Generate a unique 6-character ID, ensuring no collisions
  let id = generateShortId();
  while (diagrams.some(d => d.id === id)) {
    id = generateShortId();
  }

  const newDiagram: Diagram = {
    id,
    title: body.title || 'Untitled Diagram',
    content: body.content || 'graph TD\n    A[Start] --> B[End]',
    emoji: getRandomEmoji(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFavorite: false,
  };

  await saveDiagrams([newDiagram, ...diagrams]);
  return NextResponse.json(newDiagram);
}
