import Link from 'next/link';
import { Star, FileText, PenSquare, PenTool } from 'lucide-react';
import { getHomePageData } from '@/lib/dashboard-data';
import { Button } from '@/components/ui/button';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Greeting } from '@/components/Greeting';
import { DashboardEmptyState } from '@/components/DashboardEmptyState';
import { DashboardStatsRow, InsightsPanel } from '@/components/InsightsPanel';
import { QuickCapture, KeyboardShortcuts } from '@/components/QuickCapture';
import { DashboardSection } from '@/components/DashboardSection';
import { CompactCard } from '@/components/DashboardCards';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const data = await getHomePageData();

  // Filter out private notes
  const starredNotes = {
    ...data.starredNotesRaw,
    items: data.starredNotesRaw.items.filter((n) => !n.private),
  };
  const recentNotes = {
    ...data.recentNotesRaw,
    items: data.recentNotesRaw.items.filter((n) => !n.private).slice(0, 8),
  };

  const hasStarred =
    data.starredDiagrams.items.length > 0 ||
    starredNotes.items.length > 0 ||
    data.starredCanvases.items.length > 0;

  const hasRecent =
    data.recentDiagrams.items.length > 0 ||
    recentNotes.items.length > 0 ||
    data.recentCanvases.items.length > 0;

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
                </div>
                {/* Quick Actions - always visible */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="icon" className="h-8 w-8" asChild>
                    <Link href="/diagram/new" aria-label="New Diagram">
                      <PenSquare className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="icon" className="h-8 w-8" asChild>
                    <Link href="/canvas/new" aria-label="New Canvas">
                      <PenTool className="h-4 w-4" />
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
                  <DashboardStatsRow stats={data.stats} />
                </div>
              </div>
            </section>

            {/* Starred Strip */}
            {hasStarred && (
              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  Starred <span className="opacity-50">{'//'}</span>{' '}
                  <span className="text-foreground">
                    {data.starredDiagrams.items.length + starredNotes.items.length + data.starredCanvases.items.length}
                  </span>
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {data.starredDiagrams.items.map((d) => (
                    <CompactCard key={`d-${d.id}`} type="diagram" item={d} />
                  ))}
                  {data.starredCanvases.items.map((c) => (
                    <CompactCard key={`c-${c.id}`} type="canvas" item={c} />
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
                {/* Canvases */}
                <DashboardSection
                  title="Canvases"
                  icon={<PenTool className="h-3.5 w-3.5" />}
                  viewAllHref="/canvas"
                  type="canvas"
                  items={data.recentCanvases.items}
                  emptyState={{
                    icon: <PenTool className="h-4 w-4" />,
                    title: 'No canvases yet',
                    description: 'Start a freeform sketch.',
                    ctaHref: '/canvas',
                    ctaLabel: 'Create canvas',
                  }}
                />

                {/* Diagrams */}
                <DashboardSection
                  title="Diagrams"
                  icon={<PenSquare className="h-3.5 w-3.5" />}
                  viewAllHref="/diagram"
                  type="diagram"
                  items={data.recentDiagrams.items}
                  emptyState={{
                    icon: <PenSquare className="h-4 w-4" />,
                    title: 'No diagrams yet',
                    description: 'Spin up a structured diagram.',
                    ctaHref: '/diagram',
                    ctaLabel: 'Create diagram',
                  }}
                />

                {/* Notes */}
                <DashboardSection
                  title="Notes"
                  icon={<FileText className="h-3.5 w-3.5" />}
                  viewAllHref="/notes"
                  type="note"
                  items={recentNotes.items}
                  emptyState={{
                    icon: <FileText className="h-4 w-4" />,
                    title: 'No notes yet',
                    description: 'Capture ideas, snippets, or meeting notes.',
                    ctaHref: '/notes',
                    ctaLabel: 'Create note',
                  }}
                />

                {/* Keyboard Shortcuts */}
                <div className="pt-4 border-t hidden sm:block">
                  <KeyboardShortcuts />
                </div>
              </div>

              {/* Right: Insights Panel */}
              <aside>
                <div className="rounded-lg border bg-card p-4 sticky top-20">
                  <h3 className="text-xs font-medium mb-4">
                    Brain <span className="text-muted-foreground opacity-50">{'//'}</span>{' '}
                    <span className="text-muted-foreground">Insights</span>
                  </h3>
                  <InsightsPanel
                    topTags={data.topTags}
                    filetypes={data.filetypes}
                    todos={data.todos}
                    activity={data.activity}
                    staleContent={data.staleContent}
                    rediscovery={data.rediscovery}
                    knowledgeStats={data.knowledgeStats}
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

