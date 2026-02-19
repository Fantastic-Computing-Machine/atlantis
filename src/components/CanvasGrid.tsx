'use client';

import { GlobalSearchDialog } from '@/components/GlobalSearchDialog';
import { TagBadge } from '@/components/TagBadge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { CSRF_HEADER_NAME, ensureCsrfToken } from '@/lib/csrf-client';
import { useDiagramStore } from '@/lib/store';
import { Canvas, NoteSortOption } from '@/lib/types';
import { useListSync } from '@/lib/useListSync';
import { useShortcutPlatform } from '@/lib/use-platform';
import { cn, copyToClipboard, formatDate } from '@/lib/utils'; // Removed sanitizeFilename as we don't download here yet
import { Eye, ListFilter, Loader2, MoreHorizontal, Plus, Search, Settings2, Share2, Star, Trash2, PenTool } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface CanvasGridProps {
    initialCanvases: Omit<Canvas, 'content'>[];
    initialHasMore?: boolean;
    initialNextOffset?: number;
    initialTotal?: number;
}

export function CanvasGrid({
    initialCanvases,
    initialHasMore,
    initialNextOffset,
    initialTotal,
}: CanvasGridProps) {
    const [canvases, setCanvases] = useState<Omit<Canvas, 'content'>[]>(initialCanvases);
    const [hasMore, setHasMore] = useState<boolean>(initialHasMore ?? false);
    const [nextOffset, setNextOffset] = useState<number>(initialNextOffset ?? initialCanvases.length);
    const [total, setTotal] = useState<number>(initialTotal ?? initialCanvases.length);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const { shortcutHint } = useShortcutPlatform();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [sortMode, setSortMode] = useState<NoteSortOption>('recent');
    const { settings } = useDiagramStore();
    const router = useRouter();
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Live sync
    useListSync<Omit<Canvas, 'content'>>({
        listUrl: `/api/canvases?limit=24&offset=0&sort=${sortMode}`,
        currentItems: canvases,
        enabled: Boolean(settings.liveSync),
        intervalMs: (settings.liveSyncInterval ?? 5000) * 2,
        onUpdate: (serverItems, newTotal) => {
            setCanvases(serverItems);
            setTotal(newTotal);
        },
        onListChanged: () => {
            toast.info('Canvas list updated');
        },
    });

    useEffect(() => {
        setCanvases(initialCanvases);
        setHasMore(initialHasMore ?? false);
        setNextOffset(initialNextOffset ?? initialCanvases.length);
        setTotal(initialTotal ?? initialCanvases.length);
        setIsLoading(false);
    }, [initialCanvases, initialHasMore, initialNextOffset, initialTotal]);

    const fetchNextPage = useCallback(async () => {
        if (!hasMore || isFetchingMore) return;

        setIsFetchingMore(true);
        try {
            const res = await fetch(`/api/canvases?limit=24&offset=${nextOffset}&sort=${sortMode}`);
            if (!res.ok) {
                throw new Error('Failed to load more');
            }
            const data = await res.json();
            const incoming: Omit<Canvas, 'content'>[] = Array.isArray(data.items) ? data.items : [];
            setCanvases((prev) => {
                const existingIds = new Set(prev.map((d) => d.id));
                const merged = [...prev];
                incoming.forEach((item) => {
                    if (!existingIds.has(item.id)) {
                        merged.push(item);
                    }
                });
                return merged;
            });
            setHasMore(Boolean(data.hasMore));
            setNextOffset(typeof data.nextOffset === 'number' ? data.nextOffset : nextOffset + (data.items?.length || 0));
            setTotal(typeof data.total === 'number' ? data.total : total);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load more canvases');
        } finally {
            setIsFetchingMore(false);
        }
    }, [hasMore, isFetchingMore, nextOffset, sortMode, total]);

    useEffect(() => {
        if (!hasMore || isFetchingMore) return;
        const target = loadMoreRef.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting) {
                    fetchNextPage();
                }
            },
            { rootMargin: '200px' }
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [fetchNextPage, hasMore, isFetchingMore]);

    const reloadFirstPage = useCallback(async (overrideSort?: NoteSortOption) => {
        const sortToUse = overrideSort ?? sortMode;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/canvases?limit=24&offset=0&sort=${sortToUse}`);
            if (!res.ok) {
                throw new Error('Failed to load canvases');
            }
            const data = await res.json();
            const items: Omit<Canvas, 'content'>[] = Array.isArray(data.items) ? data.items : [];
            setCanvases(items);
            setHasMore(Boolean(data.hasMore));
            setNextOffset(typeof data.nextOffset === 'number' ? data.nextOffset : items.length);
            setTotal(typeof data.total === 'number' ? data.total : items.length);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load canvases');
        } finally {
            setIsLoading(false);
        }
    }, [sortMode]);

    const handleSortChange = (newSort: NoteSortOption) => {
        if (newSort === sortMode) return;
        setSortMode(newSort);
        reloadFirstPage(newSort);
    };

    const starredCanvases = canvases
        .filter((d) => d.isFavorite)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const otherCanvases = canvases
        .filter((d) => !d.isFavorite)
        .sort((a, b) => {
            // Client side sort fallback/augmentation
            const dateA = new Date(a.updatedAt).getTime();
            const dateB = new Date(b.updatedAt).getTime();
            if (sortMode === 'old') return dateA - dateB;
            if (sortMode === 'alphabetical') return a.title.localeCompare(b.title);
            return dateB - dateA;
        });

    const hasStarred = starredCanvases.length > 0;

    const handleCreate = async () => {
        setIsCreating(true);
        try {
            const csrfToken = await ensureCsrfToken();
            const res = await fetch('/api/canvases', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [CSRF_HEADER_NAME]: csrfToken,
                },
                body: JSON.stringify({}),
            });
            if (!res.ok) {
                throw new Error('Failed to create');
            }
            const newCanvas = await res.json();
            toast.success('New canvas created');
            router.push(`/canvas/${newCanvas.id}`);
        } catch {
            toast.error('Failed to create canvas');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        const previousCanvases = [...canvases];
        const previousTotal = total;

        setCanvases((prev) => prev.filter((d) => d.id !== deleteId));
        setTotal((prev) => Math.max(prev - 1, 0));
        setDeleteId(null);

        try {
            const csrfToken = await ensureCsrfToken();
            const res = await fetch(`/api/canvases/${deleteId}`, {
                method: 'DELETE',
                headers: {
                    [CSRF_HEADER_NAME]: csrfToken,
                },
            });

            if (!res.ok) {
                throw new Error('Failed to delete');
            }

            toast.success('Canvas deleted');
        } catch {
            setCanvases(previousCanvases);
            setTotal(previousTotal);
            toast.error('Failed to delete canvas');
        }
    };

    const handleFavorite = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        const canvas = canvases.find((d) => d.id === id);
        if (!canvas) return;

        setCanvases((prev) =>
            prev.map((d) => (d.id === id ? { ...d, isFavorite: !d.isFavorite } : d))
        );

        const csrfToken = await ensureCsrfToken();
        await fetch(`/api/canvases/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                [CSRF_HEADER_NAME]: csrfToken,
            },
            body: JSON.stringify({ isFavorite: !canvas.isFavorite }),
        });
    };

    const handleShare = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        const url = `${window.location.origin}/canvas/${id}`;
        const success = await copyToClipboard(url);
        if (success) {
            toast.success('Link copied to clipboard');
        } else {
            toast.error('Failed to copy link');
        }
    };

    const canvasToDelete = deleteId ? canvases.find((d) => d.id === deleteId) : null;

    const renderCanvasGrid = (list: Omit<Canvas, 'content'>[]) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {list.map((canvas) => (
                <Card
                    key={canvas.id}
                    className={cn(
                        'group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/50 h-full flex flex-col',
                    )}
                >
                    <Link href={`/canvas/${canvas.id}`} className="absolute inset-0 z-0 focus:outline-none">
                        <span className="sr-only">Open {canvas.title}</span>
                    </Link>

                    <CardHeader className="pb-2 relative z-10 pointer-events-none">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-2xl shrink-0">{canvas.emoji || '🎨'}</span>
                                <div className="min-w-0 flex-1">
                                    <CardTitle className="text-base truncate">{canvas.title}</CardTitle>
                                    <CardDescription className="text-xs flex items-center gap-2">
                                        <span>{formatDate(canvas.updatedAt)}</span>
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 pointer-events-auto">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground"
                                    onClick={(e) => {
                                        // Peek not implemented yet for canvas
                                        e.preventDefault();
                                        e.stopPropagation();
                                        router.push(`/canvas/${canvas.id}`);
                                    }}
                                >
                                    <Eye className="h-4 w-4" />
                                    <span className="sr-only">Open canvas</span>
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                        >
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">Open menu</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={(e) => handleShare(e, canvas.id)}
                                        >
                                            <Share2 className="mr-2 h-4 w-4" />
                                            <span>Copy link</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={(e) => handleFavorite(e, canvas.id)}
                                        >
                                            <Star
                                                className={cn(
                                                    'mr-2 h-4 w-4',
                                                    canvas.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''
                                                )}
                                            />
                                            <span>{canvas.isFavorite ? 'Unstar' : 'Star'}</span>
                                        </DropdownMenuItem>

                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setDeleteId(canvas.id);
                                            }}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Delete</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="relative z-10 pointer-events-none flex-1">
                        {canvas.tags && canvas.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2 pointer-events-auto">
                                {canvas.tags.map(tag => (
                                    <TagBadge key={tag.id} tag={tag} />
                                ))}
                            </div>
                        )}
                        <div className="bg-muted/50 rounded-md p-3 h-24 overflow-hidden flex items-center justify-center">
                            <PenTool className="text-muted-foreground/20 h-10 w-10" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );

    return (
        <>
            <div className="min-h-screen bg-background text-foreground flex flex-col">
                {/* Header */}
                <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm shrink-0">
                    <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                <span className="text-2xl" role="img" aria-label="atlantis logo">
                                    🔱
                                </span>
                                <h1 className="text-xl font-bold">atlantis // Canvases</h1>
                            </Link>
                        </div>

                        <div className="flex-1 max-w-md flex justify-center">
                            <Button
                                variant="outline"
                                className="gap-2"
                                onClick={() => setIsSearchOpen(true)}
                                aria-label="Open search"
                            >
                                <Search className="h-4 w-4" />
                                <span className="hidden sm:inline">Search</span>
                                <span className="text-xs text-muted-foreground hidden lg:inline">{shortcutHint}</span>

                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button onClick={handleCreate} className="gap-2" disabled={isCreating}>
                                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={18} />}
                                <span className="hidden sm:inline">{isCreating ? 'Creating...' : 'New Canvas'}</span>
                            </Button>

                            <Button variant="outline" className="gap-2" asChild>
                                <Link href="/settings">
                                    <Settings2 className="h-4 w-4" />
                                    <span className="hidden sm:inline">Settings</span>
                                    <span className="text-xs text-muted-foreground hidden lg:inline">
                                        Auto-save {settings.autoSave ? 'On' : 'Off'}
                                    </span>
                                </Link>
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="container mx-auto px-4 py-8 flex-1">
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <Card key={i} className="overflow-hidden">
                                    <CardHeader className="pb-2">
                                        <Skeleton className="h-6 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </CardHeader>
                                    <CardContent>
                                        <Skeleton className="h-24 w-full" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : canvases.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Card className="max-w-md text-center border-dashed">
                                <CardHeader className="pb-4 space-y-3">
                                    <div className="flex justify-center">
                                        <span className="text-5xl" role="img" aria-label="atlantis logo">
                                            🎨
                                        </span>
                                    </div>
                                    <CardTitle className="text-2xl">No canvases yet</CardTitle>
                                    <CardDescription className="space-y-1">
                                        Create your first freeform canvas to get started.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-2">
                                    <Button onClick={handleCreate} className="gap-2">
                                        <Plus size={18} />
                                        Create Your First Canvas
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {hasStarred && (
                                <section>
                                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                        <span>Starred //</span>
                                        <span className="text-muted-foreground">{starredCanvases.length}</span>
                                    </h2>
                                    {renderCanvasGrid(starredCanvases)}
                                </section>
                            )}

                            {(otherCanvases.length > 0 || !hasStarred) && (
                                <section>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className={cn("text-lg font-semibold flex items-center gap-2", hasStarred && "text-muted-foreground")}>
                                            <span>All canvases //</span>
                                            <span className="text-muted-foreground">
                                                {otherCanvases.length} of {Math.max(total - starredCanvases.length, 0)}
                                            </span>
                                        </h2>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="gap-2">
                                                    <ListFilter className="h-4 w-4" />
                                                    <span className="hidden sm:inline">Sort</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuRadioGroup value={sortMode} onValueChange={(v) => handleSortChange(v as NoteSortOption)}>
                                                    <DropdownMenuRadioItem value="recent">Recent</DropdownMenuRadioItem>
                                                    <DropdownMenuRadioItem value="old">Oldest</DropdownMenuRadioItem>
                                                    <DropdownMenuRadioItem value="alphabetical">Alphabetical</DropdownMenuRadioItem>
                                                </DropdownMenuRadioGroup>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    {renderCanvasGrid(otherCanvases)}
                                </section>
                            )}

                            {isFetchingMore && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" aria-hidden>
                                    {[1, 2, 3, 4].map((i) => (
                                        <Card key={`skeleton-${i}`} className="overflow-hidden">
                                            <CardHeader className="pb-2">
                                                <Skeleton className="h-6 w-3/4" />
                                                <Skeleton className="h-4 w-1/2" />
                                            </CardHeader>
                                            <CardContent>
                                                <Skeleton className="h-24 w-full" />
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            <div ref={loadMoreRef} className="h-10" aria-hidden />
                        </div>
                    )}
                </main>

                {/* Footer */}
                <footer className="border-t py-6 mt-auto shrink-0">
                    <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                        Powered by{' '}
                        <a
                            href="https://tldraw.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-foreground transition-colors"
                        >
                            tldraw
                        </a>
                    </div>
                </footer>
            </div>

            <GlobalSearchDialog
                open={isSearchOpen}
                onOpenChange={setIsSearchOpen}
            // initialDiagrams={diagrams} // Search dialog needs update to support canvases, or we just remove this prop for now
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete canvas?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete &ldquo;{canvasToDelete?.title}&rdquo;. This action
                            cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
