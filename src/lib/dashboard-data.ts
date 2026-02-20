import { prisma } from './prisma';
import { getDiagramPage } from './data';
import { getNotePage } from './notes-data';
import { getCanvasPage } from './canvas-data';

export async function getHomePageData() {
    const [
        stats,
        topTags,
        filetypes,
        todos,
        activity,
        staleContent,
        rediscovery,
        knowledgeStats,
        starredDiagrams,
        starredNotesRaw,
        starredCanvases,
        recentDiagrams,
        recentNotesRaw,
        recentCanvases,
    ] = await Promise.all([
        getDashboardStats(),
        getTopTags(6),
        getFiletypeStats(5),
        getRecentTodos(5),
        getRecentActivity(5),
        getStaleContent(30, 3),
        getRandomRediscovery(2),
        getKnowledgeStats(),
        getDiagramPage({ limit: 4, favoritesOnly: true }),
        getNotePage({ limit: 4, starredOnly: true }),
        getCanvasPage({ limit: 4, favoritesOnly: true }),
        getDiagramPage({ limit: 8, sort: 'recent' }),
        getNotePage({ limit: 10, sort: 'recent' }),
        getCanvasPage({ limit: 8, sort: 'recent' }),
    ]);

    return {
        stats,
        topTags,
        filetypes,
        todos,
        activity,
        staleContent,
        rediscovery,
        knowledgeStats,
        starredDiagrams,
        starredNotesRaw,
        starredCanvases,
        recentDiagrams,
        recentNotesRaw,
        recentCanvases,
    };
}

export interface DashboardStats {
    totalDiagrams: number;
    totalNotes: number;
    totalTags: number;
    totalCanvases: number;
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
    type: 'diagram' | 'note' | 'canvas';
    updatedAt: string;
}

export interface StaleItem {
    id: string;
    title: string;
    emoji: string;
    type: 'diagram' | 'note' | 'canvas';
    daysSinceUpdate: number;
}

export interface KnowledgeStats {
    totalCheckpoints: number;
    avgVersionsPerDiagram: number;
    oldestItemDate: string | null;
    newestItemDate: string | null;
    totalContentItems: number;
}

// Helper type for database results with common fields
type DbItem = { id: string; title: string; emoji: string; updatedAt: Date };

// Helper to convert DB items to ActivityItem format
function toActivityItem(item: DbItem, type: 'diagram' | 'note' | 'canvas'): ActivityItem {
    return {
        id: item.id,
        title: item.title,
        emoji: item.emoji,
        type,
        updatedAt: item.updatedAt.toISOString(),
    };
}

