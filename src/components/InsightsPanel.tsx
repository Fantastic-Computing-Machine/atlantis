import {
  FileCode2,
  Hash,
  PenSquare,
  Star,
  StickyNote,
  Clock,
  Sparkles,
  AlertCircle,
  Brain,
  Plus,
} from 'lucide-react';
import type {
  DashboardStats,
  FiletypeStats,
  TopTag,
  TodoItem,
  ActivityItem,
  StaleItem,
  KnowledgeStats,
} from '@/lib/dashboard-data';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';

interface InsightsPanelProps {
  topTags: TopTag[];
  filetypes: FiletypeStats[];
  todos: TodoItem[];
  activity: ActivityItem[];
  staleContent: StaleItem[];
  rediscovery: ActivityItem[];
  knowledgeStats: KnowledgeStats;
}

export function InsightsPanel({
  topTags,
  filetypes,
  todos,
  activity,
  staleContent,
  rediscovery,
  knowledgeStats,
}: InsightsPanelProps) {
  return (
    <div className="space-y-6">
      {/* Knowledge Stats */}
      <section>
        <h4 className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium">
          <Brain className="h-4 w-4" />
          Knowledge <span className="opacity-50">{'//'}</span>{' '}
          <span className="text-foreground">{knowledgeStats.totalContentItems} items</span>
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted/50 rounded-md p-2">
            <span className="text-muted-foreground">Checkpoints</span>
            <p className="font-semibold">{knowledgeStats.totalCheckpoints}</p>
          </div>
          <div className="bg-muted/50 rounded-md p-2">
            <span className="text-muted-foreground">Avg Versions</span>
            <p className="font-semibold">{knowledgeStats.avgVersionsPerDiagram}</p>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h4 className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4" />
          Activity <span className="opacity-50">{'//'}</span>{' '}
          <span className="text-foreground">Recent</span>
        </h4>
        {activity.length > 0 ? (
          <ul className="space-y-1.5">
            {activity.map((item) => (
              <li key={`${item.type}-${item.id}`} className="text-xs">
                <Link
                  href={item.type === 'diagram' ? `/diagram/${item.id}` : `/notes/${item.id}`}
                  className="hover:text-primary flex items-center gap-2 transition-colors"
                >
                  <span>{item.emoji}</span>
                  <span className="flex-1 truncate">{item.title}</span>
                  <span className="text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-xs">No recent activity.</p>
        )}
      </section>

      {/* Open Tasks */}
      <section>
        <h4 className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium">
          <StickyNote className="h-4 w-4" />
          Open Tasks <span className="opacity-50">{'//'}</span>{' '}
          <span className="text-foreground">{todos.length}</span>
        </h4>
        {todos.length > 0 ? (
          <ul className="space-y-2">
            {todos.map((todo, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded border" />
                <div className="min-w-0 flex-1">
                  <p className="truncate">{todo.text}</p>
                  <Link
                    href={`/notes/${todo.noteId}`}
                    className="text-muted-foreground hover:text-primary block truncate"
                  >
                    {todo.noteTitle}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-xs">All caught up!</p>
        )}
      </section>

      {/* Top Tags */}
      <section>
        <h4 className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium">
          <Hash className="h-4 w-4" />
          Tags <span className="opacity-50">{'//'}</span>{' '}
          <span className="text-foreground">{topTags.length}</span>
        </h4>
        {topTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {topTags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tags/${tag.slug}`}
                className="hover:border-primary/50 inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium transition-colors"
                style={{ borderColor: tag.color + '40', backgroundColor: tag.color + '10' }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
                <span className="text-muted-foreground">{tag.count}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">No tags yet.</p>
        )}
      </section>

      {/* Languages */}
      <section>
        <h4 className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium">
          <FileCode2 className="h-4 w-4" />
          Languages <span className="opacity-50">{'//'}</span>{' '}
          <span className="text-foreground">{filetypes.length}</span>
        </h4>
        {filetypes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {filetypes.map((ft) => (
              <span key={ft.language} className="inline-flex items-center gap-1 text-[10px]">
                <code className="bg-muted rounded px-1.5 py-0.5">{ft.language}</code>
                <span className="text-muted-foreground">{ft.count}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">No notes yet.</p>
        )}
      </section>

      {/* Stale Content */}
      {staleContent.length > 0 && (
        <section>
          <h4 className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Needs Attention <span className="opacity-50">{'//'}</span>{' '}
            <span className="text-foreground">{staleContent.length}</span>
          </h4>
          <ul className="space-y-1.5">
            {staleContent.map((item) => (
              <li key={`${item.type}-${item.id}`} className="text-xs">
                <Link
                  href={item.type === 'diagram' ? `/diagram/${item.id}` : `/notes/${item.id}`}
                  className="hover:text-primary flex items-center gap-2 transition-colors"
                >
                  <span>{item.emoji}</span>
                  <span className="flex-1 truncate">{item.title}</span>
                  <span className="shrink-0 text-amber-500">{item.daysSinceUpdate}d ago</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Rediscovery */}
      {rediscovery.length > 0 && (
        <section>
          <h4 className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Rediscover <span className="opacity-50">{'//'}</span>{' '}
            <span className="text-foreground">Random</span>
          </h4>
          <ul className="space-y-1.5">
            {rediscovery.map((item) => (
              <li key={`${item.type}-${item.id}`} className="text-xs">
                <Link
                  href={item.type === 'diagram' ? `/diagram/${item.id}` : `/notes/${item.id}`}
                  className="hover:text-primary flex items-center gap-2 transition-colors"
                >
                  <span>{item.emoji}</span>
                  <span className="flex-1 truncate">{item.title}</span>
                  <span className="text-muted-foreground text-[10px]">{item.type}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

interface DashboardStatsRowProps {
  stats: DashboardStats;
}

export function DashboardStatsRow({ stats }: DashboardStatsRowProps) {
  const items = [
    { icon: PenSquare, label: 'Diagrams', value: stats.totalDiagrams, href: '/diagram' },
    { icon: StickyNote, label: 'Notes', value: stats.totalNotes, href: '/notes' },
    { icon: Hash, label: 'Tags', value: stats.totalTags, href: '/tags' },
    { icon: Star, label: 'Starred', value: stats.starredItems },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      {items.map((item, idx) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          {idx > 0 && <span className="text-muted-foreground/50 hidden sm:inline">{'//'}</span>}
          <item.icon className="text-muted-foreground h-4 w-4" />
          <span className="text-muted-foreground">{item.label}</span>
          {item.href ? (
            <Link href={item.href} className="font-semibold hover:underline">
              {item.value}
            </Link>
          ) : (
            <span className="font-semibold">{item.value}</span>
          )}
        </span>
      ))}
    </div>
  );
}

export function QuickActions() {
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" className="gap-1.5" asChild>
        <Link href="/diagram/new">
          <Plus className="h-3.5 w-3.5" />
          Diagram
        </Link>
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5" asChild>
        <Link href="/notes">
          <Plus className="h-3.5 w-3.5" />
          Note
        </Link>
      </Button>
    </div>
  );
}
