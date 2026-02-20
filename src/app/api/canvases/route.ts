import { createCanvas, getCanvasPage } from '@/lib/canvas-data';
import { csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { logApiError } from '@/lib/logger';
import { canvasCreateSchema } from '@/lib/schemas';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const searchSchema = z.object({
    limit: z.coerce.number().min(1).max(100).optional(),
    offset: z.coerce.number().min(0).optional(),
    query: z.string().optional(),
    sort: z.enum(['recent', 'old', 'alphabetical']).optional(),
    tagSlug: z.string().optional(),
});

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const result = searchSchema.safeParse(Object.fromEntries(searchParams));

    if (!result.success) {
        return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const { limit, offset, query, sort, tagSlug } = result.data;

    const page = await getCanvasPage({
        limit,
        offset,
        query,
        sort,
        tagSlug,
    });

    return NextResponse.json(page);
}

export async function POST(req: NextRequest) {
    if (!(await validateCsrfToken(req))) {
        return csrfFailureResponse();
    }

    try {
        const json = await req.json();
        const result = canvasCreateSchema.safeParse(json);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: result.error.flatten() },
                { status: 400 }
            );
        }

        const canvas = await createCanvas(result.data);
        return NextResponse.json(canvas, { status: 201 });
    } catch (error) {
        logApiError('POST /api/canvases', error);
        return NextResponse.json({ error: 'Failed to create canvas' }, { status: 500 });
    }
}
