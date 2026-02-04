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
    // Fetch more tags than needed since DB orders by diagram count only,
    // but we want to sort by combined diagram + note count
    const tags = await prisma.tag.findMany({
        include: {
            _count: {
                select: { diagrams: true, notes: true },
            },
        },
        orderBy: {
            diagrams: { _count: 'desc' },
        },
        take: limit * 2, // Fetch extra to ensure we get true top tags after re-sorting
    });

    return tags
        .map((tag) => ({
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            color: tag.color,
            count: tag._count.diagrams + tag._count.notes,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit); // Take only the requested limit after sorting
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
 * Uses Fisher-Yates shuffle for unbiased random sampling.
 */
export async function getRandomRediscovery(limit = 2): Promise<ActivityItem[]> {
    // Fetch all IDs with minimal data for random sampling
    const [diagrams, notes] = await Promise.all([
        prisma.diagram.findMany({
            select: { id: true, title: true, emoji: true, updatedAt: true },
        }),
        prisma.note.findMany({
            select: { id: true, title: true, emoji: true, updatedAt: true },
        }),
    ]);

    const items: ActivityItem[] = [
        ...diagrams.map((diagram) => ({
            id: diagram.id,
            title: diagram.title,
            emoji: diagram.emoji,
            type: 'diagram' as const,
            updatedAt: diagram.updatedAt.toISOString(),
        })),
        ...notes.map((note) => ({
            id: note.id,
            title: note.title,
            emoji: note.emoji,
            type: 'note' as const,
            updatedAt: note.updatedAt.toISOString(),
        })),
    ];

    // Fisher-Yates shuffle for unbiased random ordering
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }

    return items.slice(0, limit);
}

/**
 * Get knowledge base stats (depth metrics).
 */
export async function getKnowledgeStats(): Promise<KnowledgeStats> {
    const [
        totalCheckpoints,
        diagramStats,
        oldestDiagram,
        newestDiagram,
        oldestNote,
        newestNote,
        diagramCount,
        noteCount,
    ] = await Promise.all([
        prisma.content.count(),
        prisma.diagram.aggregate({ _avg: { totalVersions: true } }),
        prisma.diagram.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
        prisma.diagram.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
        prisma.note.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
        prisma.note.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
        prisma.diagram.count(),
        prisma.note.count(),
    ]);

    // Find the true oldest and newest across both diagrams and notes
    const oldestDates = [oldestDiagram?.createdAt, oldestNote?.createdAt].filter(Boolean) as Date[];
    const newestDates = [newestDiagram?.createdAt, newestNote?.createdAt].filter(Boolean) as Date[];

    const oldest = oldestDates.length > 0 ? new Date(Math.min(...oldestDates.map(d => d.getTime()))) : null;
    const newest = newestDates.length > 0 ? new Date(Math.max(...newestDates.map(d => d.getTime()))) : null;

    return {
        totalCheckpoints,
        avgVersionsPerDiagram: Math.round((diagramStats._avg.totalVersions || 0) * 10) / 10,
        oldestItemDate: oldest?.toISOString() || null,
        newestItemDate: newest?.toISOString() || null,
        totalContentItems: diagramCount + noteCount,
    };
}

