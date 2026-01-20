
import { getDiagramPage } from '@/lib/data';
import { getNotePage } from '@/lib/notes-data';
import Link from 'next/link';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Clock, ArrowRight } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import { Diagram, Note } from '@/lib/types';
import { DashboardHeader } from '@/components/DashboardHeader';

// Cache for 30 seconds to improve speed while keeping data relatively fresh
// Users creating diagrams will see them instantly via client-side routing
export const revalidate = 30;

export default async function Page() {
  const [
    starredDiagrams,
    starredNotes,
    recentDiagrams,
    recentNotes
  ] = await Promise.all([
    getDiagramPage({ limit: 4, favoritesOnly: true }),
    getNotePage({ limit: 4, starredOnly: true }),
    getDiagramPage({ limit: 8, sort: 'recent' }),
    getNotePage({ limit: 8, sort: 'recent' })
  ]);

  const hasStarred = starredDiagrams.items.length > 0 || starredNotes.items.length > 0;

  // Combine and sort recent items
  const recentItems = [
    ...recentDiagrams.items.map(d => ({ ...d, type: 'diagram' as const })),
    ...recentNotes.items.map(n => ({ ...n, type: 'note' as const }))
  ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8 flex-1 space-y-12">
        {/* Welcome */}
        <section>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Welcome Back</h2>
          <p className="text-muted-foreground">Manage your diagrams and notes from one place.</p>
        </section>

        {/* Starred Section */}
        {hasStarred && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                Starred
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {starredDiagrams.items.map(d => <DashboardCard key={`d-${d.id}`} type="diagram" item={d} />)}
              {starredNotes.items.map(n => <DashboardCard key={`n-${n.id}`} type="note" item={n} />)}
            </div>
          </section>
        )}

        {/* Recents Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Recent Activity
            </h3>
          </div>

          {recentItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentItems.map(item => (
                <DashboardCard
                  key={`${item.type}-${item.id}`}
                  type={item.type}
                  item={item}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">No recent activity.</div>
          )}
        </section>
      </main>
    </div>
  );
}

function DashboardCard({ type, item, small }: { type: 'diagram' | 'note', item: Diagram | Omit<Note, 'content'>, small?: boolean }) {
  const href = type === 'diagram' ? `/diagram/${item.id}` : `/notes/${item.id}`;
  const icon = item.emoji || (type === 'diagram' ? '📊' : '📝');
  const description = type === 'diagram' ? (item as Diagram).description : (item as Note).language;
  const badgeLabel = type === 'diagram' ? 'Diagram' : 'Note';

  return (
    <Link href={href} className="block group">
      <Card className="h-full hover:shadow-md transition-shadow hover:border-primary/50 relative overflow-hidden flex flex-col">
        <CardHeader className="p-4 bg-muted/40 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl shrink-0">{icon}</span>
              <div className="min-w-0 overflow-hidden">
                <CardTitle className="text-base truncate leading-tight">{item.title}</CardTitle>
                <CardDescription className="text-xs truncate">
                  {formatDate(item.updatedAt)}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        {!small && (
          <CardContent className="p-4 pt-3 flex-1 flex flex-col justify-end">
            <p className="text-xs text-muted-foreground line-clamp-2">
              {type === 'diagram' ? description || 'No description' : `Language: ${description}`}
            </p>
          </CardContent>
        )}
        <div className="absolute top-2 right-2">
          <span className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full border shadow-sm",
            type === 'diagram'
              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
              : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
          )}>
            {badgeLabel}
          </span>
        </div>
      </Card>
    </Link>
  );
}
