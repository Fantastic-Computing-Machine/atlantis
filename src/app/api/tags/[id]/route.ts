import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

type TagRouteParams = {
  params: Promise<{ id: string }>;
};

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

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

    // Validate input
    const result = updateTagSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, color } = result.data;

    // Build update data
    const updateData: { color?: string; name?: string; slug?: string } = {};

    if (color !== undefined) {
      updateData.color = color;
    }

    if (name !== undefined) {
      const slug = slugify(name);
      
      // Reject empty slugs
      if (!slug) {
        return NextResponse.json(
          { error: 'Invalid tag name resulting in empty slug' },
          { status: 400 }
        );
      }

      updateData.name = name;
      updateData.slug = slug;
    }

    // Ensure at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(tag);
  } catch (error) {
    // Handle Prisma unique constraint violations
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Tag with this name or slug already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}
