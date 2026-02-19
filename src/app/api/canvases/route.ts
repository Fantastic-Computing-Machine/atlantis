import { createCanvas, getCanvasPage } from '@/lib/canvas-data';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// In data.ts it was internal.

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
    try {
        const body = await req.json();
        const { title, content, tags } = body;

        // Basic validation handled by createCanvas
        const canvas = await createCanvas({
            title,
            content,
            tags
        });

        return NextResponse.json(canvas, { status: 201 });
    } catch (error) {
        console.error('Failed to create canvas', error);
        return NextResponse.json({ error: 'Failed to create canvas' }, { status: 500 });
    }
}
