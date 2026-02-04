import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

type TagRouteParams = {
  params: Promise<{ id: string }>;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export async function DELETE(request: Request, { params }: TagRouteParams) {
  try {
    const { id } = await params;
    await prisma.tag.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: TagRouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, color } = body;

    const updateData: { color?: string; name?: string; slug?: string } = {
      color,
    };

    if (name) {
      updateData.name = name;
      updateData.slug = slugify(name);
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(tag);
  } catch {
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}
