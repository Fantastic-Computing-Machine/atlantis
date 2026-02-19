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

        if (!canvas || !canvas.preview) {
            return new NextResponse('Preview not found', { status: 404 });
        }

        // canvas.preview is likely a data URI: "data:image/svg+xml;base64,..."
        const matches = canvas.preview.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

        if (!matches || matches.length !== 3) {
            return new NextResponse('Invalid preview data', { status: 500 });
        }

        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=60', // Cache for 1 min
            },
        });
    } catch (error) {
        logApiError('GET /api/access/canvases/[id]/image', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
