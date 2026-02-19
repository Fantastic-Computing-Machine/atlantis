import { ensureCsrfCookie } from '@/lib/csrf';
import { getCanvasById } from '@/lib/canvas-data';
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

        const canvas = await getCanvasById(id);

        if (!canvas) {
            return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
        }

        return NextResponse.json({
            id: canvas.id,
            title: canvas.title,
            // content: canvas.content, // Optionally exclude raw tldraw JSON to avoid bloat, or include if requested? 
            // Let's include it for now as "content" is standard for "get by id"
            content: JSON.parse(canvas.content),
            emoji: canvas.emoji,
            createdAt: canvas.createdAt,
            updatedAt: canvas.updatedAt,
            tags: canvas.tags,
            // We can also provide a link to the preview image if exists
            previewUrl: canvas.preview ? `/api/access/canvases/${id}/image` : null
        });
    } catch (error) {
        logApiError('GET /api/access/canvases/[id]', error);
        return NextResponse.json({ error: 'Failed to fetch canvas' }, { status: 500 });
    }
}
