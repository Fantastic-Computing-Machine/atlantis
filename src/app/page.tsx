import type { ReactNode } from 'react';
import Link from 'next/link';
import { Star, ArrowRight, FileText, PenSquare } from 'lucide-react';
import { getDiagramPage } from '@/lib/data';
import { getNotePage } from '@/lib/notes-data';
import {
  getDashboardStats,
  getTopTags,
  getFiletypeStats,
  getRecentTodos,
  getRecentActivity,
  getStaleContent,
  getRandomRediscovery,
  getKnowledgeStats,
} from '@/lib/dashboard-data';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate, cn } from '@/lib/utils';
import { Diagram, Note } from '@/lib/types';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Greeting } from '@/components/Greeting';
import { DashboardEmptyState } from '@/components/DashboardEmptyState';
import { TagBadge } from '@/components/TagBadge';
import { DashboardStatsRow, InsightsPanel } from '@/components/InsightsPanel';
import { DashboardCardMenu } from '@/components/DashboardCardMenu';
import { QuickCapture, KeyboardShortcuts } from '@/components/QuickCapture';

export const dynamic = 'force-dynamic';

// Helper to check if date is today
function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

// Helper to group items by time
function groupByTime<T extends { updatedAt: string }>(items: T[]): { today: T[]; earlier: T[] } {
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

export default async function Page() {
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
    recentDiagrams,
    recentNotesRaw,
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
    getDiagramPage({ limit: 8, sort: 'recent' }),
    getNotePage({ limit: 10, sort: 'recent' }),
  ]);

  // Filter out private notes
  const starredNotes = {
    ...starredNotesRaw,
    items: starredNotesRaw.items.filter((n) => !n.private),
  };
  const recentNotes = {
    ...recentNotesRaw,
    items: recentNotesRaw.items.filter((n) => !n.private).slice(0, 8),
  };

  // Group by time
  const diagramGroups = groupByTime(recentDiagrams.items);
  const noteGroups = groupByTime(recentNotes.items);

  const hasStarred = starredDiagrams.items.length > 0 || starredNotes.items.length > 0;
  const hasRecent = recentDiagrams.items.length > 0 || recentNotes.items.length > 0;
  const isCompletelyEmpty = !hasStarred && !hasRecent;

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col font-sans">
      <DashboardHeader enableApiAccess={process.env.ENABLE_API_ACCESS === 'true'} />

      <main className="container mx-auto flex-1 px-4 py-6">
        {isCompletelyEmpty ? (
          <>
            <Greeting />
            <DashboardEmptyState />
          </>
        ) : (
          <div className="space-y-6">
            {/* Header Row */}
            <section className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Greeting />
                  {/* <p className="text-muted-foreground text-sm">
                    Your second brain <span className="opacity-50">//</span> {stats.totalDiagrams + stats.totalNotes} items
                  </p> */}
                </div>
                {/* Quick Actions - always visible */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="icon" className="h-8 w-8" asChild>
                    <Link href="/diagram/new" aria-label="New Diagram">
                      <PenSquare className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="icon" variant="outline" className="h-8 w-8" asChild>
                    <Link href="/notes" aria-label="New Note">
                      <FileText className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              {/* Quick Capture + Stats Row */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <QuickCapture />
                <div className="hidden md:block">
                  <DashboardStatsRow stats={stats} />
                </div>
              </div>
            </section>

            {/* Starred Strip */}
            {hasStarred && (
              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  Starred <span className="opacity-50">{'//'}</span> <span className="text-foreground">{starredDiagrams.items.length + starredNotes.items.length}</span>
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {starredDiagrams.items.map((d) => (
                    <CompactCard key={`d-${d.id}`} type="diagram" item={d} />
                  ))}
                  {starredNotes.items.map((n) => (
                    <CompactCard key={`n-${n.id}`} type="note" item={n} />
                  ))}
                </div>
              </section>
            )}

            {/* Main Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left: Recent Items */}
              <div className="lg:col-span-2 space-y-6">
                {/* Diagrams */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <PenSquare className="h-3.5 w-3.5" />
                      Diagrams <span className="opacity-50">{'//'}</span> <span className="text-foreground">{recentDiagrams.items.length}</span>
                    </h3>
                    <Link
                      href="/diagram"
                      className="text-primary flex items-center gap-1 text-[10px] hover:underline"
                    >
                      View all <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                  {recentDiagrams.items.length > 0 ? (
                    <div className="space-y-4">
                      {/* Today */}
                      {diagramGroups.today.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Today</p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {diagramGroups.today.map((d) => (
                              <DashboardCard key={d.id} type="diagram" item={d} />
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Earlier */}
                      {diagramGroups.earlier.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Earlier</p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {diagramGroups.earlier.map((d) => (
                              <DashboardCard key={d.id} type="diagram" item={d} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptySectionPlaceholder
                      icon={<PenSquare className="h-4 w-4" />}
                      title="No diagrams yet"
                      description="Spin up a canvas to start."
                      ctaHref="/diagram"
                      ctaLabel="Create diagram"
                    />
                  )}
                </section>

                {/* Notes */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      Notes <span className="opacity-50">{'//'}</span> <span className="text-foreground">{recentNotes.items.length}</span>
                    </h3>
                    <Link
                      href="/notes"
                      className="text-primary flex items-center gap-1 text-[10px] hover:underline"
                    >
                      View all <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                  {recentNotes.items.length > 0 ? (
                    <div className="space-y-4">
                      {/* Today */}
                      {noteGroups.today.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Today</p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {noteGroups.today.map((n) => (
                              <DashboardCard key={n.id} type="note" item={n} />
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Earlier */}
                      {noteGroups.earlier.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Earlier</p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {noteGroups.earlier.map((n) => (
                              <DashboardCard key={n.id} type="note" item={n} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptySectionPlaceholder
                      icon={<FileText className="h-4 w-4" />}
                      title="No notes yet"
                      description="Capture ideas, snippets, or meeting notes."
                      ctaHref="/notes"
                      ctaLabel="Create note"
                    />
                  )}
                </section>

                {/* Keyboard Shortcuts */}
                <div className="pt-4 border-t hidden sm:block">
                  <KeyboardShortcuts />
                </div>
              </div>

              {/* Right: Insights Panel */}
              <aside>
                <div className="rounded-lg border bg-card p-4 sticky top-20">
                  <h3 className="text-xs font-medium mb-4">Brain <span className="text-muted-foreground opacity-50">{'//'}</span> <span className="text-muted-foreground">Insights</span></h3>
                  <InsightsPanel
                    topTags={topTags}
                    filetypes={filetypes}
                    todos={todos}
                    activity={activity}
                    staleContent={staleContent}
                    rediscovery={rediscovery}
                    knowledgeStats={knowledgeStats}
                  />
                </div>
              </aside>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function CompactCard({
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
      className="flex shrink-0 items-center gap-1.5 rounded-md border bg-card px-2 py-1.5 text-xs transition-colors"
    >
      <span className="text-base">{icon}</span>
      <span className="truncate max-w-[100px]">{item.title}</span>
    </Link>
  );
}

function DashboardCard({
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
  const isStarred = type === 'diagram' ? (item as Diagram).isFavorite : (item as Omit<Note, 'content'>).starred;

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
                    type === 'diagram'
                      ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
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
          {type === 'diagram' ? description || 'No description' : `Language // ${description}`}
        </p>
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pointer-events-auto">
            {item.tags.slice(0, 2).map(tag => (
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

function EmptySectionPlaceholder({
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
