import { prisma } from './prisma';

export interface DashboardStats {
    totalDiagrams: number;
    totalNotes: number;
    totalTags: number;
    starredItems: number;
}

export interface TopTag {
    id: string;
    name: string;
    slug: string;
    color: string;
    count: number;
}

export interface FiletypeStats {
    language: string;
    count: number;
}

export interface TodoItem {
    text: string;
    noteId: string;
    noteTitle: string;
}

export interface ActivityItem {
    id: string;
    title: string;
    emoji: string;
    type: 'diagram' | 'note';
    updatedAt: string;
}

export interface StaleItem {
    id: string;
    title: string;
    emoji: string;
    type: 'diagram' | 'note';
    daysSinceUpdate: number;
}

export interface KnowledgeStats {
    totalCheckpoints: number;
    avgVersionsPerDiagram: number;
    oldestItemDate: string | null;
    newestItemDate: string | null;
    totalContentItems: number;
}

/**
 * Get aggregated dashboard stats (counts).
 */
export async function getDashboardStats(): Promise<DashboardStats> {
    const [totalDiagrams, totalNotes, totalTags, starredDiagrams, starredNotes] = await Promise.all([
        prisma.diagram.count(),
        prisma.note.count(),
        prisma.tag.count(),
        prisma.diagram.count({ where: { isFavorite: true } }),
        prisma.note.count({ where: { starred: true } }),
    ]);

    return {
        totalDiagrams,
        totalNotes,
        totalTags,
        starredItems: starredDiagrams + starredNotes,
    };
}

/**
 * Get the most used tags, sorted by usage count.
 */
export async function getTopTags(limit = 6): Promise<TopTag[]> {
    const tags = await prisma.tag.findMany({
        include: {
            _count: {
                select: { diagrams: true, notes: true },
            },
        },
        orderBy: {
            diagrams: { _count: 'desc' },
        },
        take: limit,
    });

    return tags
        .map((tag) => ({
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            color: tag.color,
            count: tag._count.diagrams + tag._count.notes,
        }))
        .sort((a, b) => b.count - a.count);
}

/**
 * Get filetype distribution from notes.
 */
export async function getFiletypeStats(limit = 5): Promise<FiletypeStats[]> {
    const notes = await prisma.note.groupBy({
        by: ['language'],
        _count: { language: true },
        orderBy: { _count: { language: 'desc' } },
        take: limit,
    });

    return notes.map((n) => ({
        language: n.language,
        count: n._count.language,
    }));
}

/**
 * Extract incomplete todos from recent notes.
 */
export async function getRecentTodos(limit = 5): Promise<TodoItem[]> {
    const recentNotes = await prisma.note.findMany({
        where: {
            content: { contains: '[ ]' },
        },
        select: {
            id: true,
            title: true,
            content: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
    });

    const todos: TodoItem[] = [];
    const todoRegex = /^\s*[-*+]\s*\[\s\]\s*(.+)$/gm;

    for (const note of recentNotes) {
        let match;
        while ((match = todoRegex.exec(note.content)) !== null) {
            todos.push({
                text: match[1].trim(),
                noteId: note.id,
                noteTitle: note.title,
            });
            if (todos.length >= limit) break;
        }
        if (todos.length >= limit) break;
    }

    return todos;
}

/**
 * Get recent activity (items edited today or recently).
 */
export async function getRecentActivity(limit = 5): Promise<ActivityItem[]> {
    const [diagrams, notes] = await Promise.all([
        prisma.diagram.findMany({
            orderBy: { updatedAt: 'desc' },
            take: limit,
            select: { id: true, title: true, emoji: true, updatedAt: true },
        }),
        prisma.note.findMany({
            orderBy: { updatedAt: 'desc' },
            take: limit,
            select: { id: true, title: true, emoji: true, updatedAt: true },
        }),
    ]);

    const combined: ActivityItem[] = [
        ...diagrams.map((d) => ({
            id: d.id,
            title: d.title,
            emoji: d.emoji,
            type: 'diagram' as const,
            updatedAt: d.updatedAt.toISOString(),
        })),
        ...notes.map((n) => ({
            id: n.id,
            title: n.title,
            emoji: n.emoji,
            type: 'note' as const,
            updatedAt: n.updatedAt.toISOString(),
        })),
    ];

    return combined
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, limit);
}

