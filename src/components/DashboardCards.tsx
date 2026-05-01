'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { DashboardCardMenu } from '@/components/DashboardCardMenu';
import { TagBadge } from '@/components/TagBadge';
import { formatDate, cn } from '@/lib/utils';
import { Diagram, Note } from '@/lib/types';
import { ArrowRight } from 'lucide-react';

export function CompactCard({
  type,
  item,
}: {
  type: 'diagram' | 'note';
  item: Diagram | Omit<Note, 'content'>;
}) {
  const href = type === 'diagram' ? `/diagram/${item.id}` : `/notes/${item.id}`;
  const icon = item.emoji || (type === 'diagram' ? '📊' : '📝');

  return (
    <Link
      href={href}
      className="bg-card flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors"
    >
      <span className="text-base">{icon}</span>
      <span className="max-w-[100px] truncate">{item.title}</span>
    </Link>
  );
}

export function DashboardCard({
  type,
  item,
}: {
  type: 'diagram' | 'note';
  item: Diagram | Omit<Note, 'content'>;
}) {
  const href = type === 'diagram' ? `/diagram/${item.id}` : `/notes/${item.id}`;
  const icon = item.emoji || (type === 'diagram' ? '📊' : '📝');
  const description = type === 'diagram' ? (item as Diagram).description : (item as Note).language;
  const badgeLabel = type === 'diagram' ? 'Diagram' : 'Note';
  const isStarred =
    type === 'diagram' ? (item as Diagram).isFavorite : (item as Omit<Note, 'content'>).starred;

  return (
    <Card className="relative flex h-full flex-col overflow-hidden">
      <Link href={href} className="absolute inset-0 z-0 focus:outline-none">
        <span className="sr-only">View {item.title}</span>
      </Link>
      <CardHeader className="pointer-events-none relative z-10 p-3">
        <div className="flex items-center justify-between gap-2">
          {/* Left: emoji + title + badge */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 text-xl">{icon}</span>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-2">
                <CardTitle className="truncate text-sm">{item.title}</CardTitle>
                <span
                  className={cn(
                    'shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
                    type === 'diagram'
                      ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
                  )}
                >
                  {badgeLabel}
                </span>
              </div>
              <CardDescription className="mt-0.5 truncate text-xs">
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
      <CardContent className="pointer-events-none relative z-10 flex-1 space-y-2 p-3 pt-0">
        <p className="text-muted-foreground line-clamp-1 text-xs">
          {type === 'diagram' ? description || 'No description' : `Language // ${description}`}
        </p>
        {item.tags && item.tags.length > 0 && (
          <div className="pointer-events-auto flex flex-wrap gap-1">
            {item.tags.slice(0, 2).map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
            {item.tags.length > 2 && (
              <span className="text-muted-foreground text-xs">+{item.tags.length - 2}</span>
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
