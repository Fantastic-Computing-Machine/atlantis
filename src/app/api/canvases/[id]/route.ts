
import { deleteCanvasById, getCanvasById, updateCanvasById } from '@/lib/canvas-data';
import { NextRequest, NextResponse } from 'next/server';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
    const { id } = await params;
    const canvas = await getCanvasById(id);

    if (!canvas) {
        return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
    }

    return NextResponse.json(canvas);
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
    const { id } = await params;

    try {
        const body = await req.json();
        // Validate body if needed, but updateCanvasById handles partials
        const updated = await updateCanvasById(id, body);

        if (!updated) {
            return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Failed to update canvas', error);
        return NextResponse.json({ error: 'Failed to update canvas' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
    const { id } = await params;

    try {
        const success = await deleteCanvasById(id);

        if (!success) {
            return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete canvas', error);
        return NextResponse.json({ error: 'Failed to delete canvas' }, { status: 500 });
    }
}
