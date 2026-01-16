import { NextResponse } from 'next/server';
import { getDiagrams, saveDiagrams } from '@/lib/data';
import { generateShortId, getRandomEmoji } from '@/lib/utils';
import { Diagram } from '@/lib/types';
import mermaid from 'mermaid';

// Initialize mermaid for server-side parsing if needed, though strictly parse() might be fine.
// We set securityLevel to loose or strict as per needs, but default is usually fine.
// We wrap it in a try-catch in case it tries to access window/document on import in some envs.
try {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
  });
} catch {
  // Ignore initialization errors in non-browser env if they occur, 
  // though parse is what we care about.
}

export async function GET(request: Request) {
  if (process.env.ENABLE_API_ACCESS !== 'true') {
    return new NextResponse('API Access Disabled', { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  const diagrams = await getDiagrams();
  
  // Sort by updatedAt desc by default? Or just order in file?
  // Usually newest first is better.
  const sortedDiagrams = [...diagrams].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedDiagrams = sortedDiagrams.slice(startIndex, endIndex).map(d => ({
    id: d.id,
    title: d.title
  }));

  return NextResponse.json({
    data: paginatedDiagrams,
    pagination: {
      page,
      limit,
      total: diagrams.length,
      totalPages: Math.ceil(diagrams.length / limit)
    }
  });
}

export async function POST(request: Request) {
  if (process.env.ENABLE_API_ACCESS !== 'true') {
    return new NextResponse('API Access Disabled', { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, content } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Validate Mermaid syntax
    try {
        await mermaid.parse(content);
    } catch (e) {
        return NextResponse.json({ 
            error: 'Invalid Mermaid syntax', 
            details: e instanceof Error ? e.message : 'Unknown error'
        }, { status: 400 });
    }

    const diagrams = await getDiagrams();
    let id = generateShortId();
    // Ensure uniqueness
    while (diagrams.some(d => d.id === id)) {
      id = generateShortId();
    }

    const newDiagram: Diagram = {
      id,
      title: title || 'Untitled Diagram',
      content,
      emoji: getRandomEmoji(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: false,
    };

    await saveDiagrams([newDiagram, ...diagrams]);

    return NextResponse.json(newDiagram, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/access:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
