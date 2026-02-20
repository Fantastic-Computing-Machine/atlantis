
import { deleteCanvasById, getCanvasById, updateCanvasById } from '@/lib/canvas-data';
import { csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { logApiError } from '@/lib/logger';
import { canvasUpdateSchema } from '@/lib/schemas';
import { NextRequest, NextResponse } from 'next/server';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
    try {
        const { id } = await params;
        const canvas = await getCanvasById(id);

        if (!canvas) {
            return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
        }

        return NextResponse.json(canvas);
    } catch (error) {
        logApiError('GET /api/canvases/[id]', error);
        return NextResponse.json({ error: 'Failed to load canvas' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
    if (!(await validateCsrfToken(req))) {
        return csrfFailureResponse();
    }

    try {
        const { id } = await params;
        const json = await req.json();
        const result = canvasUpdateSchema.safeParse(json);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: result.error.flatten() },
                { status: 400 }
            );
        }

        const updated = await updateCanvasById(id, result.data);

        if (!updated) {
            return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        logApiError('PUT /api/canvases/[id]', error);
        return NextResponse.json({ error: 'Failed to update canvas' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
    if (!(await validateCsrfToken(req))) {
        return csrfFailureResponse();
    }

    try {
        const { id } = await params;
        const success = await deleteCanvasById(id);

        if (!success) {
            return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        logApiError('DELETE /api/canvases/[id]', error);
        return NextResponse.json({ error: 'Failed to delete canvas' }, { status: 500 });
    }
}