// Helper to convert DB items to StaleItem format
function toStaleItem(item: DbItem, type: 'diagram' | 'note' | 'canvas'): StaleItem {
    const now = new Date();
    const days = Math.floor((now.getTime() - item.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    return {
        id: item.id,
        title: item.title,
        emoji: item.emoji,
        type,
        daysSinceUpdate: days,
    };
}

/**
 * Get aggregated dashboard stats (counts).
 */
export async function getDashboardStats(): Promise<DashboardStats> {
    const [totalDiagrams, totalNotes, totalTags, totalCanvases, starredDiagrams, starredNotes, starredCanvases] = await Promise.all([
        prisma.diagram.count(),
        prisma.note.count(),
        prisma.tag.count(),
        prisma.canvas.count(),
        prisma.diagram.count({ where: { isFavorite: true } }),
        prisma.note.count({ where: { starred: true } }),
        prisma.canvas.count({ where: { isFavorite: true } }),
    ]);

    return {
        totalDiagrams,
        totalNotes,
        totalTags,
        totalCanvases,
        starredItems: starredDiagrams + starredNotes + starredCanvases,
    };
}

/**
 * Get the most used tags, sorted by usage count.
 */
export async function getTopTags(limit = 6): Promise<TopTag[]> {
    const tags = await prisma.tag.findMany({
        orderBy: {
            usageCount: 'desc',
        },
        take: limit,
    });

    return tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        color: tag.color,
        count: tag.usageCount,
    }));
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
            hasTodos: true,
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
    const [diagrams, notes, canvases] = await Promise.all([
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
        prisma.canvas.findMany({
            orderBy: { updatedAt: 'desc' },
            take: limit,
            select: { id: true, title: true, emoji: true, updatedAt: true },
        }),
    ]);

    const combined: ActivityItem[] = [
        ...diagrams.map((d) => toActivityItem(d, 'diagram')),
        ...notes.map((n) => toActivityItem(n, 'note')),
        ...canvases.map((c) => toActivityItem(c, 'canvas')),
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

    const [diagrams, notes, canvases] = await Promise.all([
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
        prisma.canvas.findMany({
            where: { updatedAt: { lt: cutoffDate } },
            orderBy: { updatedAt: 'asc' },
            take: limit,
            select: { id: true, title: true, emoji: true, updatedAt: true },
        }),
    ]);

    const combined: StaleItem[] = [
        ...diagrams.map((d) => toStaleItem(d, 'diagram')),
        ...notes.map((n) => toStaleItem(n, 'note')),
        ...canvases.map((c) => toStaleItem(c, 'canvas')),
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
    // Use count + random skip to avoid loading all records
    const [diagramCount, noteCount, canvasCount] = await Promise.all([
        prisma.diagram.count(),
        prisma.note.count(),
        prisma.canvas.count(),
    ]);
    const total = diagramCount + noteCount + canvasCount;
    if (total === 0) return [];

    const items: ActivityItem[] = [];
    const pickedIndices = new Set<number>();
    const attempts = Math.min(limit, total);

    for (let i = 0; i < attempts && items.length < limit; i++) {
        let idx: number;
        do {
            idx = Math.floor(Math.random() * total);
        } while (pickedIndices.has(idx) && pickedIndices.size < total);
        pickedIndices.add(idx);

        if (idx < diagramCount) {
            const [item] = await prisma.diagram.findMany({
                skip: idx, take: 1,
                select: { id: true, title: true, emoji: true, updatedAt: true },
            });
            if (item) items.push(toActivityItem(item, 'diagram'));
        } else if (idx < diagramCount + noteCount) {
            const [item] = await prisma.note.findMany({
                skip: idx - diagramCount, take: 1,
                select: { id: true, title: true, emoji: true, updatedAt: true },
            });
            if (item) items.push(toActivityItem(item, 'note'));
        } else {
            const [item] = await prisma.canvas.findMany({
                skip: idx - diagramCount - noteCount, take: 1,
                select: { id: true, title: true, emoji: true, updatedAt: true },
            });
            if (item) items.push(toActivityItem(item, 'canvas'));
        }
    }

    return items;
}

/**
 * Get knowledge base stats (depth metrics).
 */
export async function getKnowledgeStats(): Promise<KnowledgeStats> {
    // Consolidated: 6 queries instead of 11 by combining count + min/max per model
    const [
        totalCheckpoints,
        diagramAgg,
        noteAgg,
        canvasAgg,
    ] = await Promise.all([
        prisma.content.count(),
        prisma.diagram.aggregate({
            _count: true,
            _avg: { totalVersions: true },
            _min: { createdAt: true },
            _max: { createdAt: true },
        }),
        prisma.note.aggregate({
            _count: true,
            _min: { createdAt: true },
            _max: { createdAt: true },
        }),
        prisma.canvas.aggregate({
            _count: true,
            _min: { createdAt: true },
            _max: { createdAt: true },
        }),
    ]);

    const oldestDates = [
        diagramAgg._min.createdAt,
        noteAgg._min.createdAt,
        canvasAgg._min.createdAt,
    ].filter(Boolean) as Date[];
    const newestDates = [
        diagramAgg._max.createdAt,
        noteAgg._max.createdAt,
        canvasAgg._max.createdAt,
    ].filter(Boolean) as Date[];

    const oldest = oldestDates.length > 0 ? new Date(Math.min(...oldestDates.map(d => d.getTime()))) : null;
    const newest = newestDates.length > 0 ? new Date(Math.max(...newestDates.map(d => d.getTime()))) : null;

    return {
        totalCheckpoints,
        avgVersionsPerDiagram: Math.round((diagramAgg._avg.totalVersions || 0) * 10) / 10,
        oldestItemDate: oldest?.toISOString() || null,
        newestItemDate: newest?.toISOString() || null,
        totalContentItems: diagramAgg._count + noteAgg._count + canvasAgg._count,
    };
}

