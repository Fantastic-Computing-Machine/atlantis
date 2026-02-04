import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

const MAX_TAGS = 25;

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
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

export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            notes: true,
            diagrams: true,
          },
        },
      },
    });
    return NextResponse.json(tags);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const count = await prisma.tag.count();
    if (count >= MAX_TAGS) {
      return NextResponse.json(
        { error: `Maximum limit of ${MAX_TAGS} tags reached.` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = createTagSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, color } = result.data;

    const slug = slugify(name);

    if (!slug) {
      return NextResponse.json(
        { error: 'Invalid tag name resulting in empty slug' },
        { status: 400 }
      );
    }

    const existing = await prisma.tag.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'Tag with this name already exists.' }, { status: 409 });
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        slug,
        color: color || '#000000',
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}
