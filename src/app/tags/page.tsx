import { DashboardHeader } from '@/components/DashboardHeader';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Hash, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function TagsPage() {
    const tags = await prisma.tag.findMany({
        orderBy: { name: 'asc' },
        include: {
            _count: {
                select: { diagrams: true, notes: true }
            }
        }
    });

    return (
        <div className="bg-background text-foreground flex min-h-screen flex-col font-sans">
            <DashboardHeader enableApiAccess={process.env.ENABLE_API_ACCESS === 'true'} />

            <main className="container mx-auto flex-1 px-4 py-8">
                <div className="mb-8 flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Hash className="h-8 w-8" />
                        <h1 className="text-3xl font-bold tracking-tight">All Tags</h1>
                    </div>
                    <Button variant="outline" className="w-full gap-2 sm:w-auto" asChild>
                        <Link href="/settings/tags">
                            <Settings className="h-4 w-4" />
                            Manage Tags
                        </Link>
                    </Button>
                </div>

                {tags.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-muted/20 border-dashed">
                        <Hash className="h-10 w-10 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No tags found</h3>
                        <p className="text-muted-foreground">Tags will appear here once you create them.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {tags.map((tag) => (
                            <Link key={tag.id} href={`/tags/${tag.slug}`} className="block group">
                                <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            #{tag.name}
                                        </CardTitle>
                                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xs text-muted-foreground">
                                            {tag._count.diagrams + tag._count.notes} items
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
