import type { Prisma } from '@prisma/client';

// buildSearchVector removed as it was unused
import { prisma } from './prisma';
import type { Canvas, CanvasPage, NoteSortOption } from './types';
import { generateShortId, getRandomEmoji } from './utils';

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;
const MAX_TAGS_PER_ITEM = 3;
const TITLE_MAX = 200;

type TagRow = { id: string; name: string; slug: string; color: string };
type CanvasRow = Prisma.CanvasGetPayload<object> & { tags?: TagRow[] };

const normalizeLimit = (limit?: number | null) => {
    if (!Number.isFinite(limit)) return DEFAULT_PAGE_SIZE;
    return Math.min(Math.max(Math.trunc(limit as number), 1), MAX_PAGE_SIZE);
};

const normalizeOffset = (offset?: number | null) => {
    if (!Number.isFinite(offset)) return 0;
    return Math.max(Math.trunc(offset as number), 0);
};

const mapTagIds = (ids: string[]) => ids.map((tagId) => ({ id: tagId }));

// Content is JSON, so we don't index it for full-text search yet

const toCanvas = (row: CanvasRow): Canvas => ({
    id: row.id,
    title: row.title,
    content: row.content,
    preview: row.preview,
    emoji: row.emoji,
    isFavorite: row.isFavorite,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    tags: row.tags,
});

const toCanvasListItem = (row: CanvasRow): Omit<Canvas, 'content'> => ({
    id: row.id,
    title: row.title,
    preview: row.preview,
    emoji: row.emoji,
    isFavorite: row.isFavorite,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    tags: row.tags,
});

const validateCanvasLengths = (title?: string) => {
    if (typeof title === 'string' && title.length > TITLE_MAX) {
        throw new Error(`Title exceeds ${TITLE_MAX} characters`);
    }
};

const isNotFoundError = (error: unknown): boolean =>
    typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2025';

async function ensureUniqueCanvasId(): Promise<string> {
    let id = generateShortId();
    let existing = await prisma.canvas.findUnique({ where: { id }, select: { id: true } });
    while (existing) {
        id = generateShortId();
        existing = await prisma.canvas.findUnique({ where: { id }, select: { id: true } });
    }
    return id;
}

export async function getCanvasPage({
    limit = DEFAULT_PAGE_SIZE,
    offset = 0,
    query,
    sort = 'recent',
    favoritesOnly = false,
    tagSlug,
}: {
    limit?: number;
    offset?: number;
    query?: string;
    sort?: NoteSortOption;
    favoritesOnly?: boolean;
    tagSlug?: string;
}): Promise<CanvasPage> {
    const normalizedLimit = normalizeLimit(limit);
    const normalizedOffset = normalizeOffset(offset);

    const where: Prisma.CanvasWhereInput = {};
    if (query?.trim()) {
        where.title = { contains: query.trim() };
    }
    if (favoritesOnly) {
        where.isFavorite = true;
    }
    if (tagSlug) {
        where.tags = { some: { slug: tagSlug } };
    }

    const orderBy: Prisma.CanvasOrderByWithRelationInput = (() => {
        switch (sort) {
            case 'old':
                return { updatedAt: 'asc' };
            case 'alphabetical':
                return { title: 'asc' };
            case 'recent':
            default:
                return { updatedAt: 'desc' };
        }
    })();

    const [canvases, total] = await Promise.all([
        prisma.canvas.findMany({
            where,
            orderBy,
            skip: normalizedOffset,
            take: normalizedLimit,
            include: { tags: true },
        }),
        prisma.canvas.count({ where }),
    ]);

    const items = canvases.map(toCanvasListItem);
    const nextOffset = normalizedOffset + items.length;
    const hasMore = nextOffset < total;

    return { items, total, hasMore, nextOffset };
}

export async function getCanvasById(id: string): Promise<Canvas | null> {
    const canvas = await prisma.canvas.findUnique({
        where: { id },
        include: { tags: true },
    });
    if (!canvas) return null;
    return toCanvas(canvas);
}

