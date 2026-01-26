
import { prisma } from '@/lib/prisma';
import { getDiagramPage } from '@/lib/data';
import { getNotePage } from '@/lib/notes-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TagBadge } from '@/components/TagBadge';
import { formatDate, cn } from '@/lib/utils';
import { Diagram, Note } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, Clock, FileText, PenSquare, Hash } from 'lucide-react';
import { notFound } from 'next/navigation';
import { DashboardHeader } from '@/components/DashboardHeader';

export const dynamic = 'force-dynamic';

interface TagPageProps {
    params: Promise<{ tagSlug: string }>;
}

export async function generateMetadata({ params }: TagPageProps) {
    const { tagSlug } = await params;
    const tag = await prisma.tag.findUnique({ where: { slug: tagSlug } });
    if (!tag) {
        return { title: 'Tag Not Found // Atlantis' };
    }
    return {
        title: `#${tag.name} // Atlantis`,
    };
}



export default async function TagPage({ params }: TagPageProps) {
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
        ...diagramsPage.items.map(d => ({ ...d, type: 'diagram' as const })),
        ...notesPage.items.map(n => ({ ...n, type: 'note' as const })),
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
                            <div className="h-6 w-6 rounded-full border shadow-sm ring-2 ring-background" style={{ backgroundColor: tag.color }} />
                            <h1 className="text-3xl font-bold tracking-tight">#{tag.name}</h1>
                        </div>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/settings/tags">
                            Manage Tags
                        </Link>
                    </Button>
                </div>
                <div className="space-y-6">
                    {allItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-muted/20 border-dashed">
                            <Hash className="h-10 w-10 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium">No items tagged with #{tag.name}</h3>
                            <p className="text-muted-foreground">Add this tag to your notes or diagrams to see them here.</p>
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

function TagItemCard({ item }: { item: (Diagram | Omit<Note, 'content'>) & { type: 'diagram' | 'note' } }) {
    const href = item.type === 'diagram' ? `/diagram/${item.id}` : `/notes/${item.id}`;
    const icon = item.emoji || (item.type === 'diagram' ? '📊' : '📝');
    const description = item.type === 'diagram' ? (item as Diagram).description : (item as Omit<Note, 'content'>).language;
    const badgeLabel = item.type === 'diagram' ? 'Diagram' : 'Note';

    return (
        <Card className="group relative h-full overflow-hidden transition-shadow hover:shadow-md hover:border-primary/50 flex flex-col">
            <Link href={href} className="absolute inset-0 z-0 focus:outline-none">
                <span className="sr-only">View {item.title}</span>
            </Link>
            <CardHeader className="p-4 relative z-10 pointer-events-none">
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
            <CardContent className="p-4 pt-0 flex-1 relative z-10 pointer-events-none">
                <p className="text-muted-foreground line-clamp-2 text-xs">
                    {item.type === 'diagram' ? description || 'No description' : `Language: ${description}`}
                </p>
                {/* Show tags */}
                {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3 pointer-events-auto">
                        {item.tags.filter(t => true).slice(0, 3).map(tag => (
                            <TagBadge key={tag.id} tag={tag} />
                        ))}
                        {item.tags.length > 3 && (
                            <span className="text-[10px] text-muted-foreground inline-flex items-center px-1.5 py-0.5 ml-1">
                                +{item.tags.length - 3}
                            </span>
                        )}
                    </div>
                )}
            </CardContent>
            <div className="absolute top-2 right-2 z-10 pointer-events-none">
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
