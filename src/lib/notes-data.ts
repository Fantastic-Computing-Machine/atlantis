import type { Prisma } from '@prisma/client';

import { buildSearchVector } from './search';
import { prisma } from './prisma';
import type { Note, NotePage, NoteSortOption } from './types';
import { generateNoteId, getRandomEmoji } from './utils';

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;
const MAX_TAGS_PER_ITEM = 3;
const TITLE_MAX = 200;

type TagRow = { id: string; name: string; slug: string; color: string };
type NoteRow = Prisma.NoteGetPayload<object> & { tags?: TagRow[] };

const normalizeLimit = (limit?: number | null) => {
  if (!Number.isFinite(limit)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(limit as number), 1), MAX_PAGE_SIZE);
};

const normalizeOffset = (offset?: number | null) => {
  if (!Number.isFinite(offset)) return 0;
  return Math.max(Math.trunc(offset as number), 0);
};

const mapTagIds = (ids: string[]) => ids.map((tagId) => ({ id: tagId }));

const buildNoteSearchVector = (title: string, content: string): string =>
  buildSearchVector(title, undefined, content);

const toNote = (row: NoteRow): Note => ({
  id: row.id,
  title: row.title,
  content: row.content,
  language: row.language,
  emoji: row.emoji,
  starred: row.starred,
  private: row.private,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  tags: row.tags,
});

const toNoteListItem = (row: NoteRow): Omit<Note, 'content'> => ({
  id: row.id,
  title: row.title,
  language: row.language,
  emoji: row.emoji,
  starred: row.starred,
  private: row.private,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  tags: row.tags,
});

const validateNoteLengths = (title?: string) => {
  if (typeof title === 'string' && title.length > TITLE_MAX) {
    throw new Error(`Title exceeds ${TITLE_MAX} characters`);
  }
};

const isNotFoundError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2025';

async function ensureUniqueNoteId(): Promise<string> {
  let id = generateNoteId();
  let existing = await prisma.note.findUnique({ where: { id }, select: { id: true } });
  while (existing) {
    id = generateNoteId();
    existing = await prisma.note.findUnique({ where: { id }, select: { id: true } });
  }
  return id;
}

