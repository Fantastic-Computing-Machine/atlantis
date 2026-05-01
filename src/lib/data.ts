import type { Prisma } from '@prisma/client';

import { prisma } from './prisma';
import { buildSearchVector, stripStopWords } from './search';
import { Checkpoint, Diagram, DiagramPage } from './types';
import { generateShortId, getRandomEmoji } from './utils';

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;
const MAX_CHECKPOINTS = 15;
const TITLE_MAX = 100;
const DESCRIPTION_MAX = 400;
const MAX_TAGS_PER_ITEM = 3;

type TransactionClient = typeof prisma;
const diagramWithLatestSelect = {
  id: true,
  title: true,
  description: true,
  emoji: true,
  createdAt: true,
  updatedAt: true,
  isFavorite: true,
  totalVersions: true,
  searchVector: true,
  tags: true,
  contents: {
    orderBy: { updatedAt: 'desc' as const },
    take: 1,
    select: { id: true, content: true, updatedAt: true },
  },
} satisfies Prisma.DiagramSelect;
type DiagramWithLatest = Prisma.DiagramGetPayload<{
  select: typeof diagramWithLatestSelect;
}>;

function toDiagram(diagram: DiagramWithLatest): Diagram {
  const latest = diagram.contents[0];
  return {
    id: diagram.id,
    title: diagram.title,
    description: diagram.description,
    content: latest?.content ?? '',
    emoji: diagram.emoji,
    createdAt: diagram.createdAt.toISOString(),
    updatedAt: diagram.updatedAt.toISOString(),
    isFavorite: diagram.isFavorite,
    totalVersions: diagram.totalVersions,
    tags: diagram.tags,
  };
}

function validateLengths(title?: string, description?: string) {
  if (typeof title === 'string' && title.length > TITLE_MAX) {
    throw new Error(`Title exceeds ${TITLE_MAX} characters`);
  }
  if (typeof description === 'string' && description.length > DESCRIPTION_MAX) {
    throw new Error(`Description exceeds ${DESCRIPTION_MAX} characters`);
  }
}

async function ensureUniqueId(check: (id: string) => Promise<boolean>) {
  let id = generateShortId();
  while (await check(id)) {
    id = generateShortId();
  }
  return id;
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2025'
  );
}

async function withTx<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => fn(tx as TransactionClient)) as Promise<T>;
}

const normalizeLimit = (limit?: number | null) => {
  if (!Number.isFinite(limit)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(limit as number), 1), MAX_PAGE_SIZE);
};

const normalizeOffset = (offset?: number | null) => {
  if (!Number.isFinite(offset)) return 0;
  return Math.max(Math.trunc(offset as number), 0);
};

const mapTagIds = (ids: string[]) => ids.map((tagId) => ({ id: tagId }));

