'use client';

import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ensureCsrfToken, CSRF_HEADER_NAME } from '@/lib/csrf-client';
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

type NodeSelection = { id: string; label?: string };
type TextRange = { from: number; to: number };

const COLOR_PRESETS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Slate', value: '#94a3b8' }
] as const;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findNodeDefinitionRange = (content: string, nodeId: string): TextRange | null => {
  const pattern = new RegExp(
    `(^|\\s)${escapeRegExp(nodeId)}\\s*(\\[|\\(|\\{|\"|:::|>|\\{\\{)`,
    'm'
  );
  const match = pattern.exec(content);
  if (!match || match.index === undefined) return null;

  const lineStart = content.lastIndexOf('\n', match.index) + 1;
  const lineEnd = content.indexOf('\n', match.index);
  return {
    from: lineStart,
    to: lineEnd === -1 ? content.length : lineEnd
  };
};

const getNodeFillColor = (content: string, nodeId: string): string | null => {
  const styleRegex = new RegExp(`^\\s*style\\s+${escapeRegExp(nodeId)}\\s+([^\\n]+)$`, 'm');
  const match = styleRegex.exec(content);
  if (!match) return null;
  const fillMatch = match[1].match(/fill:\\s*([^,\\s]+)/);
  return fillMatch ? fillMatch[1].trim() : null;
};

const upsertNodeStyleLine = (content: string, nodeId: string, color: string | null): string => {
  const lines = content.split('\n');
  const styleRegex = new RegExp(`^\\s*style\\s+${escapeRegExp(nodeId)}\\s+([^\\n]+)$`);
  const nodeRegex = new RegExp(
    `(^|\\s)${escapeRegExp(nodeId)}\\s*(\\[|\\(|\\{|\"|:::|>|\\{\\{)`
  );
  const styleIndex = lines.findIndex((line) => styleRegex.test(line));
  const nodeIndex = lines.findIndex((line) => nodeRegex.test(line));

  if (color === null) {
    if (styleIndex !== -1) {
      lines.splice(styleIndex, 1);
    }
    return lines.join('\n');
  }

  const buildProps = (existing?: string) => {
    const parts = (existing ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    let hasFill = false;
    let hasStroke = false;
    let hasStrokeWidth = false;

    const updated = parts.map((part) => {
      if (part.startsWith('fill:')) {
        hasFill = true;
        return `fill:${color}`;
      }
      if (part.startsWith('stroke:')) {
        hasStroke = true;
        return part;
      }
      if (part.startsWith('stroke-width')) {
        hasStrokeWidth = true;
        return part;
      }
      return part;
    });

    if (!hasFill) updated.unshift(`fill:${color}`);
    if (!hasStroke) updated.push('stroke:#333');
    if (!hasStrokeWidth) updated.push('stroke-width:1px');

    return updated.join(',');
  };

  if (styleIndex !== -1) {
    const match = lines[styleIndex].match(styleRegex);
    const props = match?.[1] ?? '';
    lines[styleIndex] = `style ${nodeId} ${buildProps(props)}`;
  } else {
    const insertAt = nodeIndex !== -1 ? nodeIndex + 1 : lines.length;
    lines.splice(insertAt, 0, `style ${nodeId} ${buildProps()}`);
  }

  return lines.join('\n');
};

export function DiagramEditor({ initialDiagram }: DiagramEditorProps) {
  const [diagram, setDiagram] = useState<Diagram>(initialDiagram);
  const [mounted, setMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<NodeSelection | null>(null);
  const [selectionRange, setSelectionRange] = useState<TextRange | null>(null);
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

  useEffect(() => {
    if (!selectedNode) {
      setSelectionRange(null);
      return;
    }
    const range = findNodeDefinitionRange(diagram.content, selectedNode.id);
    setSelectionRange(range);
  }, [diagram.content, selectedNode]);

  const handleEditorChange = (value: string) => {
    setDiagram((prev) => ({ ...prev, content: value }));
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiagram((prev) => ({ ...prev, title: e.target.value }));
  };

  const handleNodeSelect = useCallback((node: NodeSelection) => {
    setSelectedNode(node);
    const range = findNodeDefinitionRange(diagram.content, node.id);
    setSelectionRange(range);
  }, [diagram.content]);

  const handleNodeColorChange = useCallback((color: string | null) => {
    if (!selectedNode) return;
    setDiagram((prev) => {
      const updatedContent = upsertNodeStyleLine(prev.content, selectedNode.id, color);
      return { ...prev, content: updatedContent };
    });
  }, [selectedNode]);

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

  const selectedNodeColor = selectedNode ? getNodeFillColor(diagram.content, selectedNode.id) : null;

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
              <Editor
                value={diagram.content}
                onChange={handleEditorChange}
                selectionRange={selectionRange}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={55} minSize={25}>
              <Canvas
                code={diagram.content}
                diagramId={diagram.id}
                title={diagram.title}
                selectedNodeId={selectedNode?.id}
                onNodeSelect={handleNodeSelect}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      {selectedNode && (
        <div className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border bg-background/90 px-4 py-2 shadow-lg backdrop-blur">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Block {selectedNode.label || selectedNode.id}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3"
              onClick={() => handleNodeColorChange(null)}
            >
              Default
            </Button>
            <div className="flex items-center gap-1">
              {COLOR_PRESETS.map((color) => {
                const isActive = selectedNodeColor === color.value;
                return (
                  <button
                    key={color.value}
                    type="button"
                    aria-label={`Set ${selectedNode.label ?? selectedNode.id} color to ${color.name}`}
                    className={`h-8 w-8 rounded-full border border-border shadow-sm transition-transform duration-150 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${isActive ? 'ring-2 ring-offset-2 ring-primary ring-offset-background' : ''}`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => handleNodeColorChange(color.value)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      <GlobalSearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </>
  );
}
