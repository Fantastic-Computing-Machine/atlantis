'use client';

import { GlobalSearchDialog } from '@/components/GlobalSearchDialog';
import { PeekDiagramModal } from '@/components/PeekDiagramModal';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { CSRF_HEADER_NAME, ensureCsrfToken } from '@/lib/csrf-client';
import { LIVE_SYNC_CONFIG } from '@/lib/live-sync-config';
import { useDiagramStore } from '@/lib/store';
import { Diagram, SortOption } from '@/lib/types';
import { useListSync } from '@/lib/useListSync';
import { useShortcutPlatform } from '@/lib/use-platform';
import { cn, copyToClipboard, formatDate, sanitizeFilename } from '@/lib/utils';

import {
  Download,
  Eye,
  ListFilter,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Share2,
  Star,
  Trash2,
} from 'lucide-react';

import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface DiagramGridProps {
  initialDiagrams: Diagram[];
  initialHasMore?: boolean;
  initialNextOffset?: number;
  initialTotal?: number;
}

export function DiagramGrid({
  initialDiagrams,
  initialHasMore,
  initialNextOffset,
  initialTotal,
}: DiagramGridProps) {
  const [diagrams, setDiagrams] = useState<Diagram[]>(initialDiagrams);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore ?? false);
  const [nextOffset, setNextOffset] = useState<number>(initialNextOffset ?? initialDiagrams.length);
  const [total, setTotal] = useState<number>(initialTotal ?? initialDiagrams.length);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { shortcutHint } = useShortcutPlatform();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [peekDiagram, setPeekDiagram] = useState<Diagram | null>(null);
  const [sortMode, setSortMode] = useState<SortOption>('recent');
  const { theme } = useTheme();
  const { settings, updateSettings } = useDiagramStore();
  const router = useRouter();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Live sync: poll for diagram property changes and new items
  useListSync<Diagram>({
    listUrl: `/api/diagrams?limit=24&offset=0&sort=${sortMode}`,
    currentItems: diagrams,
    enabled: LIVE_SYNC_CONFIG.enabled,
    intervalMs: LIVE_SYNC_CONFIG.pollIntervalMs * 2,
    liveSyncMethod: LIVE_SYNC_CONFIG.method,
    eventTopics: ['list:diagrams'],
    onUpdate: (serverItems, newTotal) => {
      setDiagrams(serverItems);
      setTotal(newTotal);
    },
    onListChanged: () => {
      toast.info('Diagram list updated');
    },
  });

  useEffect(() => {
    setDiagrams(initialDiagrams);
    setHasMore(initialHasMore ?? false);
    setNextOffset(initialNextOffset ?? initialDiagrams.length);
    setTotal(initialTotal ?? initialDiagrams.length);
    setIsLoading(false);
  }, [initialDiagrams, initialHasMore, initialNextOffset, initialTotal]);

  useEffect(() => {
    const loadAiKey = async () => {
      try {
        const res = await fetch('/api/settings/ai-key');
        const data = await res.json();
        if (typeof data.hasKey === 'boolean') {
          updateSettings({ hasAiApiKey: data.hasKey });
        }
        if (typeof data.provider === 'string') {
          updateSettings({ aiProvider: data.provider });
        }
      } catch {
        // ignore; AI optional
      }
    };
    loadAiKey();
  }, [updateSettings]);

  const fetchNextPage = useCallback(async () => {
    if (!hasMore || isFetchingMore) return;

    setIsFetchingMore(true);
    try {
      const res = await fetch(`/api/diagrams?limit=24&offset=${nextOffset}&sort=${sortMode}`);
      if (!res.ok) {
        throw new Error('Failed to load more');
      }
      const data = await res.json();
      const incoming: Diagram[] = Array.isArray(data.items) ? data.items : [];
      setDiagrams((prev) => {
        const existingIds = new Set(prev.map((d) => d.id));
        return [...prev, ...incoming.filter((item) => !existingIds.has(item.id))];
      });
      setHasMore(Boolean(data.hasMore));
      setNextOffset(data.nextOffset ?? nextOffset + (data.items?.length || 0));
      setTotal(data.total ?? total);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load more diagrams');
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

  const reloadFirstPage = useCallback(
    async (overrideSort?: SortOption) => {
      const sortToUse = overrideSort ?? sortMode;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/diagrams?limit=24&offset=0&sort=${sortToUse}`);
        if (!res.ok) {
          throw new Error('Failed to load diagrams');
        }
        const data = await res.json();
        const items: Diagram[] = Array.isArray(data.items) ? data.items : [];
        setDiagrams(items);
        setHasMore(Boolean(data.hasMore));
        setNextOffset(data.nextOffset ?? items.length);
        setTotal(data.total ?? items.length);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load diagrams');
      } finally {
        setIsLoading(false);
      }
    },
    [sortMode]
  );

  const handleSortChange = (newSort: SortOption) => {
    if (newSort === sortMode) return;
    setSortMode(newSort);
    reloadFirstPage(newSort);
  };

  const starredDiagrams = diagrams
    .filter((d) => d.isFavorite)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const otherDiagrams = diagrams
    .filter((d) => !d.isFavorite)
    .sort((a, b) => {
      switch (sortMode) {
        case 'old':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        case 'versions':
          return b.totalVersions - a.totalVersions;
        case 'recent':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  const hasStarred = starredDiagrams.length > 0;

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const csrfToken = await ensureCsrfToken();
      const res = await fetch('/api/diagrams', {
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
      const newDiagram = await res.json();
      toast.success('New diagram created');
      router.push(`/diagram/${newDiagram.id}`);
    } catch {
      toast.error('Failed to create diagram');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    // Optimistically update UI
    const previousDiagrams = [...diagrams];
    const previousTotal = total;

    setDiagrams((prev) => prev.filter((d) => d.id !== deleteId));
    setTotal((prev) => Math.max(prev - 1, 0));
    setDeleteId(null); // Close modal immediately

    try {
      const csrfToken = await ensureCsrfToken();
      const res = await fetch(`/api/diagrams/${deleteId}`, {
        method: 'DELETE',
        headers: {
          [CSRF_HEADER_NAME]: csrfToken,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to delete');
      }

      toast.success('Diagram deleted');
    } catch {
      // Revert on failure
      setDiagrams(previousDiagrams);
      setTotal(previousTotal);
      toast.error('Failed to delete diagram');
    }
  };

  const handleFavorite = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const diagram = diagrams.find((d) => d.id === id);
    if (!diagram) return;

    setDiagrams((prev) => prev.map((d) => (d.id === id ? { ...d, isFavorite: !d.isFavorite } : d)));

    const csrfToken = await ensureCsrfToken();
    await fetch(`/api/diagrams/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        [CSRF_HEADER_NAME]: csrfToken,
      },
      body: JSON.stringify({ isFavorite: !diagram.isFavorite }),
    });
  };

  const handleShare = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/diagram/${id}`;
    const success = await copyToClipboard(url);
    if (success) {
      toast.success('Link copied to clipboard');
    } else {
      toast.error('Failed to copy link');
    }
  };

  const handleDownload = async (diagram: Diagram, format: 'svg' | 'png' | 'pdf') => {
    try {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose',
      });

      const id = `mermaid-${diagram.id}`;
      const { svg } = await mermaid.render(id, diagram.content);
      const filename = sanitizeFilename(diagram.title || 'untitled_diagram');

      if (format === 'svg') {
        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('SVG downloaded');
      } else {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context not supported');

        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, 'image/svg+xml');
        const svgEl = doc.documentElement;

        const viewBox = svgEl.getAttribute('viewBox')?.split(' ').map(Number);
        const svgWidth = viewBox ? viewBox[2] : parseFloat(svgEl.getAttribute('width') || '800');
        const svgHeight = viewBox ? viewBox[3] : parseFloat(svgEl.getAttribute('height') || '600');

        const scale = 2;
        canvas.width = svgWidth * scale;
        canvas.height = svgHeight * scale;

        const img = new Image();
        const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });

        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
        URL.revokeObjectURL(url);

        if (format === 'png') {
          const a = document.createElement('a');
          a.href = canvas.toDataURL('image/png');
          a.download = `${filename}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast.success('PNG downloaded');
        } else if (format === 'pdf') {
          const jsPDF = (await import('jspdf')).default;
          const isLandscape = svgWidth > svgHeight;
          const pdf = new jsPDF({
            orientation: isLandscape ? 'landscape' : 'portrait',
            unit: 'px',
            format: [svgWidth + 40, svgHeight + 40],
          });
          pdf.setFillColor(255, 255, 255);
          pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), 'F');
          const imgData = canvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', 20, 20, svgWidth, svgHeight);
          pdf.save(`${filename}.pdf`);
          toast.success('PDF downloaded');
        }
      }
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download diagram');
    }
  };

  const diagramToDelete = deleteId ? diagrams.find((d) => d.id === deleteId) : null;

  const renderDiagramGrid = (list: Diagram[]) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {list.map((diagram) => (
        <Card
          key={diagram.id}
          className={cn(
            'group hover:border-primary/50 relative flex h-full flex-col overflow-hidden transition-all duration-200 hover:shadow-lg'
          )}
        >
          <Link href={`/diagram/${diagram.id}`} className="absolute inset-0 z-0 focus:outline-none">
            <span className="sr-only">Open {diagram.title}</span>
          </Link>

          <CardHeader className="pointer-events-none relative z-10 pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="shrink-0 text-2xl">{diagram.emoji || '📊'}</span>
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-base">{diagram.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 text-xs">
                    <span>{formatDate(diagram.updatedAt)}</span>
                    {diagram.totalVersions > 1 && (
                      <span className="bg-muted rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                        v{diagram.totalVersions}
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
              <div className="pointer-events-auto flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground h-8 w-8"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPeekDiagram(diagram);
                  }}
                >
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">Peek diagram</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground h-8 w-8"
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
                    <DropdownMenuItem onClick={(e) => handleShare(e, diagram.id)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      <span>Copy link</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleFavorite(e, diagram.id)}>
                      <Star
                        className={cn(
                          'mr-2 h-4 w-4',
                          diagram.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''
                        )}
                      />
                      <span>{diagram.isFavorite ? 'Unstar' : 'Star'}</span>
                    </DropdownMenuItem>

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Download className="mr-2 h-4 w-4" />
                        <span>Download</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDownload(diagram, 'svg');
                          }}
                        >
                          SVG
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDownload(diagram, 'png');
                          }}
                        >
                          PNG
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDownload(diagram, 'pdf');
                          }}
                        >
                          PDF
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteId(diagram.id);
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
          <CardContent className="pointer-events-none relative z-10 flex-1">
            {diagram.description && (
              <p className="text-muted-foreground mb-3 line-clamp-2 text-xs">
                {diagram.description}
              </p>
            )}
            {diagram.tags && diagram.tags.length > 0 && (
              <div className="pointer-events-auto mb-2 flex flex-wrap gap-1">
                {diagram.tags.map((tag) => (
                  <TagBadge key={tag.id} tag={tag} />
                ))}
              </div>
            )}
            <div className="bg-muted/50 h-24 overflow-hidden rounded-md p-3">
              <pre className="text-muted-foreground line-clamp-4 font-mono text-xs whitespace-pre-wrap">
                {diagram.content}
              </pre>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      <div className="bg-background text-foreground flex min-h-screen flex-col">
        {/* Header */}
        <header className="bg-background/80 sticky top-0 z-50 shrink-0 border-b backdrop-blur-sm">
          <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="flex items-center gap-2 transition-opacity hover:opacity-80"
              >
                <span className="text-2xl" role="img" aria-label="atlantis logo">
                  🔱
                </span>
                <h1 className="text-xl font-bold">atlantis // Diagrams</h1>
              </Link>
            </div>

            <div className="flex max-w-md flex-1 justify-center">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Open search"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Search</span>
                <span className="text-muted-foreground hidden text-xs lg:inline">
                  {shortcutHint}
                </span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleCreate} className="gap-2" disabled={isCreating}>
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={18} />}
                <span className="hidden sm:inline">
                  {isCreating ? 'Creating...' : 'New Diagram'}
                </span>
              </Button>

              <Button variant="outline" className="gap-2" asChild>
                <Link href="/settings">
                  <Settings2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                  <span className="text-muted-foreground hidden text-xs lg:inline">
                    Auto-save {settings.autoSave ? 'On' : 'Off'}
                  </span>
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto flex-1 px-4 py-8">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
          ) : diagrams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Card className="max-w-md border-dashed text-center">
                <CardHeader className="space-y-3 pb-4">
                  <div className="flex justify-center">
                    <span className="text-5xl" role="img" aria-label="atlantis logo">
                      🔱
                    </span>
                  </div>
                  <CardTitle className="text-2xl">No diagrams yet</CardTitle>
                  <CardDescription className="space-y-1">
                    Create your first Mermaid diagram to get started.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <Button onClick={handleCreate} className="gap-2">
                    <Plus size={18} />
                    Create Your First Diagram
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-8">
              {hasStarred && (
                <section>
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>Starred //</span>
                    <span className="text-muted-foreground">{starredDiagrams.length}</span>
                  </h2>
                  {renderDiagramGrid(starredDiagrams)}
                </section>
              )}

              {(otherDiagrams.length > 0 || !hasStarred) && (
                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <h2
                      className={cn(
                        'flex items-center gap-2 text-lg font-semibold',
                        hasStarred && 'text-muted-foreground'
                      )}
                    >
                      <span>All diagrams //</span>
                      <span className="text-muted-foreground">
                        {otherDiagrams.length} of {Math.max(total - starredDiagrams.length, 0)}
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
                        <DropdownMenuRadioGroup
                          value={sortMode}
                          onValueChange={(v) => handleSortChange(v as SortOption)}
                        >
                          <DropdownMenuRadioItem value="recent">Recent</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="old">Oldest</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="alphabetical">
                            Alphabetical
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="versions">Versions</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {renderDiagramGrid(otherDiagrams)}
                </section>
              )}

              {isFetchingMore && (
                <div
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  aria-hidden
                >
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
        <footer className="mt-auto shrink-0 border-t py-6">
          <div className="text-muted-foreground container mx-auto px-4 text-center text-sm">
            Powered by{' '}
            <a
              href="https://mermaid.js.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground underline transition-colors"
            >
              Mermaid.js
            </a>
          </div>
        </footer>
      </div>

      <GlobalSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        initialDiagrams={diagrams}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete diagram?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{diagramToDelete?.title}&rdquo;. This action
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

      <PeekDiagramModal
        diagram={peekDiagram}
        onClose={() => setPeekDiagram(null)}
        onDelete={(id) => {
          setPeekDiagram(null);
          setDeleteId(id);
        }}
      />
    </>
  );
}