export async function getDiagramPage({
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  query,
  sort = 'recent',
  favoritesOnly = false,
  tagSlug,
  metadataOnly = false,
}: {
  limit?: number;
  offset?: number;
  query?: string;
  sort?: import('./types').SortOption;
  favoritesOnly?: boolean;
  tagSlug?: string;
  metadataOnly?: boolean;
}): Promise<DiagramPage> {
  const normalizedLimit = normalizeLimit(limit);
  const normalizedOffset = normalizeOffset(offset);

  const buildSafeTsQuery = (value: string) =>
    value
      .split(/\s+/)
      .map((token) => token.replace(/[^a-zA-Z0-9_]/g, ''))
      .filter(Boolean)
      .join(' & ');

  const where: Prisma.DiagramWhereInput = {};
  if (query?.trim()) {
    const cleanQuery = stripStopWords(query.trim());
    const isPostgres =
      process.env.PRISMA_PROVIDER === 'postgresql' ||
      process.env.DATABASE_URL?.startsWith('postgres');

    if (isPostgres) {
      // Create a sanitized Postgres tsquery string connecting words with &
      const tsQuery = buildSafeTsQuery(cleanQuery);
      if (tsQuery) {
        where.searchVector = { search: tsQuery } as Prisma.StringFilter;
      } else {
        where.searchVector = { contains: cleanQuery.replace(/[^a-zA-Z0-9_\s]/g, '') };
      }
    } else {
      where.searchVector = { contains: cleanQuery };
    }
  }
  if (favoritesOnly) {
    where.isFavorite = true;
  }
  if (tagSlug) {
    where.tags = { some: { slug: tagSlug } };
  }

  let orderBy: Prisma.DiagramOrderByWithRelationInput = { updatedAt: 'desc' };
  switch (sort) {
    case 'old':
      orderBy = { updatedAt: 'asc' };
      break;
    case 'alphabetical':
      orderBy = { title: 'asc' };
      break;
    case 'versions':
      orderBy = { totalVersions: 'desc' };
      break;
    case 'recent':
    default:
      orderBy = { updatedAt: 'desc' };
      break;
  }

  const [diagrams, total] = await Promise.all([
    prisma.diagram.findMany({
      where,
      orderBy,
      skip: normalizedOffset,
      take: normalizedLimit,
      select: metadataOnly ? { id: true, updatedAt: true } : diagramWithLatestSelect,
    }),
    prisma.diagram.count({ where }),
  ]);

  const items = diagrams.map((d) => {
    if (metadataOnly) {
      return {
        id: d.id,
        updatedAt: d.updatedAt.toISOString(),
        title: '',
        description: '',
        content: '',
        emoji: '',
        createdAt: new Date().toISOString(),
        isFavorite: false,
        totalVersions: 0,
        tags: []
      };
    }
    return toDiagram(d as DiagramWithLatest);
  });
  const nextOffset = normalizedOffset + items.length;
  const hasMore = nextOffset < total;

  return { items, total, hasMore, nextOffset };
}

export async function getDiagramById(id: string): Promise<Diagram | null> {
  const diagram = await prisma.diagram.findUnique({
    where: { id },
    select: diagramWithLatestSelect,
  });

  if (!diagram) return null;
  return toDiagram(diagram as DiagramWithLatest);
}

export async function getDiagramUpdatedAt(id: string): Promise<{ updatedAt: string } | null> {
  const diagram = await prisma.diagram.findUnique({
    where: { id },
    select: { updatedAt: true },
  });
  if (!diagram) return null;
  return { updatedAt: diagram.updatedAt.toISOString() };
}

export async function getDiagrams(): Promise<Diagram[]> {
  const diagrams = await prisma.diagram.findMany({
    orderBy: { updatedAt: 'desc' },
    select: diagramWithLatestSelect,
  });
  return diagrams.map(toDiagram);
}

export async function createDiagram({
  title,
  description,
  content,
  emoji,
  tags,
}: {
  title?: string;
  description?: string;
  content?: string;
  emoji?: string;
  tags?: string[];
}): Promise<Diagram> {
  const now = new Date();
  validateLengths(title, description);

  // Validate tag limit
  if (tags && tags.length > MAX_TAGS_PER_ITEM) {
    throw new Error(`Cannot add more than ${MAX_TAGS_PER_ITEM} tags`);
  }

  const diagramId = await ensureUniqueId(async (id) => {
    const existing = await prisma.diagram.findUnique({ where: { id }, select: { id: true } });
    return Boolean(existing);
  });

  const contentId = await ensureUniqueId(async (id) => {
    const existing = await prisma.content.findUnique({ where: { id }, select: { id: true } });
    return Boolean(existing);
  });

  const diagram = await withTx(async (tx: TransactionClient) => {
    const nextTitle = title || 'Untitled Diagram';
    const nextDescription = description || '';
    const nextContent = content || 'graph TD\n    A[Start] --> B[End]';

    const createdDiagram = await tx.diagram.create({
      data: {
        id: diagramId,
        title: nextTitle,
        description: nextDescription,
        emoji: emoji || getRandomEmoji(),
        createdAt: now,
        updatedAt: now,
        isFavorite: false,
        totalVersions: 1,
        searchVector: buildSearchVector(nextTitle, nextDescription, nextContent),
        contents: {
          create: {
            id: contentId,
            content: nextContent,
            updatedAt: now,
          },
        },
        tags: tags ? { connect: mapTagIds(tags) } : undefined,
      },
      select: diagramWithLatestSelect,
    });

    if (tags && tags.length > 0) {
      await tx.tag.updateMany({
        where: { id: { in: tags } },
        data: { usageCount: { increment: 1 } },
      });
    }

    return createdDiagram as DiagramWithLatest;
  });

  return toDiagram(diagram);
}

