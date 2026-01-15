'use client';

import { Canvas } from '@/components/Canvas';
import { Editor } from '@/components/Editor';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDiagramStore } from '@/lib/store';
import { Diagram } from '@/lib/types';
import { copyToClipboard } from '@/lib/utils';
import { Menu, Moon, Save, Share2, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface DiagramEditorProps {
  initialDiagram: Diagram;
  allDiagrams: Diagram[];
}

export function DiagramEditor({ initialDiagram, allDiagrams }: DiagramEditorProps) {
  const [diagram, setDiagram] = useState<Diagram>(initialDiagram);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { setTheme, theme } = useTheme();
  const { settings, updateDiagram } = useDiagramStore();
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
      // Update store so sidebar reflects changes
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
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground flex">
      {/* Mobile sidebar trigger */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden fixed top-3 left-3 z-50"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar diagrams={allDiagrams} currentDiagramId={diagram.id} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden md:block w-64 shrink-0 h-full">
        <Sidebar diagrams={allDiagrams} currentDiagramId={diagram.id} />
      </div>

      {/* Main content area */}
      <div className="flex-1 h-full flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 border-b flex items-center justify-between px-4 bg-background/50 backdrop-blur-sm z-10 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden pl-10 md:pl-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl shrink-0">{diagram.emoji || '📊'}</span>
              <input
                value={diagram.title}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                className="bg-transparent border-none text-lg font-medium focus:outline-none focus:ring-0 px-0 w-48 sm:w-64 truncate"
                placeholder="Untitled Diagram"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              /{diagram.id}
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy link to clipboard</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle theme</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => saveChanges()} size="sm" className="gap-2">
                  <Save size={16} />
                  <span className="hidden sm:inline">Save</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save changes (Ctrl+S)</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Editor and Canvas */}
        <div className="flex-1 min-h-0">
          <ResizablePanelGroup>
            <ResizablePanel defaultSize={40} minSize={20}>
              <Editor value={diagram.content} onChange={handleEditorChange} />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={60} minSize={20}>
              <Canvas code={diagram.content} diagramId={diagram.id} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
}
