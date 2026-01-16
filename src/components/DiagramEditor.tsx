'use client';

import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useDiagramStore } from '@/lib/store';
import { Diagram } from '@/lib/types';
import { copyToClipboard } from '@/lib/utils';
import { Moon, Save, Search, Share2, Star, Sun } from 'lucide-react';
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

interface DiagramEditorProps {
  initialDiagram: Diagram;
}

export function DiagramEditor({ initialDiagram }: DiagramEditorProps) {
  const [diagram, setDiagram] = useState<Diagram>(initialDiagram);
  const [mounted, setMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { setTheme, theme } = useTheme();
  const settings = useDiagramStore((state) => state.settings);
  const updateDiagram = useDiagramStore((state) => state.updateDiagram);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef(initialDiagram.content);
  const lastSavedTitleRef = useRef(initialDiagram.title);

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

  const saveChanges = useCallback(async (showToast = true) => {
    try {
      const res = await fetch(`/api/diagrams/${diagram.id}`, {
        method: 'PUT',
        body: JSON.stringify(diagram),
      });
      if (!res.ok) throw new Error('Failed to save');
      const updated = await res.json();
      setDiagram((prev) => ({ ...prev, updatedAt: updated.updatedAt }));
      updateDiagram(diagram.id, {
        title: diagram.title,
        content: diagram.content,
        updatedAt: updated.updatedAt
      });
      lastSavedContentRef.current = diagram.content;
      lastSavedTitleRef.current = diagram.title;
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

    if (!hasContentChanged && !hasTitleChanged) return;

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
  }, [diagram.content, diagram.title, settings.autoSave, saveChanges]);

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
      await fetch(`/api/diagrams/${diagram.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isFavorite: nextFavorite }),
      });
      toast.success(nextFavorite ? 'Added to favorites' : 'Removed from favorites');
    } catch {
      toast.error('Failed to update favorite');
    }
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
              <span className="text-[11px] text-muted-foreground hidden lg:inline">Ctrl / Cmd + K</span>
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2">
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

            <Button onClick={() => saveChanges()} size="sm" className="gap-2">
              <Save size={16} />
              <span className="hidden sm:inline">Save</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
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

      <GlobalSearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </>
  );
}