export async function createCanvas({
    title,
    content,
    preview,
    emoji,
    tags,
}: {
    title?: string;
    content?: string;
    preview?: string;
    emoji?: string;
    tags?: string[];
}): Promise<Canvas> {
    const now = new Date();
    validateCanvasLengths(title);

    if (tags && tags.length > MAX_TAGS_PER_ITEM) {
        throw new Error(`Cannot add more than ${MAX_TAGS_PER_ITEM} tags`);
    }

    const canvasId = await ensureUniqueCanvasId();
    const nextTitle = title || 'Untitled Canvas';
    const nextContent = content || '{}';

    const canvas = await prisma.$transaction(async (tx) => {
        const created = await tx.canvas.create({
            data: {
                id: canvasId,
                title: nextTitle,
                content: nextContent,
                preview: preview,
                emoji: emoji || getRandomEmoji(),
                isFavorite: false,
                createdAt: now,
                updatedAt: now,
                tags: tags ? { connect: mapTagIds(tags) } : undefined,
            },
            include: { tags: true },
        });

        if (tags && tags.length > 0) {
            await tx.tag.updateMany({
                where: { id: { in: tags } },
                data: { usageCount: { increment: 1 } },
            });
        }

        return created;
    });

    return toCanvas(canvas);
}

export async function updateCanvasById(
    id: string,
    updates: Partial<Pick<Canvas, 'title' | 'content' | 'preview' | 'isFavorite' | 'emoji'>> & {
        tags?: string[];
    }
): Promise<Canvas | null> {
    const existing = await prisma.canvas.findUnique({
        where: { id },
        include: { tags: { select: { id: true } } },
    });
    if (!existing) return null;

    validateCanvasLengths(updates.title);

    if (updates.tags && updates.tags.length > MAX_TAGS_PER_ITEM) {
        throw new Error(`Cannot add more than ${MAX_TAGS_PER_ITEM} tags`);
    }

    const now = new Date();
    const nextTitle = updates.title ?? existing.title;
    const nextContent = updates.content ?? existing.content;

    const canvas = await prisma.$transaction(async (tx) => {
        if (updates.tags) {
            const oldTagIds = existing.tags.map((t) => t.id);
            const newTagIds = updates.tags!;

            const addedTags = newTagIds.filter((id) => !oldTagIds.includes(id));
            const removedTags = oldTagIds.filter((id) => !newTagIds.includes(id));

            if (addedTags.length > 0) {
                await tx.tag.updateMany({
                    where: { id: { in: addedTags } },
                    data: { usageCount: { increment: 1 } },
                });
            }

            if (removedTags.length > 0) {
                await tx.tag.updateMany({
                    where: { id: { in: removedTags } },
                    data: { usageCount: { decrement: 1 } },
                });
            }
        }

        const updated = await tx.canvas.update({
            where: { id },
            data: {
                title: nextTitle,
                content: nextContent,
                preview: updates.preview ?? existing.preview,
                emoji: updates.emoji ?? existing.emoji,
                isFavorite: typeof updates.isFavorite === 'boolean' ? updates.isFavorite : existing.isFavorite,
                updatedAt: now,
                tags: updates.tags ? { set: mapTagIds(updates.tags) } : undefined,
            },
            include: { tags: true },
        });

        return updated;
    });

    return toCanvas(canvas);
}

export async function deleteCanvasById(id: string): Promise<boolean> {
    try {
        return await prisma.$transaction(async (tx) => {
            const canvas = await tx.canvas.findUnique({
                where: { id },
                include: { tags: { select: { id: true } } },
            });

            if (!canvas) return false;

            if (canvas.tags.length > 0) {
                await tx.tag.updateMany({
                    where: { id: { in: canvas.tags.map((t) => t.id) } },
                    data: { usageCount: { decrement: 1 } },
                });
            }

            await tx.canvas.delete({ where: { id } });
            return true;
        });
    } catch (error: unknown) {
        if (isNotFoundError(error)) {
            return false;
        }
        throw error;
    }
}
