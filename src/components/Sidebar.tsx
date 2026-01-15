'use client';

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
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDiagramStore } from '@/lib/store';
import { Diagram } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';
import { Download, Plus, Search, Star, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface SidebarProps {
  diagrams: Diagram[];
  currentDiagramId?: string;
}

// Max characters for diagram title display
const MAX_TITLE_LENGTH = 24;

function truncateTitle(title: string): string {
  if (title.length <= MAX_TITLE_LENGTH) return title;
  return title.slice(0, MAX_TITLE_LENGTH - 1) + '…';
}

export function Sidebar({ diagrams: initialDiagrams, currentDiagramId }: SidebarProps) {
  const {
    diagrams,
    setDiagrams,
    toggleFavorite,
    removeDiagram,
    addDiagram,
    settings,
    setAutoSave,
  } = useDiagramStore();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Sync initial diagrams to store
  useEffect(() => {
    if (initialDiagrams.length > 0) {
      setDiagrams(initialDiagrams);
    }
    setIsLoading(false);
  }, [initialDiagrams, setDiagrams]);

  const filteredDiagrams = diagrams
    .filter((d) => d.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      // Favorites first, then updated recently
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
      addDiagram(newDiagram);
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
      removeDiagram(deleteId);
      toast.success('Diagram deleted');
      // If we deleted the current diagram, go home
      if (currentDiagramId === deleteId) {
        router.push('/');
      }
    } catch {
      toast.error('Failed to delete diagram');
    } finally {
      setDeleteId(null);
    }
  };

  const handleFavorite = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const diagram = diagrams.find(d => d.id === id);
    if (!diagram) return;

    toggleFavorite(id);
    await fetch(`/api/diagrams/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ isFavorite: !diagram.isFavorite }),
    });
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

  const diagramToDelete = deleteId ? diagrams.find(d => d.id === deleteId) : null;

  return (
    <>
      <div className="flex flex-col h-full border-r bg-background">
        <div className="p-3 space-y-3">
          <Link href="/" className="flex items-center gap-2 px-1 hover:opacity-80 transition-opacity">
            <span className="text-xl" role="img" aria-label="atlantis logo">🔱</span>
            <h1 className="text-lg font-semibold text-foreground">
              atlantis
            </h1>
          </Link>

          <Button 
            onClick={handleCreate} 
            variant="outline"
            className="w-full justify-start gap-2"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            New Diagram
          </Button>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <Input
              placeholder="Search..."
              className="pl-8 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-3">
          <div className="space-y-1 pb-3">
            {isLoading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-2 rounded-md">
                    <Skeleton className="h-4 w-3/4 mb-1.5" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </>
            ) : filteredDiagrams.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {search ? 'No diagrams found' : 'No diagrams yet'}
              </div>
            ) : (
              filteredDiagrams.map((diagram) => (
                <Link
                  key={diagram.id}
                  href={`/${diagram.id}`}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                    currentDiagramId === diagram.id
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <span className="text-base shrink-0">{diagram.emoji || '📊'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-sm" title={diagram.title}>
                        {truncateTitle(diagram.title)}
                      </span>
                      {diagram.isFavorite && (
                        <Star className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400" strokeWidth={1.5} />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(diagram.updatedAt)}
                    </span>
                  </div>
                  <div className="flex items-center shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="p-1 rounded hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => handleFavorite(e, diagram.id)}
                        >
                          <Star 
                            className={cn(
                              "h-3.5 w-3.5",
                              diagram.isFavorite && "fill-yellow-400 text-yellow-400"
                            )} 
                            strokeWidth={1.5} 
                          />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {diagram.isFavorite ? 'Unfavorite' : 'Favorite'}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteId(diagram.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">Delete</TooltipContent>
                    </Tooltip>
                  </div>
                </Link>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-3 border-t space-y-3">
          <div className="flex items-center justify-between text-sm">
            <label htmlFor="auto-save" className="text-muted-foreground">
              Auto-save
            </label>
            <Switch
              id="auto-save"
              checked={settings.autoSave}
              onCheckedChange={setAutoSave}
            />
          </div>

          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBackup}>
                  <Download className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Backup</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestore}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 pointer-events-none">
                    <Upload className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Restore</TooltipContent>
            </Tooltip>
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Powered by{' '}
            <a
              href="https://mermaid.js.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              Mermaid.js
            </a>
          </p>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete diagram?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{diagramToDelete?.title}&rdquo;. This action cannot be undone.
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
