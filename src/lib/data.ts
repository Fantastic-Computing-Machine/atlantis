import type { Prisma } from '.prisma/client';
import { prisma } from './prisma';
import { Checkpoint, Diagram, DiagramPage } from './types';
import { generateShortId, getRandomEmoji } from './utils';

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;
const MAX_CHECKPOINTS = 15;
const TITLE_MAX = 100;

type TransactionClient = typeof prisma;
type DiagramWithLatest = Prisma.DiagramGetPayload<{
  include: { contents: { orderBy: { updatedAt: 'desc' }; take: 1 } };
}>;

function normalizeLimit(limit?: number | null) {
  if (!Number.isFinite(limit)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(limit as number), 1), MAX_PAGE_SIZE);
}

function normalizeOffset(offset?: number | null) {
  if (!Number.isFinite(offset)) return 0;
  return Math.max(Math.trunc(offset as number), 0);
}

function buildSearchVector(title: string, content: string) {
  return `${title} ${content}`.toLowerCase();
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

function isNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2025';
}

async function withTx<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T> {
  // Prisma v7 transaction typing under bundler: use any casting for callback form
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return (prisma as any).$transaction(fn as any) as Promise<T>;
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

  const where: Prisma.DiagramWhereInput | undefined = query?.trim()
    ? { searchVector: { contains: query.trim().toLowerCase() } }
    : undefined;

  const [diagrams, total] = await Promise.all([
    prisma.diagram.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: normalizedOffset,
      take: normalizedLimit,
      include: { contents: { orderBy: { updatedAt: 'desc' }, take: 1 } },
    }),
    prisma.diagram.count({ where }),
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

  const diagram = await withTx(async (tx: TransactionClient) => {
    const nextTitle = title || 'Untitled Diagram';
    const nextContent = content || 'graph TD\n    A[Start] --> B[End]';

    const createdDiagram = await tx.diagram.create({
      data: {
        id: diagramId,
        title: nextTitle,
        emoji: emoji || getRandomEmoji(),
        createdAt: now,
        updatedAt: now,
        isFavorite: false,
        searchVector: buildSearchVector(nextTitle, nextContent),
      },
    });

    await tx.content.create({
      data: {
        id: contentId,
        diagramId,
        content: nextContent,
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

  const diagram = await withTx(async (tx: TransactionClient) => {
    const latestContent = await tx.content.findFirst({
      where: { diagramId: id },
      orderBy: { updatedAt: 'desc' },
    });

    const nextTitle = updates.title ?? existing.title;
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
          const found = await tx.content.findUnique({ where: { id: candidate }, select: { id: true } });
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
      }
    }

    await tx.diagram.update({
      where: { id },
      data: {
        title: nextTitle,
        emoji: updates.emoji ?? existing.emoji,
        isFavorite: typeof updates.isFavorite === 'boolean' ? updates.isFavorite : existing.isFavorite,
        updatedAt: now,
        searchVector: buildSearchVector(nextTitle, nextContent),
      },
    });

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

  const result = await withTx(async (tx: TransactionClient) => {
    const nextTitle = payload.title ?? existing.title;
    const nextContent = payload.content;

    await tx.diagram.update({
      where: { id: diagramId },
      data: {
        title: nextTitle,
        emoji: payload.emoji ?? existing.emoji,
        isFavorite:
          typeof payload.isFavorite === 'boolean' ? payload.isFavorite : existing.isFavorite,
        updatedAt: now,
        searchVector: buildSearchVector(nextTitle, nextContent),
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

      const searchVector = buildSearchVector(diagram.title, diagram.content);

      await tx.diagram.create({
        data: {
          id: diagram.id,
          title: diagram.title,
          emoji: diagram.emoji,
          createdAt,
          updatedAt,
          isFavorite: diagram.isFavorite,
          searchVector,
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
