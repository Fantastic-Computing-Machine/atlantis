import type { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { prisma } from './prisma';
import { Checkpoint, Diagram, DiagramPage } from './types';
import { generateShortId, getRandomEmoji } from './utils';

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;
const MAX_CHECKPOINTS = 15;
const TITLE_MAX = 100;

type TransactionClient = Prisma.TransactionClient;
type DiagramWithLatest = {
  id: string;
  title: string;
  emoji: string;
  createdAt: Date;
  updatedAt: Date;
  isFavorite: boolean;
  contents: Array<{ content: string }>;
};

function normalizeLimit(limit?: number | null) {
  if (!Number.isFinite(limit)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(limit as number), 1), MAX_PAGE_SIZE);
}

function normalizeOffset(offset?: number | null) {
  if (!Number.isFinite(offset)) return 0;
  return Math.max(Math.trunc(offset as number), 0);
}

function isSQLite() {
  const provider = (process.env.PRISMA_PROVIDER || '').toLowerCase();
  const url = (process.env.DATABASE_URL || process.env.DB_CONNECTION || '').toLowerCase();
  return provider === 'sqlite' || url.startsWith('file:');
}

function toDiagram(diagram: DiagramWithLatest): Diagram {
  const latest = diagram.contents[0];
  return {
    id: diagram.id,
    title: diagram.title,
    content: latest?.content ?? '',
    emoji: diagram.emoji,
    createdAt: diagram.createdAt.toISOString(),
    updatedAt: diagram.updatedAt.toISOString(),
    isFavorite: diagram.isFavorite,
  };
}

function filterByQuery(diagrams: DiagramWithLatest[], query?: string) {
  if (!query) return diagrams;
  const term = query.trim().toLowerCase();
  if (!term) return diagrams;

  return diagrams.filter((diagram) => {
    const latestContent = diagram.contents[0]?.content ?? '';
    const haystack = `${diagram.title} ${latestContent}`.toLowerCase();
    return haystack.includes(term);
  });
}

function validateLengths(title?: string, content?: string) {
  if (typeof title === 'string' && title.length > TITLE_MAX) {
    throw new Error(`Title exceeds ${TITLE_MAX} characters`);
  }
}

async function ensureUniqueId(check: (id: string) => Promise<boolean>) {
  let id = generateShortId();
  while (await check(id)) {
    id = generateShortId();
  }
  return id;
}

export async function getDiagramPage({
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  query,
}: {
  limit?: number;
  offset?: number;
  query?: string;
}): Promise<DiagramPage> {
  const normalizedLimit = normalizeLimit(limit);
  const normalizedOffset = normalizeOffset(offset);

  if (query) {
    if (!isSQLite()) {
      const diagrams = await prisma.diagram.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { contents: { some: { content: { contains: query } } } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        skip: normalizedOffset,
        take: normalizedLimit,
        include: { contents: { orderBy: { updatedAt: 'desc' }, take: 1 } },
      });
      const total = await prisma.diagram.count({
        where: {
          OR: [
            { title: { contains: query } },
            { contents: { some: { content: { contains: query } } } },
          ],
        },
      });
      const nextOffset = normalizedOffset + diagrams.length;
      const hasMore = nextOffset < total;
      return { items: diagrams.map(toDiagram), total, hasMore, nextOffset };
    }

    const diagrams = await prisma.diagram.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { contents: { orderBy: { updatedAt: 'desc' }, take: 1 } },
    });

    const filtered = filterByQuery(diagrams, query);
    const items = filtered.slice(normalizedOffset, normalizedOffset + normalizedLimit).map(toDiagram);
    const total = filtered.length;
    const nextOffset = normalizedOffset + items.length;
    const hasMore = nextOffset < total;

    return { items, total, hasMore, nextOffset };
  }

  const [diagrams, total] = await Promise.all([
    prisma.diagram.findMany({
      orderBy: { updatedAt: 'desc' },
      skip: normalizedOffset,
      take: normalizedLimit,
      include: { contents: { orderBy: { updatedAt: 'desc' }, take: 1 } },
    }),
    prisma.diagram.count(),
  ]);

  const items = diagrams.map(toDiagram);
  const nextOffset = normalizedOffset + items.length;
  const hasMore = nextOffset < total;

  return { items, total, hasMore, nextOffset };
}

export async function getDiagramById(id: string): Promise<Diagram | null> {
  const diagram = await prisma.diagram.findUnique({
    where: { id },
    include: { contents: { orderBy: { updatedAt: 'desc' }, take: 1 } },
  });

  if (!diagram) return null;
  return toDiagram(diagram);
}

export async function getDiagrams(): Promise<Diagram[]> {
  const diagrams = await prisma.diagram.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { contents: { orderBy: { updatedAt: 'desc' }, take: 1 } },
  });
  return diagrams.map(toDiagram);
}

