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
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GlobalSearchDialog } from '@/components/GlobalSearchDialog';
import { useDiagramStore } from '@/lib/store';
import { Diagram } from '@/lib/types';
import { cn, copyToClipboard, formatDate } from '@/lib/utils';
import { Download, Moon, Plus, Share2, Star, Sun, Trash2, Upload, BookOpen, Settings2, Search } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
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

  const sortedDiagrams = [...diagrams].sort((a, b) => {
    if (a.isFavorite === b.isFavorite) {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
    return a.isFavorite ? -1 : 1;
  });

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

  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
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
        <main className="container mx-auto px-4 py-8">
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
          ) : sortedDiagrams.length === 0 ? (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedDiagrams.map((diagram) => (
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
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => handleShare(e, diagram.id)}
                              >
                                <Share2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy link</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => handleFavorite(e, diagram.id)}
                              >
                                <Star
                                  className={cn(
                                    'h-4 w-4',
                                    diagram.isFavorite
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-muted-foreground'
                                  )}
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {diagram.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDeleteId(diagram.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete diagram</TooltipContent>
                          </Tooltip>
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
          )}
        </main>

        {/* Footer */}
        <footer className="border-t py-6 mt-8">
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
