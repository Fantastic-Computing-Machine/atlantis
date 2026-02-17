import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Hash, Settings } from 'lucide-react';

import { DashboardHeader } from '@/components/DashboardHeader';
import { TagBadge } from '@/components/TagBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getDiagramPage } from '@/lib/data';
import { prisma } from '@/lib/prisma';
import { getNotePage } from '@/lib/notes-data';
import { cn, formatDate } from '@/lib/utils';
import type { Diagram, Note } from '@/lib/types';

export const dynamic = 'force-dynamic';

type TagPageParams = {
  params: Promise<{ tagSlug: string }>;
};

type DiagramTagItem = Diagram & { type: 'diagram' };
type NoteTagItem = Omit<Note, 'content'> & { type: 'note' };
type TagItem = DiagramTagItem | NoteTagItem;

export async function generateMetadata({ params }: TagPageParams): Promise<Metadata> {
  const { tagSlug } = await params;
  const tag = await prisma.tag.findUnique({ where: { slug: tagSlug } });
  if (!tag) {
    return { title: 'Tag Not Found // Atlantis' };
  }
  return { title: `#${tag.name} // Atlantis` };
}

export default async function TagPage({ params }: TagPageParams) {
  const { tagSlug } = await params;

  const tag = await prisma.tag.findUnique({
    where: { slug: tagSlug },
  });

  if (!tag) {
    notFound();
  }

  // Fetch items
  const [diagramsPage, notesPage] = await Promise.all([
    getDiagramPage({ limit: 50, tagSlug }),
    getNotePage({ limit: 50, tagSlug }),
  ]);

  const allItems = [
    ...diagramsPage.items.map((d) => ({ ...d, type: 'diagram' as const })),
    ...notesPage.items.map((n) => ({ ...n, type: 'note' as const })),
  ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col font-sans">
      <DashboardHeader enableApiAccess={process.env.ENABLE_API_ACCESS === 'true'} />

      <main className="container mx-auto flex-1 px-4 py-8">
        <div className="mb-8 flex items-center justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="-ml-3">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div
                className="ring-background h-6 w-6 rounded-full border shadow-sm ring-2"
                style={{ backgroundColor: tag.color }}
              />
              <h1 className="text-3xl font-bold tracking-tight">#{tag.name}</h1>
            </div>
          </div>
          <Button variant="outline" className="gap-2" asChild>
            <Link href="/settings/tags">
              <Settings className="h-4 w-4" />
              Manage Tags
            </Link>
          </Button>
        </div>
        <div className="space-y-6">
          {allItems.length === 0 ? (
            <div className="bg-muted/20 flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <Hash className="text-muted-foreground mb-4 h-10 w-10" />
              <h3 className="text-lg font-medium">No items tagged with #{tag.name}</h3>
              <p className="text-muted-foreground">
                Add this tag to your notes or diagrams to see them here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {allItems.map((item) => (
                <TagItemCard key={`${item.type}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function TagItemCard({ item }: { item: TagItem }) {
  const href = item.type === 'diagram' ? `/diagram/${item.id}` : `/notes/${item.id}`;
  const icon = item.emoji || (item.type === 'diagram' ? '📊' : '📝');
  const description = item.type === 'diagram' ? item.description : item.language;
  const badgeLabel = item.type === 'diagram' ? 'Diagram' : 'Note';

  return (
    <Card className="group hover:border-primary/50 relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link href={href} className="absolute inset-0 z-0 focus:outline-none">
        <span className="sr-only">View {item.title}</span>
      </Link>
      <CardHeader className="pointer-events-none relative z-10 p-4">
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
      <CardContent className="pointer-events-none relative z-10 flex-1 p-4 pt-0">
        <p className="text-muted-foreground line-clamp-2 text-xs">
          {item.type === 'diagram' ? description || 'No description' : `Language // ${description}`}
        </p>
        {/* Show tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="pointer-events-auto mt-3 flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
            {item.tags.length > 3 && (
              <span className="text-muted-foreground ml-1 inline-flex items-center px-1.5 py-0.5 text-[10px]">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </CardContent>
      <div className="pointer-events-none absolute top-2 right-2 z-10">
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] font-medium',
            item.type === 'diagram'
              ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
          )}
        >
          {badgeLabel}
        </span>
      </div>
    </Card>
  );
}