export async function createDiagram({
  title,
  content,
  emoji,
}: {
  title?: string;
  content?: string;
  emoji?: string;
}): Promise<Diagram> {
  const now = new Date();
  const diagramId = await ensureUniqueId(async (id) => {
    const existing = await prisma.diagram.findUnique({ where: { id }, select: { id: true } });
    return Boolean(existing);
  });

  const contentId = await ensureUniqueId(async (id) => {
    const existing = await prisma.content.findUnique({ where: { id }, select: { id: true } });
    return Boolean(existing);
  });

  const diagram = await prisma.$transaction(async (tx: TransactionClient) => {
    const createdDiagram = await tx.diagram.create({
      data: {
        id: diagramId,
        title: title || 'Untitled Diagram',
        emoji: emoji || getRandomEmoji(),
        createdAt: now,
        updatedAt: now,
        isFavorite: false,
      },
    });

    await tx.content.create({
      data: {
        id: contentId,
        diagramId,
        content: content || 'graph TD\n    A[Start] --> B[End]',
        updatedAt: now,
      },
    });

    const latest = await tx.diagram.findUnique({
      where: { id: createdDiagram.id },
      include: { contents: { orderBy: { updatedAt: 'desc' }, take: 1 } },
    });

    return latest as DiagramWithLatest;
  });

  return toDiagram(diagram);
}

export async function updateDiagramById(
  id: string,
  updates: Partial<Pick<Diagram, 'title' | 'content' | 'emoji' | 'isFavorite'>>
): Promise<Diagram | null> {
  const existing = await prisma.diagram.findUnique({ where: { id } });
  if (!existing) return null;

  validateLengths(updates.title);

  const now = new Date();
  const hasContentUpdate = typeof updates.content === 'string';

  const diagram = await prisma.$transaction(async (tx: TransactionClient) => {
    await tx.diagram.update({
      where: { id },
      data: {
        title: updates.title ?? existing.title,
        emoji: updates.emoji ?? existing.emoji,
        isFavorite: typeof updates.isFavorite === 'boolean' ? updates.isFavorite : existing.isFavorite,
        updatedAt: now,
      },
    });

    if (hasContentUpdate) {
      const latestContent = await tx.content.findFirst({
        where: { diagramId: id },
        orderBy: { updatedAt: 'desc' },
      });

      if (latestContent) {
        await tx.content.update({
          where: { id: latestContent.id },
          data: {
            content: updates.content ?? latestContent.content,
            updatedAt: now,
          },
        });
      } else {
        const contentId = await ensureUniqueId(async (candidate) => {
          const found = await tx.content.findUnique({ where: { id: candidate }, select: { id: true } });
          return Boolean(found);
        });

        await tx.content.create({
          data: {
            id: contentId,
            diagramId: id,
            content: updates.content ?? '',
            updatedAt: now,
          },
        });
      }
    }

    const latest = await tx.diagram.findUnique({
      where: { id },
      include: { contents: { orderBy: { updatedAt: 'desc' }, take: 1 } },
    });

    return latest as DiagramWithLatest | null;
  });

  return diagram ? toDiagram(diagram) : null;
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
  payload: { content: string; title?: string; emoji?: string; isFavorite?: boolean }
): Promise<{ checkpoint: Checkpoint; diagram: Diagram } | null> {
  const existing = await prisma.diagram.findUnique({ where: { id: diagramId } });
  if (!existing) return null;

  validateLengths(payload.title);

  const now = new Date();

  const result = await prisma.$transaction(async (tx: TransactionClient) => {
    await tx.diagram.update({
      where: { id: diagramId },
      data: {
        title: payload.title ?? existing.title,
        emoji: payload.emoji ?? existing.emoji,
        isFavorite:
          typeof payload.isFavorite === 'boolean' ? payload.isFavorite : existing.isFavorite,
        updatedAt: now,
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
        content: payload.content,
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
      await tx.content.deleteMany({ where: { id: { in: extraContents.map((c: { id: string }) => c.id) } } });
    }

    const latest = await tx.diagram.findUnique({
      where: { id: diagramId },
      include: { contents: { orderBy: { updatedAt: 'desc' }, take: 1 } },
    });

    const checkpoint: Checkpoint = {
      id: checkpointId,
      content: payload.content,
      updatedAt: now.toISOString(),
    };

    return { diagram: latest as DiagramWithLatest, checkpoint };
  });

  return { checkpoint: result.checkpoint, diagram: toDiagram(result.diagram) };
}

export async function deleteDiagramById(id: string): Promise<boolean> {
  try {
    await prisma.diagram.delete({ where: { id } });
    return true;
  } catch (error: unknown) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
      return false;
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to delete diagram');
  }
}

export async function restoreDiagrams(diagrams: Diagram[]): Promise<void> {
  await prisma.$transaction(async (tx: TransactionClient) => {
    await tx.content.deleteMany();
    await tx.diagram.deleteMany();

    for (const diagram of diagrams) {
      const createdAt = diagram.createdAt ? new Date(diagram.createdAt) : new Date();
      const updatedAt = diagram.updatedAt ? new Date(diagram.updatedAt) : createdAt;

      await tx.diagram.create({
        data: {
          id: diagram.id,
          title: diagram.title,
          emoji: diagram.emoji,
          createdAt,
          updatedAt,
          isFavorite: diagram.isFavorite,
        },
      });

      await tx.content.create({
        data: {
          id: await ensureUniqueId(async (candidate) => {
            const found = await tx.content.findUnique({ where: { id: candidate }, select: { id: true } });
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
