import { ensureCsrfCookie } from '@/lib/csrf';
import { getCanvasPage } from '@/lib/canvas-data';
import { logApiError } from '@/lib/logger';
import { NextResponse } from 'next/server';

const apiAccessEnabled = process.env.ENABLE_API_ACCESS?.trim().toLowerCase() === 'true';

export async function GET(request: Request) {
    if (!apiAccessEnabled) {
        return new NextResponse('API Access Disabled', { status: 403 });
    }

    try {
        await ensureCsrfCookie();

        const { searchParams } = new URL(request.url);
        const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
        const limit = Math.max(parseInt(searchParams.get('limit') || '10', 10), 1);
        const offset = (page - 1) * limit;

        const canvasesPage = await getCanvasPage({ limit, offset });

        // Transform for public API
        const data = canvasesPage.items.map((c) => ({
            id: c.id,
            title: c.title,
            emoji: c.emoji,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            tags: c.tags,
        }));

        return NextResponse.json({
            data,
            pagination: {
                page,
                limit,
                total: canvasesPage.total,
                totalPages: Math.ceil(canvasesPage.total / limit),
            },
        });
    } catch (error) {
        logApiError('GET /api/access/canvases', error);
        return NextResponse.json({ error: 'Failed to fetch canvases' }, { status: 500 });
    }
}
