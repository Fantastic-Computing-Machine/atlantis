import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { Note, NotePage, NoteSortOption } from './types';
import { generateNoteId, getRandomEmoji } from './utils';

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;
const TITLE_MAX = 200;

type NoteRow = Prisma.NoteGetPayload<object>;

function normalizeLimit(limit?: number | null) {
    if (!Number.isFinite(limit)) return DEFAULT_PAGE_SIZE;
    return Math.min(Math.max(Math.trunc(limit as number), 1), MAX_PAGE_SIZE);
}

function normalizeOffset(offset?: number | null) {
    if (!Number.isFinite(offset)) return 0;
    return Math.max(Math.trunc(offset as number), 0);
}

function toNote(row: NoteRow): Note {
    return {
        id: row.id,
        title: row.title,
        content: row.content,
        language: row.language,
        emoji: row.emoji,
        starred: row.starred,
        private: row.private,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

function toNoteListItem(row: NoteRow): Omit<Note, 'content'> {
    return {
        id: row.id,
        title: row.title,
        language: row.language,
        emoji: row.emoji,
        starred: row.starred,
        private: row.private,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

function buildNoteSearchVector(title: string, content: string): string {
    return `${title} ${content}`.toLowerCase();
}

function validateNoteLengths(title?: string) {
    if (typeof title === 'string' && title.length > TITLE_MAX) {
        throw new Error(`Title exceeds ${TITLE_MAX} characters`);
    }
}

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
}: {
    limit?: number;
    offset?: number;
    query?: string;
    sort?: NoteSortOption;
    starredOnly?: boolean;
}): Promise<NotePage> {
    const normalizedLimit = normalizeLimit(limit);
    const normalizedOffset = normalizeOffset(offset);

    const where: Prisma.NoteWhereInput = {};

    if (query?.trim()) {
        where.searchVector = { contains: query.trim().toLowerCase() };
    }
    if (starredOnly) {
        where.starred = true;
    }

    let orderBy: Prisma.NoteOrderByWithRelationInput = { updatedAt: 'desc' };
    switch (sort) {
        case 'old':
            orderBy = { updatedAt: 'asc' };
            break;
        case 'alphabetical':
            orderBy = { title: 'asc' };
            break;
        case 'recent':
        default:
            orderBy = { updatedAt: 'desc' };
            break;
    }

    const [notes, total] = await Promise.all([
        prisma.note.findMany({
            where,
            orderBy,
            skip: normalizedOffset,
            take: normalizedLimit,
        }),
        prisma.note.count({ where }),
    ]);

    const items = notes.map(toNoteListItem);
    const nextOffset = normalizedOffset + items.length;
    const hasMore = nextOffset < total;

    return { items, total, hasMore, nextOffset };
}

export async function getNoteById(id: string): Promise<Note | null> {
    const note = await prisma.note.findUnique({ where: { id } });
    if (!note) return null;
    return toNote(note);
}

export async function createNote({
    title,
    content,
    language,
}: {
    title?: string;
    content?: string;
    language?: string;
}): Promise<Note> {
    const now = new Date();
    validateNoteLengths(title);

    const noteId = await ensureUniqueNoteId();
    const nextTitle = title || 'Untitled Note';
    const nextContent = content || '';
    const nextLanguage = language || 'txt';

    const note = await prisma.note.create({
        data: {
            id: noteId,
            title: nextTitle,
            content: nextContent,
            language: nextLanguage,
            emoji: getRandomEmoji(),
            starred: false,
            private: false,
            searchVector: buildNoteSearchVector(nextTitle, nextContent),
            createdAt: now,
            updatedAt: now,
        },
    });

    return toNote(note);
}

export async function updateNoteById(
    id: string,
    updates: Partial<Pick<Note, 'title' | 'content' | 'language' | 'starred' | 'private'>>
): Promise<Note | null> {
    const existing = await prisma.note.findUnique({ where: { id } });
    if (!existing) return null;

    validateNoteLengths(updates.title);

    const now = new Date();
    const nextTitle = updates.title ?? existing.title;
    const nextContent = updates.content ?? existing.content;

    const note = await prisma.note.update({
        where: { id },
        data: {
            title: nextTitle,
            content: nextContent,
            language: updates.language ?? existing.language,
            starred: typeof updates.starred === 'boolean' ? updates.starred : existing.starred,
            private: typeof updates.private === 'boolean' ? updates.private : existing.private,
            searchVector: buildNoteSearchVector(nextTitle, nextContent),
            updatedAt: now,
        },
    });

    return toNote(note);
}

export async function deleteNoteById(id: string): Promise<boolean> {
    try {
        await prisma.note.delete({ where: { id } });
        return true;
    } catch (error: unknown) {
        if (typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2025') {
            return false;
        }
        throw error;
    }
}
