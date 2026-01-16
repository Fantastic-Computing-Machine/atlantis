import { csrfFailureResponse, ensureCsrfCookie, validateCsrfToken } from '@/lib/csrf';
import { createDiagram, getDiagramPage } from '@/lib/data';
import { logApiError } from '@/lib/logger';
import { NextResponse } from 'next/server';
import mermaid from 'mermaid';

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

  try {
    await ensureCsrfCookie();

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.max(parseInt(searchParams.get('limit') || '10', 10), 1);
    const offset = (page - 1) * limit;

    const diagramsPage = await getDiagramPage({ limit, offset });
    const paginatedDiagrams = diagramsPage.items.map((d) => ({
      id: d.id,
      title: d.title,
    }));

    return NextResponse.json({
      data: paginatedDiagrams,
      pagination: {
        page,
        limit,
        total: diagramsPage.total,
        totalPages: Math.ceil(diagramsPage.total / limit),
      },
    });
  } catch (error) {
    logApiError('GET /api/access', error);
    return NextResponse.json({ error: 'Failed to fetch diagrams' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (process.env.ENABLE_API_ACCESS !== 'true') {
    return new NextResponse('API Access Disabled', { status: 403 });
  }

  if (!(await validateCsrfToken(request))) {
    return csrfFailureResponse();
  }

  try {
    const body = await request.json();
    const { title, content } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    try {
      await mermaid.parse(content);
    } catch (e) {
      return NextResponse.json(
        {
          error: 'Invalid Mermaid syntax',
          details: e instanceof Error ? e.message : 'Unknown error',
        },
        { status: 400 }
      );
    }

    const newDiagram = await createDiagram({ title, content });

    return NextResponse.json(newDiagram, { status: 201 });
  } catch (error) {
    logApiError('POST /api/access', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
