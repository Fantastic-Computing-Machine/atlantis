'use client';

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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { GlobalSearchDialog } from '@/components/GlobalSearchDialog';
import { useDiagramStore } from '@/lib/store';
import { Diagram } from '@/lib/types';
import { cn, copyToClipboard, formatDate, sanitizeFilename } from '@/lib/utils';
import { Download, Moon, Plus, Share2, Star, Sun, Trash2, Upload, BookOpen, Settings2, Search, MoreHorizontal, Github } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import mermaid from 'mermaid';
import { jsPDF } from 'jspdf';
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

interface DiagramGridProps {
  initialDiagrams: Diagram[];
  enableApiAccess?: boolean;
}

export function DiagramGrid({ initialDiagrams, enableApiAccess }: DiagramGridProps) {
  const [diagrams, setDiagrams] = useState<Diagram[]>(initialDiagrams);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { setTheme, theme } = useTheme();
  const { settings, setAutoSave } = useDiagramStore();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDiagrams(initialDiagrams);
    setIsLoading(false);
  }, [initialDiagrams]);

  const starredDiagrams = diagrams
    .filter((d) => d.isFavorite)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const otherDiagrams = diagrams
    .filter((d) => !d.isFavorite)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const hasStarred = starredDiagrams.length > 0;

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/diagrams', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const newDiagram = await res.json();
      toast.success('New diagram created');
      router.push(`/${newDiagram.id}`);
    } catch {
      toast.error('Failed to create diagram');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await fetch(`/api/diagrams/${deleteId}`, { method: 'DELETE' });
      setDiagrams((prev) => prev.filter((d) => d.id !== deleteId));
      toast.success('Diagram deleted');
    } catch {
      toast.error('Failed to delete diagram');
    } finally {
      setDeleteId(null);
    }
  };

  const handleFavorite = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const diagram = diagrams.find((d) => d.id === id);
    if (!diagram) return;

    setDiagrams((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isFavorite: !d.isFavorite } : d))
    );

    await fetch(`/api/diagrams/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ isFavorite: !diagram.isFavorite }),
    });
  };

  const handleShare = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/${id}`;
    const success = await copyToClipboard(url);
    if (success) {
      toast.success('Link copied to clipboard');
    } else {
      toast.error('Failed to copy link');
    }
  };

  const handleDownload = async (diagram: Diagram, format: 'svg' | 'png' | 'pdf') => {
    try {
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
          const isLandscape = svgWidth > svgHeight;
          const pdf = new jsPDF({
            orientation: isLandscape ? 'landscape' : 'portrait',
            unit: 'px',
            format: [svgWidth + 40, svgHeight + 40]
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

  const handleBackup = () => {
    window.location.href = '/api/backup';
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/backup', {
          method: 'POST',
          body: JSON.stringify(json),
        });
        if (res.ok) {
          const newRes = await fetch('/api/diagrams');
          const data = await newRes.json();
          setDiagrams(data);
          toast.success('Backup restored successfully');
        } else {
          throw new Error('Restore failed');
        }
      } catch {
        toast.error('Failed to restore backup');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const openRestorePicker = () => {
    fileInputRef.current?.click();
  };

  const diagramToDelete = deleteId ? diagrams.find((d) => d.id === deleteId) : null;

  const renderDiagramGrid = (list: Diagram[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {list.map((diagram) => (
        <Link key={diagram.id} href={`/${diagram.id}`} className="group">
          <Card
            className={cn(
              'overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/50 h-full',
              'cursor-pointer'
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-2xl shrink-0">{diagram.emoji || '📊'}</span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{diagram.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {formatDate(diagram.updatedAt)}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center">
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
                        onClick={(e) => handleShare(e, diagram.id)}
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        <span>Copy link</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleFavorite(e, diagram.id)}
                      >
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
            <CardContent>
              <div className="bg-muted/50 rounded-md p-3 h-24 overflow-hidden">
                <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap line-clamp-4">
                  {diagram.content}
                </pre>
              </div>
            </CardContent>
          </Card>
        </Link>
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
              <span className="text-2xl" role="img" aria-label="atlantis logo">
                🔱
              </span>
              <h1 className="text-xl font-bold">atlantis</h1>
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
                <span className="text-xs text-muted-foreground hidden lg:inline">Ctrl / Cmd + K</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                asChild
                className="hidden sm:flex"
              >
                <a
                  href="https://github.com/Fantastic-Computing-Machine/atlantis"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub Repository"
                >
                  <Github className="h-4 w-4" />
                </a>
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleRestore}
                className="hidden"
              />

              <Button onClick={handleCreate} className="gap-2">
                <Plus size={18} />
                <span className="hidden sm:inline">New Diagram</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                    <span className="text-xs text-muted-foreground hidden lg:inline">
                      Auto-save {settings.autoSave ? 'On' : 'Off'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Quick settings</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      setTheme(theme === 'dark' ? 'light' : 'dark');
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {theme === 'dark' ? (
                        <Sun className="h-4 w-4" />
                      ) : (
                        <Moon className="h-4 w-4" />
                      )}
                      <span>{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="flex items-center justify-between gap-4"
                    onSelect={(event) => event.preventDefault()}
                  >
                    <div className="flex flex-col">
                      <span>Auto-save</span>
                      <span className="text-xs text-muted-foreground">Platform-wide 2s debounce</span>
                    </div>
                    <Switch checked={settings.autoSave} onCheckedChange={setAutoSave} />
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      handleBackup();
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      <span>Backup diagrams</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      openRestorePicker();
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      <span>Restore from backup</span>
                    </div>
                  </DropdownMenuItem>

                  {enableApiAccess && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/docs" className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          <span>API Documentation</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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
          ) : diagrams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Card className="max-w-md text-center border-dashed">
                <CardHeader className="pb-4 space-y-3">
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
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    Starred
                  </h2>
                  {renderDiagramGrid(starredDiagrams)}
                </section>
              )}
              
              {(otherDiagrams.length > 0 || !hasStarred) && (
                <section>
                  {hasStarred && (
                    <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
                      Other diagrams
                    </h2>
                  )}
                  {renderDiagramGrid(otherDiagrams)}
                </section>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t py-6 mt-auto shrink-0">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            Powered by{' '}
            <a
              href="https://mermaid.js.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
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
    </>
  );
}
