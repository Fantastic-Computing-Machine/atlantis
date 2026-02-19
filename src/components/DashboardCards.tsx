'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { DashboardCardMenu } from '@/components/DashboardCardMenu';
import { TagBadge } from '@/components/TagBadge';
import { formatDate, cn } from '@/lib/utils';
import { Diagram, Note, Canvas } from '@/lib/types';
import { ArrowRight } from 'lucide-react';

export function CompactCard({
    type,
    item,
}: {
    type: 'diagram' | 'note' | 'canvas';
    item: Diagram | Omit<Note, 'content'> | Omit<Canvas, 'content'>;
}) {
    let href = '';
    let icon = item.emoji;

    if (type === 'diagram') {
        href = `/diagram/${item.id}`;
        icon = icon || '📊';
    } else if (type === 'note') {
        href = `/notes/${item.id}`;
        icon = icon || '📝';
    } else {
        href = `/canvas/${item.id}`;
        icon = icon || '🎨';
    }

    return (
        <Link
            href={href}
            className="flex shrink-0 items-center gap-1.5 rounded-md border bg-card px-2 py-1.5 text-xs transition-colors"
        >
            <span className="text-base">{icon}</span>
            <span className="truncate max-w-[100px]">{item.title}</span>
        </Link>
    );
}

export function DashboardCard({
    type,
    item,
}: {
    type: 'diagram' | 'note' | 'canvas';
    item: Diagram | Omit<Note, 'content'> | Omit<Canvas, 'content'>;
}) {
    let href = '';
    let icon = item.emoji;
    let description = '';
    let badgeLabel = '';
    let isStarred = false;
    let badgeClass = '';

    if (type === 'diagram') {
        const d = item as Diagram;
        href = `/diagram/${d.id}`;
        icon = icon || '📊';
        description = d.description || 'No description';
        badgeLabel = 'Diagram';
        isStarred = d.isFavorite;
        badgeClass = 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    } else if (type === 'note') {
        const n = item as Omit<Note, 'content'>;
        href = `/notes/${n.id}`;
        icon = icon || '📝';
        description = `Language // ${n.language}`;
        badgeLabel = 'Note';
        isStarred = n.starred;
        badgeClass = 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300';
    } else {
        const c = item as Omit<Canvas, 'content'>;
        href = `/canvas/${c.id}`;
        icon = icon || '🎨';
        description = 'Freeform Canvas';
        badgeLabel = 'Canvas';
        isStarred = c.isFavorite;
        badgeClass = 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
    }

    return (
        <Card className="relative h-full overflow-hidden flex flex-col">
            <Link href={href} className="absolute inset-0 z-0 focus:outline-none">
                <span className="sr-only">View {item.title}</span>
            </Link>
            <CardHeader className="p-3 relative z-10 pointer-events-none">
                <div className="flex items-center justify-between gap-2">
                    {/* Left: emoji + title + badge */}
                    <div className="flex min-w-0 items-center gap-2 flex-1">
                        <span className="shrink-0 text-xl">{icon}</span>
                        <div className="min-w-0 overflow-hidden flex-1">
                            <div className="flex items-center gap-2">
                                <CardTitle className="truncate text-sm">{item.title}</CardTitle>
                                <span
                                    className={cn(
                                        'shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
                                        badgeClass
                                    )}
                                >
                                    {badgeLabel}
                                </span>
                            </div>
                            <CardDescription className="truncate text-xs mt-0.5">
                                {formatDate(item.updatedAt)}
                            </CardDescription>
                        </div>
                    </div>
                    {/* Right: 3-dot menu */}
                    <div className="pointer-events-auto shrink-0">
                        <DashboardCardMenu
                            id={item.id}
                            title={item.title}
                            type={type}
                            isStarred={isStarred ?? false}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2 flex-1 relative z-10 pointer-events-none">
                <p className="text-muted-foreground line-clamp-1 text-xs">
                    {description}
                </p>
                {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pointer-events-auto">
                        {item.tags.slice(0, 2).map((tag) => (
                            <TagBadge key={tag.id} tag={tag} />
                        ))}
                        {item.tags.length > 2 && (
                            <span className="text-xs text-muted-foreground">+{item.tags.length - 2}</span>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function EmptySectionPlaceholder({
    icon,
    title,
    description,
    ctaLabel,
    ctaHref,
}: {
    icon: ReactNode;
    title: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
}) {
    return (
        <div className="border-muted-foreground/40 bg-muted/20 flex flex-col gap-2 rounded-lg border border-dashed p-3">
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                <span className="bg-background text-primary border-border flex h-6 w-6 items-center justify-center rounded-full border">
                    {icon}
                </span>
                {title}
            </div>
            <p className="text-muted-foreground text-xs">{description}</p>
            <Link
                href={ctaHref}
                className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
            >
                {ctaLabel}
                <ArrowRight className="h-3 w-3" />
            </Link>
        </div>
    );
}
