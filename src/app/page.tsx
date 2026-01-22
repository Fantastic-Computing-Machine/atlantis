import type { ReactNode } from 'react';
import Link from 'next/link';
import { Star, Clock, ArrowRight, FileText, PenSquare } from 'lucide-react';
import { getDiagramPage } from '@/lib/data';
import { getNotePage } from '@/lib/notes-data';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { formatDate, cn } from '@/lib/utils';
import { Diagram, Note } from '@/lib/types';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Greeting } from '@/components/Greeting';
import { DashboardEmptyState } from '@/components/DashboardEmptyState';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [starredDiagrams, starredNotes, recentDiagrams, recentNotes] = await Promise.all([
    getDiagramPage({ limit: 4, favoritesOnly: true }),
    getNotePage({ limit: 4, starredOnly: true }),
    getDiagramPage({ limit: 4, sort: 'recent' }),
    getNotePage({ limit: 4, sort: 'recent' }),
  ]);

  const hasStarred = starredDiagrams.items.length > 0 || starredNotes.items.length > 0;
  const hasRecent = recentDiagrams.items.length > 0 || recentNotes.items.length > 0;
  const isCompletelyEmpty = !hasStarred && !hasRecent;

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col font-sans">
      <DashboardHeader />

      <main className="container mx-auto flex-1 space-y-12 px-4 py-8">
        {isCompletelyEmpty ? (
          <>
            <Greeting />
            <DashboardEmptyState />
          </>
        ) : (
          <>
            {/* Welcome */}
            <section>
              <Greeting />
              <p className="text-muted-foreground">
                Manage your diagrams and notes from one place.
              </p>
            </section>

            {/* Starred Section */}
            {hasStarred && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-xl font-semibold">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    Starred
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {starredDiagrams.items.map((d) => (
                    <DashboardCard key={`d-${d.id}`} type="diagram" item={d} />
                  ))}
                  {starredNotes.items.map((n) => (
                    <DashboardCard key={`n-${n.id}`} type="note" item={n} />
                  ))}
                </div>
              </section>
            )}

            {/* Recents Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xl font-semibold">
                  <Clock className="text-muted-foreground h-5 w-5" />
                  Recent Activity
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Recent Diagrams */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-muted-foreground font-medium">Diagrams</h4>
                    <Link
                      href="/diagram"
                      className="text-primary flex items-center gap-1 text-sm hover:underline"
                    >
                      View all <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                  {recentDiagrams.items.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {recentDiagrams.items.map((d) => (
                        <DashboardCard key={d.id} type="diagram" item={d} small />
                      ))}
                    </div>
                  ) : (
                    <EmptySectionPlaceholder
                      icon={<PenSquare className="h-5 w-5" />}
                      title="No recent diagrams"
                      description="Spin up a canvas to start mapping systems."
                      ctaHref="/diagram"
                      ctaLabel="Create diagram"
                    />
                  )}
                </div>

                {/* Recent Notes */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-muted-foreground font-medium">Notes</h4>
                    <Link
                      href="/notes"
                      className="text-primary flex items-center gap-1 text-sm hover:underline"
                    >
                      View all <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                  {recentNotes.items.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {recentNotes.items.map((n) => (
                        <DashboardCard key={n.id} type="note" item={n} small />
                      ))}
                    </div>
                  ) : (
                    <EmptySectionPlaceholder
                      icon={<FileText className="h-5 w-5" />}
                      title="No recent notes"
                      description="Capture ideas, snippets, or meeting notes."
                      ctaHref="/notes"
                      ctaLabel="Create note"
                    />
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function DashboardCard({
  type,
  item,
  small,
}: {
  type: 'diagram' | 'note';
  item: Diagram | Omit<Note, 'content'>;
  small?: boolean;
}) {
  const href = type === 'diagram' ? `/diagram/${item.id}` : `/notes/${item.id}`;
  const icon = item.emoji || (type === 'diagram' ? '📊' : '📝');
  const description = type === 'diagram' ? (item as Diagram).description : (item as Note).language;
  const badgeLabel = type === 'diagram' ? 'Diagram' : 'Note';

  return (
    <Link href={href} className="group block">
      <Card className="hover:border-primary/50 relative h-full overflow-hidden transition-shadow hover:shadow-md">
        <CardHeader className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-2xl">{icon}</span>
              <div className="min-w-0 overflow-hidden">
                <CardTitle className="truncate text-base">{item.title}</CardTitle>
                <CardDescription className="truncate text-xs">
                  {formatDate(item.updatedAt)}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        {!small && (
          <CardContent className="p-4 pt-0">
            <p className="text-muted-foreground line-clamp-2 text-xs">
              {type === 'diagram' ? description || 'No description' : `Language: ${description}`}
            </p>
          </CardContent>
        )}
        <div className="absolute top-2 right-2">
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-medium',
              type === 'diagram'
                ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
            )}
          >
            {badgeLabel}
          </span>
        </div>
      </Card>
    </Link>
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
    <div className="border-muted-foreground/40 bg-muted/20 flex flex-col gap-3 rounded-xl border border-dashed p-4">
      <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
        <span className="bg-background text-primary border-border flex h-8 w-8 items-center justify-center rounded-full border">
          {icon}
        </span>
        {title}
      </div>
      <p className="text-muted-foreground text-sm">{description}</p>
      <Link
        href={ctaHref}
        className="text-primary inline-flex items-center gap-2 text-sm font-medium hover:underline"
      >
        {ctaLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