/**
 * Get stale content (not updated in X days).
 */
export async function getStaleContent(daysThreshold = 30, limit = 3): Promise<StaleItem[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

    const [diagrams, notes] = await Promise.all([
        prisma.diagram.findMany({
            where: { updatedAt: { lt: cutoffDate } },
            orderBy: { updatedAt: 'asc' },
            take: limit,
            select: { id: true, title: true, emoji: true, updatedAt: true },
        }),
        prisma.note.findMany({
            where: { updatedAt: { lt: cutoffDate } },
            orderBy: { updatedAt: 'asc' },
            take: limit,
            select: { id: true, title: true, emoji: true, updatedAt: true },
        }),
    ]);

    const now = new Date();
    const combined: StaleItem[] = [
        ...diagrams.map((d) => ({
            id: d.id,
            title: d.title,
            emoji: d.emoji,
            type: 'diagram' as const,
            daysSinceUpdate: Math.floor((now.getTime() - d.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
        })),
        ...notes.map((n) => ({
            id: n.id,
            title: n.title,
            emoji: n.emoji,
            type: 'note' as const,
            daysSinceUpdate: Math.floor((now.getTime() - n.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
        })),
    ];

    return combined
        .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate)
        .slice(0, limit);
}

/**
 * Get random items for rediscovery.
 */
export async function getRandomRediscovery(limit = 2): Promise<ActivityItem[]> {
    // Simple approach: get all IDs and pick random ones
    const [diagramCount, noteCount] = await Promise.all([
        prisma.diagram.count(),
        prisma.note.count(),
    ]);

    const results: ActivityItem[] = [];

    if (diagramCount > 0) {
        const skip = Math.floor(Math.random() * diagramCount);
        const diagram = await prisma.diagram.findFirst({
            skip,
            select: { id: true, title: true, emoji: true, updatedAt: true },
        });
        if (diagram) {
            results.push({
                id: diagram.id,
                title: diagram.title,
                emoji: diagram.emoji,
                type: 'diagram',
                updatedAt: diagram.updatedAt.toISOString(),
            });
        }
    }

    if (noteCount > 0) {
        const skip = Math.floor(Math.random() * noteCount);
        const note = await prisma.note.findFirst({
            skip,
            select: { id: true, title: true, emoji: true, updatedAt: true },
        });
        if (note) {
            results.push({
                id: note.id,
                title: note.title,
                emoji: note.emoji,
                type: 'note',
                updatedAt: note.updatedAt.toISOString(),
            });
        }
    }

    return results.slice(0, limit);
}

/**
 * Get knowledge base stats (depth metrics).
 */
export async function getKnowledgeStats(): Promise<KnowledgeStats> {
    const [totalCheckpoints, diagramStats, oldest, newest] = await Promise.all([
        prisma.content.count(),
        prisma.diagram.aggregate({ _avg: { totalVersions: true } }),
        prisma.diagram.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
        prisma.diagram.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    ]);

    const [diagramCount, noteCount] = await Promise.all([
        prisma.diagram.count(),
        prisma.note.count(),
    ]);

    return {
        totalCheckpoints,
        avgVersionsPerDiagram: Math.round((diagramStats._avg.totalVersions || 0) * 10) / 10,
        oldestItemDate: oldest?.createdAt.toISOString() || null,
        newestItemDate: newest?.createdAt.toISOString() || null,
        totalContentItems: diagramCount + noteCount,
    };
}

