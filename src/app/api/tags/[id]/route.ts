
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.tag.delete({
            where: { id },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, color } = body;

        // If name is updated, we might need to update slug too? 
        // User didn't explicitly ask for update, but "manage tags (create delete update read)" was requested.

        const updateData: any = { color };

        if (name) {
            updateData.name = name;
            updateData.slug = name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }

        const tag = await prisma.tag.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(tag);
    } catch (error) {
        // Check for unique constraint violation on slug
        return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
    }
}
