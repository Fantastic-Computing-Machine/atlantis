'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Diagram, Note } from '@/lib/types';
import { DashboardCard, EmptySectionPlaceholder } from './DashboardCards';

interface DashboardSectionProps {
    items: (Diagram | Omit<Note, 'content'>)[];
    title: string;
    icon: React.ReactNode;
    viewAllHref: string;
    type: 'diagram' | 'note';
    emptyState: {
        icon: React.ReactNode;
        title: string;
        description: string;
        ctaHref: string;
        ctaLabel: string;
    };
}

function isToday(dateStr: string): boolean {
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

function groupByTime<T extends { updatedAt: string }>(items: T[]) {
    const today: T[] = [];
    const earlier: T[] = [];
    for (const item of items) {
        if (isToday(item.updatedAt)) {
            today.push(item);
        } else {
            earlier.push(item);
        }
    }
    return { today, earlier };
}

export function DashboardSection({
    items,
    title,
    icon,
    viewAllHref,
    type,
    emptyState,
}: DashboardSectionProps) {
    const { today, earlier } = groupByTime(items);

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    {icon}
                    {title} <span className="opacity-50">{'//'}</span>{' '}
                    <span className="text-foreground">{items.length}</span>
                </h3>
                <Link
                    href={viewAllHref}
                    className="text-primary flex items-center gap-1 text-[10px] hover:underline"
                >
                    View all <ArrowRight className="h-3 w-3" />
                </Link>
            </div>
            {items.length > 0 ? (
                <div className="space-y-4">
                    {/* Today */}
                    {today.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                Today
                            </p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {today.map((item) => (
                                    <DashboardCard key={item.id} type={type} item={item} />
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Earlier */}
                    {earlier.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                Earlier
                            </p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {earlier.map((item) => (
                                    <DashboardCard key={item.id} type={type} item={item} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <EmptySectionPlaceholder
                    icon={emptyState.icon}
                    title={emptyState.title}
                    description={emptyState.description}
                    ctaHref={emptyState.ctaHref}
                    ctaLabel={emptyState.ctaLabel}
                />
            )}
        </section>
    );
}
