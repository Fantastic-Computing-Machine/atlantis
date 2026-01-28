import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type ActivityDay = {
    date: string;
    notes: number;
    diagrams: number;
};

export async function GET() {
    try {
        // Fetch total counts
        const [totalNotes, totalDiagrams, totalTags] = await Promise.all([
            prisma.note.count(),
            prisma.diagram.count(),
            prisma.tag.count(),
        ]);

        // Calculate activity for the last 30 days
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        // Fetch notes and diagrams updated in the last 30 days
        const [recentNotes, recentDiagrams] = await Promise.all([
            prisma.note.findMany({
                where: { updatedAt: { gte: thirtyDaysAgo } },
                select: { updatedAt: true },
            }),
            prisma.diagram.findMany({
                where: { updatedAt: { gte: thirtyDaysAgo } },
                select: { updatedAt: true },
            }),
        ]);

        // Build activity map for the last 30 days
        const activityMap = new Map<string, { notes: number; diagrams: number }>();

        // Initialize all 30 days with zeros
        for (let i = 0; i < 30; i++) {
            const date = new Date(thirtyDaysAgo);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            activityMap.set(dateStr, { notes: 0, diagrams: 0 });
        }

        // Count notes per day
        for (const note of recentNotes) {
            const dateStr = note.updatedAt.toISOString().split('T')[0];
            const existing = activityMap.get(dateStr);
            if (existing) {
                existing.notes++;
            }
        }

        // Count diagrams per day
        for (const diagram of recentDiagrams) {
            const dateStr = diagram.updatedAt.toISOString().split('T')[0];
            const existing = activityMap.get(dateStr);
            if (existing) {
                existing.diagrams++;
            }
        }

        // Convert map to sorted array
        const activity: ActivityDay[] = Array.from(activityMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, counts]) => ({ date, ...counts }));

        return NextResponse.json({
            totalNotes,
            totalDiagrams,
            totalTags,
            activity,
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch statistics' },
            { status: 500 }
        );
    }
}
