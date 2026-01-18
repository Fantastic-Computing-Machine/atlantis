'use client';

import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ensureCsrfToken, CSRF_HEADER_NAME } from '@/lib/csrf-client';
import { useDiagramStore } from '@/lib/store';
import { Checkpoint, Diagram } from '@/lib/types';
import { useShortcutPlatform } from '@/lib/use-platform';
import { copyToClipboard, formatDate } from '@/lib/utils';
import { History, Info, Moon, Save, Search, Share2, Star, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { GlobalSearchDialog } from '@/components/GlobalSearchDialog';

const Canvas = dynamic(() => import('@/components/Canvas').then((mod) => mod.Canvas), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
      Loading Canvas...
    </div>
  ),
});

const Editor = dynamic(() => import('@/components/Editor').then((mod) => mod.Editor), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-muted/30 animate-pulse" />,
});

const MAX_CHECKPOINTS = 15;

interface DiagramEditorProps {
  initialDiagram: Diagram;
}

export function DiagramEditor({ initialDiagram }: DiagramEditorProps) {
  const [diagram, setDiagram] = useState<Diagram>(initialDiagram);
  const [mounted, setMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const { shortcutHint } = useShortcutPlatform();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [isLoadingCheckpoints, setIsLoadingCheckpoints] = useState(false);
  const [isSavingCheckpoint, setIsSavingCheckpoint] = useState(false);
  const { setTheme, theme } = useTheme();
  const settings = useDiagramStore((state) => state.settings);
  const updateDiagram = useDiagramStore((state) => state.updateDiagram);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef(initialDiagram.content);
  const lastSavedTitleRef = useRef(initialDiagram.title);
  const lastSavedDescriptionRef = useRef(initialDiagram.description);

  // Prevent hydration mismatch by only rendering client-dependent UI after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEditorChange = (value: string) => {
    setDiagram((prev) => ({ ...prev, content: value }));
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiagram((prev) => ({ ...prev, title: e.target.value }));
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDiagram((prev) => ({ ...prev, description: e.target.value }));
  };

  const saveChanges = useCallback(async (showToast = true) => {
    try {
      const csrfToken = await ensureCsrfToken();
      const res = await fetch(`/api/diagrams/${diagram.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrfToken,
        },
        body: JSON.stringify(diagram),
      });
      if (!res.ok) throw new Error('Failed to save');
      const updated = await res.json();
      setDiagram((prev) => ({ ...prev, updatedAt: updated.updatedAt }));
      updateDiagram(diagram.id, {
        title: diagram.title,
        description: diagram.description,
        content: diagram.content,
        updatedAt: updated.updatedAt
      });
      lastSavedContentRef.current = diagram.content;
      lastSavedTitleRef.current = diagram.title;
      lastSavedDescriptionRef.current = diagram.description;
      if (showToast) {
        toast.success('Changes saved');
      }
    } catch {
      toast.error('Failed to save changes');
    }
  }, [diagram, updateDiagram]);

  // Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveChanges();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveChanges]);

  // Auto-save with debounce
  useEffect(() => {
    if (!settings.autoSave) return;

    const hasContentChanged = diagram.content !== lastSavedContentRef.current;
    const hasTitleChanged = diagram.title !== lastSavedTitleRef.current;
    const hasDescriptionChanged = diagram.description !== lastSavedDescriptionRef.current;

    if (!hasContentChanged && !hasTitleChanged && !hasDescriptionChanged) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer for auto-save (2 second debounce)
    autoSaveTimerRef.current = setTimeout(() => {
      saveChanges(false); // Silent save
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [diagram.content, diagram.title, diagram.description, settings.autoSave, saveChanges]);

  // Save on blur for title (if auto-save is off)
  const handleTitleBlur = () => {
    if (!settings.autoSave) {
      saveChanges();
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/${diagram.id}`;
    const success = await copyToClipboard(url);
    if (success) {
      toast.success('Link copied to clipboard');
    } else {
      toast.error('Failed to copy link');
    }
  };

  const handleFavorite = async () => {
    try {
      const nextFavorite = !diagram.isFavorite;
      setDiagram((prev) => ({ ...prev, isFavorite: nextFavorite }));
      updateDiagram(diagram.id, { isFavorite: nextFavorite });
      const csrfToken = await ensureCsrfToken();
      await fetch(`/api/diagrams/${diagram.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrfToken,
        },
        body: JSON.stringify({ isFavorite: nextFavorite }),
      });
      toast.success(nextFavorite ? 'Added to favorites' : 'Removed from favorites');
    } catch {
      toast.error('Failed to update favorite');
    }
  };

  const loadCheckpoints = useCallback(async () => {
    setIsLoadingCheckpoints(true);
    try {
      const res = await fetch(`/api/diagrams/${diagram.id}/checkpoint`);
      if (!res.ok) throw new Error('Failed to load checkpoints');
      const data = await res.json();
      setCheckpoints(data.checkpoints ?? []);
    } catch {
      toast.error('Failed to load checkpoints');
    } finally {
      setIsLoadingCheckpoints(false);
    }
  }, [diagram.id]);

  useEffect(() => {
    loadCheckpoints();
  }, [loadCheckpoints]);

  const handleSaveCheckpoint = useCallback(async () => {
    setIsSavingCheckpoint(true);
    try {
      const csrfToken = await ensureCsrfToken();
      const res = await fetch(`/api/diagrams/${diagram.id}/checkpoint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrfToken,
        },
        body: JSON.stringify({
          content: diagram.content,
          title: diagram.title,
          emoji: diagram.emoji,
          isFavorite: diagram.isFavorite,
        }),
      });
      if (!res.ok) throw new Error('Failed to create checkpoint');
      const data = await res.json();
      setDiagram((prev) => ({ ...prev, updatedAt: data.diagram.updatedAt }));
      updateDiagram(diagram.id, { updatedAt: data.diagram.updatedAt });
      setCheckpoints((prev) => {
        const next = [data.checkpoint as Checkpoint, ...prev.filter((cp) => cp.id !== data.checkpoint.id)];
        return next.slice(0, MAX_CHECKPOINTS);
      });
      toast.success('Checkpoint saved');
    } catch {
      toast.error('Failed to save checkpoint');
    } finally {
      setIsSavingCheckpoint(false);
    }
  }, [diagram, updateDiagram]);

  const handleSelectCheckpoint = (checkpointId: string) => {
    const checkpoint = checkpoints.find((cp) => cp.id === checkpointId);
    if (!checkpoint) return;
    setDiagram((prev) => ({ ...prev, content: checkpoint.content }));
    updateDiagram(diagram.id, { content: checkpoint.content });
    toast.success('Checkpoint loaded');
  };

  // Show loading state until client hydration is complete
  if (!mounted) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-background text-foreground flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-2xl">🔱</span>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col">
        <div className="h-14 border-b grid grid-cols-[1fr_auto_1fr] items-center px-4 bg-background/50 backdrop-blur-sm z-10 shrink-0 gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center gap-2 min-w-0 text-lg font-medium">
              <Link href="/" className="shrink-0 hover:opacity-80 transition-opacity">
                🔱atlantis //
              </Link>
              <span className="text-xl shrink-0">{diagram.emoji || '📊'}</span>
              <input
                value={diagram.title}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                maxLength={60}
                className="bg-transparent border-none focus:outline-none focus:ring-0 px-0 w-48 sm:w-64 truncate"
                placeholder="Untitled Diagram"
              />
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search diagrams"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
              <span className="text-[11px] text-muted-foreground hidden lg:inline">{shortcutHint}</span>
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsInfoOpen(true)}
              aria-label="Diagram Info"
            >
              <Info className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>

            <Button
              variant={diagram.isFavorite ? 'default' : 'ghost'}
              size="icon"
              onClick={handleFavorite}
              aria-pressed={diagram.isFavorite}
              className={diagram.isFavorite ? 'bg-amber-500 text-amber-50 hover:bg-amber-500/90' : ''}
            >
              <Star className={diagram.isFavorite ? 'h-4 w-4 fill-current' : 'h-4 w-4'} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleSaveCheckpoint}
                disabled={isSavingCheckpoint}
              >
                <History size={16} />
                <span className="hidden sm:inline">Checkpoint</span>
              </Button>

              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleSelectCheckpoint(e.target.value);
                    e.target.value = '';
                  }
                }}
                disabled={isLoadingCheckpoints || checkpoints.length === 0}
                aria-label="Switch checkpoint"
              >
                <option value="" disabled>
                  {isLoadingCheckpoints ? 'Loading...' : 'Switch checkpoint'}
                </option>
                {checkpoints.map((cp) => (
                  <option key={cp.id} value={cp.id}>
                    {new Date(cp.updatedAt).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <Button onClick={() => saveChanges()} size="sm" className="gap-2">
              <Save size={16} />
              <span className="hidden sm:inline">Save</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          {/* Mobile View: Tabs */}
          <div className="block md:hidden h-full">
            <Tabs defaultValue="preview" className="h-full flex flex-col">
              <div className="px-4 py-2 border-b">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="code">Code</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="code" className="flex-1 min-h-0 mt-0">
                <Editor value={diagram.content} onChange={handleEditorChange} />
              </TabsContent>
              <TabsContent value="preview" className="flex-1 min-h-0 mt-0 relative">
                <Canvas code={diagram.content} diagramId={diagram.id} title={diagram.title} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Desktop View: Split Pane */}
          <div className="hidden md:block h-full">
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={45} minSize={25}>
                <Editor value={diagram.content} onChange={handleEditorChange} />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={55} minSize={25}>
                <Canvas code={diagram.content} diagramId={diagram.id} title={diagram.title} />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </div>

      <GlobalSearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />

      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Diagram Info</DialogTitle>
            <DialogDescription>
              View and edit diagram details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <input
                id="title"
                value={diagram.title}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={diagram.description}
                onChange={handleDescriptionChange}
                onBlur={handleTitleBlur}
                maxLength={400}
                className="h-32 resize-none"
                placeholder="Add a description..."
              />
              <p className="text-xs text-muted-foreground text-right">
                {diagram.description?.length || 0}/400
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mt-2">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(diagram.createdAt)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Updated</span>
                <span>{formatDate(diagram.updatedAt)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Versions</span>
                <span>{diagram.totalVersions}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