export async function updateDiagramById(
  id: string,
  updates: Partial<Pick<Diagram, 'title' | 'description' | 'content' | 'emoji' | 'isFavorite'>> & {
    tags?: string[];
  }
): Promise<Diagram | null> {
  const existing = await prisma.diagram.findUnique({ where: { id } });
  if (!existing) return null;

  validateLengths(updates.title, updates.description);

  if (updates.tags && updates.tags.length > MAX_TAGS_PER_ITEM) {
    throw new Error(`Cannot add more than ${MAX_TAGS_PER_ITEM} tags`);
  }

  const now = new Date();
  const hasContentUpdate = typeof updates.content === 'string';

  const diagram = await withTx(async (tx: TransactionClient) => {
    const latestContent = await tx.content.findFirst({
      where: { diagramId: id },
      orderBy: { updatedAt: 'desc' },
    });

    if (updates.tags) {
      // Fetch current tags to calculate diff
      const currentDiagram = await tx.diagram.findUnique({
        where: { id },
        select: { tags: { select: { id: true } } },
      });
      const oldTagIds = currentDiagram?.tags.map((t) => t.id) || [];
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

    const nextTitle = updates.title ?? existing.title;
    const nextDescription = updates.description ?? existing.description;
    let nextContent = latestContent?.content ?? '';

    if (hasContentUpdate) {
      nextContent = updates.content ?? nextContent;
      if (latestContent) {
        await tx.content.update({
          where: { id: latestContent.id },
          data: {
            content: nextContent,
            updatedAt: now,
          },
        });
      } else {
        const contentId = await ensureUniqueId(async (candidate) => {
          const found = await tx.content.findUnique({
            where: { id: candidate },
            select: { id: true },
          });
          return Boolean(found);
        });

        await tx.content.create({
          data: {
            id: contentId,
            diagramId: id,
            content: nextContent,
            updatedAt: now,
          },
        });

        if (!latestContent) {
          const totalVersions = await tx.content.count({ where: { diagramId: id } });
          await tx.diagram.update({ where: { id }, data: { totalVersions } });
        }
      }
    }

    await tx.diagram.update({
      where: { id },
      data: {
        title: nextTitle,
        description: nextDescription,
        emoji: updates.emoji ?? existing.emoji,
        isFavorite:
          typeof updates.isFavorite === 'boolean' ? updates.isFavorite : existing.isFavorite,
        updatedAt: now,
        searchVector: buildSearchVector(nextTitle, nextDescription, nextContent),
        tags: updates.tags ? { set: mapTagIds(updates.tags) } : undefined,
      },
    });

    const latest = await tx.diagram.findUnique({
      where: { id },
      select: diagramWithLatestSelect,
    });

    return latest as DiagramWithLatest | null;
  });

  return diagram ? toDiagram(diagram as DiagramWithLatest) : null;
}

export async function listCheckpoints(diagramId: string): Promise<Checkpoint[]> {
  const rows = await prisma.content.findMany({
    where: { diagramId },
    orderBy: { updatedAt: 'desc' },
    take: MAX_CHECKPOINTS,
  });

  return rows.map((row: { id: string; content: string; updatedAt: Date }) => ({
    id: row.id,
    content: row.content,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function createCheckpoint(
  diagramId: string,
  payload: {
    content: string;
    title?: string;
    description?: string;
    emoji?: string;
    isFavorite?: boolean;
  }
): Promise<{ checkpoint: Checkpoint; diagram: Diagram } | null> {
  validateLengths(payload.title, payload.description);

  const now = new Date();

  const result = await withTx(async (tx: TransactionClient) => {
    const current = await tx.diagram.findUnique({
      where: { id: diagramId },
      select: {
        title: true,
        description: true,
        emoji: true,
        isFavorite: true,
        totalVersions: true,
      },
    });

    if (!current) return null;

    const nextTitle = payload.title ?? current.title;
    const nextDescription = payload.description ?? current.description;
    const nextContent = payload.content;

    await tx.diagram.update({
      where: { id: diagramId },
      data: {
        title: nextTitle,
        description: nextDescription,
        emoji: payload.emoji ?? current.emoji,
        isFavorite:
          typeof payload.isFavorite === 'boolean' ? payload.isFavorite : current.isFavorite,
        updatedAt: now,
        searchVector: buildSearchVector(nextTitle, nextDescription, nextContent),
      },
    });

    const checkpointId = await ensureUniqueId(async (candidate) => {
      const found = await tx.content.findUnique({ where: { id: candidate }, select: { id: true } });
      return Boolean(found);
    });

    await tx.content.create({
      data: {
        id: checkpointId,
        diagramId,
        content: nextContent,
        updatedAt: now,
      },
    });

    const extraContents = await tx.content.findMany({
      where: { diagramId },
      orderBy: { updatedAt: 'desc' },
      skip: MAX_CHECKPOINTS,
      select: { id: true },
    });

    if (extraContents.length > 0) {
      await tx.content.deleteMany({
        where: { id: { in: extraContents.map((c: { id: string }) => c.id) } },
      });
    }

    const prunedCount = extraContents.length;

    await tx.diagram.update({
      where: { id: diagramId },
      data: { totalVersions: current.totalVersions + 1 - prunedCount },
    });

    const latest = await tx.diagram.findUnique({
      where: { id: diagramId },
      select: diagramWithLatestSelect,
    });

    if (!latest) return null;

    const checkpoint: Checkpoint = {
      id: checkpointId,
      content: payload.content,
      updatedAt: now.toISOString(),
    };

    return { diagram: latest as DiagramWithLatest, checkpoint };
  });

  if (!result) return null;

  return { checkpoint: result.checkpoint, diagram: toDiagram(result.diagram) };
}

/**
 * Delete a specific checkpoint from a diagram.
 * Cannot delete the latest (current) checkpoint.
 */
export async function deleteCheckpoint(diagramId: string, checkpointId: string): Promise<boolean> {
  return withTx(async (tx: TransactionClient) => {
    // Check if checkpoint exists and belongs to this diagram
    const checkpoint = await tx.content.findFirst({
      where: { id: checkpointId, diagramId },
    });

    if (!checkpoint) return false;

    // Get the latest checkpoint to prevent deleting current
    const latest = await tx.content.findFirst({
      where: { diagramId },
      orderBy: { updatedAt: 'desc' },
    });

    if (latest?.id === checkpointId) {
      throw new Error('Cannot delete the current checkpoint');
    }

    // Delete the checkpoint
    await tx.content.delete({ where: { id: checkpointId } });

    // Update totalVersions
    const count = await tx.content.count({ where: { diagramId } });
    await tx.diagram.update({
      where: { id: diagramId },
      data: { totalVersions: count },
    });

    return true;
  });
}

/**
 * Restore a checkpoint as the current version.
 * Creates a new checkpoint with the restored content.
 */
export async function restoreCheckpoint(
  diagramId: string,
  checkpointId: string
): Promise<{ checkpoint: Checkpoint; diagram: Diagram } | null> {
  const now = new Date();

  return withTx(async (tx: TransactionClient) => {
    // Get the checkpoint to restore
    const checkpoint = await tx.content.findFirst({
      where: { id: checkpointId, diagramId },
    });

    if (!checkpoint) return null;

    // Get current diagram
    const diagram = await tx.diagram.findUnique({
      where: { id: diagramId },
      select: {
        title: true,
        description: true,
        emoji: true,
        isFavorite: true,
        totalVersions: true,
      },
    });

    if (!diagram) return null;

    // Create new checkpoint with the restored content
    const newCheckpointId = await ensureUniqueId(async (candidate) => {
      const found = await tx.content.findUnique({
        where: { id: candidate },
        select: { id: true },
      });
      return Boolean(found);
    });

    await tx.content.create({
      data: {
        id: newCheckpointId,
        diagramId,
        content: checkpoint.content,
        updatedAt: now,
      },
    });

    // Update diagram timestamp and search vector
    await tx.diagram.update({
      where: { id: diagramId },
      data: {
        updatedAt: now,
        searchVector: buildSearchVector(diagram.title, diagram.description, checkpoint.content),
      },
    });

    // Prune old checkpoints if over limit
    const extraContents = await tx.content.findMany({
      where: { diagramId },
      orderBy: { updatedAt: 'desc' },
      skip: MAX_CHECKPOINTS,
      select: { id: true },
    });

    if (extraContents.length > 0) {
      await tx.content.deleteMany({
        where: { id: { in: extraContents.map((c: { id: string }) => c.id) } },
      });
    }

    const prunedCount = extraContents.length;

    await tx.diagram.update({
      where: { id: diagramId },
      data: { totalVersions: diagram.totalVersions + 1 - prunedCount },
    });

    // Get updated diagram
    const latest = await tx.diagram.findUnique({
      where: { id: diagramId },
      select: diagramWithLatestSelect,
    });

    if (!latest) return null;

    return {
      checkpoint: {
        id: newCheckpointId,
        content: checkpoint.content,
        updatedAt: now.toISOString(),
      },
      diagram: toDiagram(latest as DiagramWithLatest),
    };
  });
}

export async function deleteDiagramById(id: string): Promise<boolean> {
  try {
    return await withTx(async (tx) => {
      const diagram = await tx.diagram.findUnique({
        where: { id },
        include: { tags: { select: { id: true } } },
      });

      if (!diagram) return false;

      if (diagram.tags.length > 0) {
        await tx.tag.updateMany({
          where: { id: { in: diagram.tags.map((t) => t.id) } },
          data: { usageCount: { decrement: 1 } },
        });
      }

      await tx.diagram.delete({ where: { id } });
      return true;
    });
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return false;
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to delete diagram');
  }
}

export async function restoreDiagrams(diagrams: Diagram[]): Promise<void> {
  await withTx(async (tx: TransactionClient) => {
    await tx.content.deleteMany();
    await tx.diagram.deleteMany();

    for (const diagram of diagrams) {
      const createdAt = diagram.createdAt ? new Date(diagram.createdAt) : new Date();
      const updatedAt = diagram.updatedAt ? new Date(diagram.updatedAt) : createdAt;

      const searchVector = buildSearchVector(diagram.title, diagram.description, diagram.content);

      await tx.diagram.create({
        data: {
          id: diagram.id,
          title: diagram.title,
          description: diagram.description,
          emoji: diagram.emoji,
          createdAt,
          updatedAt,
          isFavorite: diagram.isFavorite,
          totalVersions: 1,
          searchVector,
        },
      });

      await tx.content.create({
        data: {
          id: await ensureUniqueId(async (candidate) => {
            const found = await tx.content.findUnique({
              where: { id: candidate },
              select: { id: true },
            });
            return Boolean(found);
          }),
          diagramId: diagram.id,
          content: diagram.content,
          updatedAt,
        },
      });
    }
  });
}