export async function getNotePage({
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  query,
  sort = 'recent',
  starredOnly = false,
  tagSlug,
  metadataOnly = false,
}: {
  limit?: number;
  offset?: number;
  query?: string;
  sort?: NoteSortOption;
  starredOnly?: boolean;
  tagSlug?: string;
  metadataOnly?: boolean;
}): Promise<NotePage> {
  const normalizedLimit = normalizeLimit(limit);
  const normalizedOffset = normalizeOffset(offset);

  const buildSafeTsQuery = (value: string) =>
    value
      .split(/\s+/)
      .map((token) => token.replace(/[^a-zA-Z0-9_]/g, ''))
      .filter(Boolean)
      .join(' & ');

  const where: Prisma.NoteWhereInput = {};
  if (query?.trim()) {
    const cleanQuery = query.trim().toLowerCase();
    const isPostgres =
      process.env.PRISMA_PROVIDER === 'postgresql' ||
      process.env.DATABASE_URL?.startsWith('postgres');

    if (isPostgres) {
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
  if (starredOnly) {
    where.starred = true;
  }
  if (tagSlug) {
    where.tags = { some: { slug: tagSlug } };
  }

  const orderBy: Prisma.NoteOrderByWithRelationInput = (() => {
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

  const findManyArgs: Prisma.NoteFindManyArgs = {
    where,
    orderBy,
    skip: normalizedOffset,
    take: normalizedLimit,
  };

  if (metadataOnly) {
    findManyArgs.select = { id: true, updatedAt: true };
  } else {
    findManyArgs.include = { tags: true };
  }

  const [notes, total] = await Promise.all([
    prisma.note.findMany(findManyArgs),
    prisma.note.count({ where }),
  ]);

  const items = notes.map((n) => {
    if (metadataOnly) {
      // Return minimal object for sync comparison
      return {
        id: n.id,
        updatedAt: n.updatedAt.toISOString(),
        title: '',
        language: '',
        emoji: '',
        starred: false,
        private: false,
        createdAt: new Date().toISOString(), // Dummy
        tags: [],
      };
    }
    return toNoteListItem(n as NoteRow);
  });

  const nextOffset = normalizedOffset + items.length;
  const hasMore = nextOffset < total;

  return { items, total, hasMore, nextOffset };
}

export async function getNoteById(id: string): Promise<Note | null> {
  const note = await prisma.note.findUnique({
    where: { id },
    include: { tags: true },
  });
  if (!note) return null;
  return toNote(note);
}

export async function getNoteUpdatedAt(id: string): Promise<{ updatedAt: string } | null> {
  const note = await prisma.note.findUnique({
    where: { id },
    select: { updatedAt: true },
  });
  if (!note) return null;
  return { updatedAt: note.updatedAt.toISOString() };
}

const TODO_REGEX = /^\s*[-*+]\s*\[\s\]/m;

export async function createNote({
  title,
  content,
  language,
  tags,
}: {
  title?: string;
  content?: string;
  language?: string;
  tags?: string[];
}): Promise<Note> {
  const now = new Date();
  validateNoteLengths(title);

  if (tags && tags.length > MAX_TAGS_PER_ITEM) {
    throw new Error(`Cannot add more than ${MAX_TAGS_PER_ITEM} tags`);
  }

  const noteId = await ensureUniqueNoteId();
  const nextTitle = title || 'Untitled Note';
  const nextContent = content || '';
  const nextLanguage = language || 'txt';
  const hasTodos = TODO_REGEX.test(nextContent);

  const note = await prisma.$transaction(async (tx) => {
    const created = await tx.note.create({
      data: {
        id: noteId,
        title: nextTitle,
        content: nextContent,
        language: nextLanguage,
        emoji: getRandomEmoji(),
        starred: false,
        private: false,
        searchVector: buildNoteSearchVector(nextTitle, nextContent),
        hasTodos,
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

  return toNote(note);
}

export async function updateNoteById(
  id: string,
  updates: Partial<Pick<Note, 'title' | 'content' | 'language' | 'starred' | 'private'>> & {
    tags?: string[];
  }
): Promise<Note | null> {
  const existing = await prisma.note.findUnique({
    where: { id },
    include: { tags: { select: { id: true } } },
  });
  if (!existing) return null;

  validateNoteLengths(updates.title);

  if (updates.tags && updates.tags.length > MAX_TAGS_PER_ITEM) {
    throw new Error(`Cannot add more than ${MAX_TAGS_PER_ITEM} tags`);
  }

  const now = new Date();
  const nextTitle = updates.title ?? existing.title;
  const nextContent = updates.content ?? existing.content;
  const hasTodos = TODO_REGEX.test(nextContent);

  const note = await prisma.$transaction(async (tx) => {
    // Calculate tag diff
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

    const updated = await tx.note.update({
      where: { id },
      data: {
        title: nextTitle,
        content: nextContent,
        language: updates.language ?? existing.language,
        starred: typeof updates.starred === 'boolean' ? updates.starred : existing.starred,
        private: typeof updates.private === 'boolean' ? updates.private : existing.private,
        searchVector: buildNoteSearchVector(nextTitle, nextContent),
        hasTodos,
        updatedAt: now,
        tags: updates.tags ? { set: mapTagIds(updates.tags) } : undefined,
      },
      include: { tags: true },
    });

    return updated;
  });

  return toNote(note);
}

export async function deleteNoteById(id: string): Promise<boolean> {
  try {
    return await prisma.$transaction(async (tx) => {
      const note = await tx.note.findUnique({
        where: { id },
        include: { tags: { select: { id: true } } },
      });

      if (!note) return false;

      if (note.tags.length > 0) {
        await tx.tag.updateMany({
          where: { id: { in: note.tags.map((t) => t.id) } },
          data: { usageCount: { decrement: 1 } },
        });
      }

      await tx.note.delete({ where: { id } });
      return true;
    });
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return false;
    }
    throw error;
  }
}
