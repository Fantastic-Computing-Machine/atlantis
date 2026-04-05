'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Star, Loader2, FileText, PenSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useShortcutPlatform } from '@/lib/use-platform';
import { cn, formatDate } from '@/lib/utils';
import type { Diagram, Note } from '@/lib/types';

type SearchResult = {
  id: string;
  type: 'diagram' | 'note';
  title: string;
  emoji: string;
  updatedAt: string;
  isFavorite: boolean;
  content?: string;
  language?: string;
};

type GlobalSearchDialogProps = {
  initialDiagrams?: Diagram[];
  onSelect?: (item: SearchResult) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function GlobalSearchDialog({
  initialDiagrams,
  onSelect,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: GlobalSearchDialogProps & { hideTrigger?: boolean } = {}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const { shortcutSymbol } = useShortcutPlatform();

  // Convert initial diagrams to search results
  useEffect(() => {
    if (initialDiagrams) {
      const mapped: SearchResult[] = initialDiagrams.map((d) => ({
        id: d.id,
        type: 'diagram',
        title: d.title,
        emoji: d.emoji || '📊',
        updatedAt: d.updatedAt,
        isFavorite: d.isFavorite,
        content: d.content,
      }));
      setResults(mapped);
    }
  }, [initialDiagrams]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isModifier = event.metaKey || event.ctrlKey;
      if (isModifier && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery('');
      setError(null);
      itemRefs.current = [];
      controllerRef.current?.abort();
      controllerRef.current = null;
    }
  }, [open, setOpen]);

  // Fetch both diagrams and notes
  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;

    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: '25', offset: '0' });
        const normalized = query.trim();
        if (normalized) {
          params.set('query', normalized);
        }

        // Fetch diagrams and notes in parallel
        const [diagramsRes, notesRes] = await Promise.all([
          fetch(`/api/diagrams?${params.toString()}`, { signal: controller.signal }),
          fetch(`/api/notes?${params.toString()}`, { signal: controller.signal }),
        ]);

        if (!diagramsRes.ok || !notesRes.ok) {
          throw new Error('Failed to fetch results');
        }

        const [diagramsData, notesData] = await Promise.all([diagramsRes.json(), notesRes.json()]);

        const diagramItems: SearchResult[] = (diagramsData.items || []).map((d: Diagram) => ({
          id: d.id,
          type: 'diagram' as const,
          title: d.title,
          emoji: d.emoji || '📊',
          updatedAt: d.updatedAt,
          isFavorite: d.isFavorite,
          content: d.content,
        }));

        const noteItems: SearchResult[] = (notesData.items || []).map(
          (n: Omit<Note, 'content'>) => ({
            id: n.id,
            type: 'note' as const,
            title: n.title,
            emoji: n.emoji || '📝',
            updatedAt: n.updatedAt,
            isFavorite: n.starred,
            language: n.language,
          })
        );

        // Combine and sort by favorite first, then by date
        const combined = [...diagramItems, ...noteItems].sort((a, b) => {
          if (a.isFavorite !== b.isFavorite) {
            return a.isFavorite ? -1 : 1;
          }
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

        setResults(combined);
        setActiveIndex(0);
        itemRefs.current = [];
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unable to load results');
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [open, query]);

  useEffect(() => {
    if (!results.length) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((prev) => Math.min(prev, results.length - 1));
  }, [results]);

  useEffect(() => {
    const node = itemRefs.current[activeIndex];
    if (node) {
      node.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleSelect = (item: SearchResult) => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
    if (onSelect) {
      onSelect(item);
    } else {
      if (item.type === 'diagram') {
        router.push(`/diagram/${item.id}`);
      } else {
        router.push(`/notes/${item.id}`);
      }
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (results.length ? (prev + 1) % results.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => {
        if (!results.length) return 0;
        return prev === 0 ? results.length - 1 : prev - 1;
      });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = results[activeIndex] ?? results[0];
      if (target) handleSelect(target);
    }
  };

  const highlightText = (text: string) => {
    const normalized = query.trim();
    if (!normalized) return text;
    const regex = new RegExp(`(${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
    const parts = text.split(regex);
    return parts.map((part, index) =>
      index % 2 === 1 ? (
        <mark key={index} className="bg-primary/20 text-foreground rounded-sm">
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  return (
    <>
      {!hideTrigger && (
        <Button
          variant="outline"
          className="text-muted-foreground w-full max-w-xs justify-start gap-2 px-2 sm:px-4"
          onClick={() => setOpen(true)}
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search...</span>
          <span className="inline sm:hidden">Search</span>
          <kbd className="bg-muted text-muted-foreground ml-auto hidden h-5 items-center gap-0.5 rounded border px-1.5 font-mono text-[10px] font-medium select-none lg:inline-flex">
            {shortcutSymbol} + K
          </kbd>
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-background/95 w-[94vw] max-w-[700px] gap-0 overflow-hidden rounded-xl border p-0 shadow-2xl backdrop-blur-xl sm:w-full sm:rounded-2xl">
          <DialogHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-5">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold sm:text-lg">
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              Search
            </DialogTitle>
            <DialogDescription className="text-muted-foreground flex items-center gap-2 text-xs">
              Search diagrams and notes · Favorites appear first
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 pb-4 sm:px-6">
            <div className="group relative">
              <Search className="text-muted-foreground/70 group-focus-within:text-primary absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 transition-colors" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search by title or content..."
                className="bg-muted/40 border-border/60 hover:border-border focus:border-primary/50 h-12 rounded-xl pr-24 pl-10 text-base shadow-sm transition-all"
                aria-label="Search"
              />
              <kbd className="bg-muted/50 text-muted-foreground absolute top-1/2 right-3 hidden h-6 -translate-y-1/2 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:inline-flex">
                <span className="text-xs">{shortcutSymbol} + K</span>
              </kbd>
            </div>
          </div>

          <div
            className="border-border/50 bg-muted/5 overflow-hidden border-t"
            style={{ maxHeight: '60vh' }}
          >
            <ScrollArea className="h-full w-full">
              {error ? (
                <div className="text-destructive p-6 text-center text-sm">{error}</div>
              ) : !results.length && !isLoading ? (
                <div className="space-y-2 p-12 text-center">
                  <p className="text-foreground text-sm font-medium">No results found</p>
                  <p className="text-muted-foreground text-xs">
                    Try searching for a different term
                  </p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {results.map((item, index) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      ref={(node) => {
                        itemRefs.current[index] = node;
                      }}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={cn(
                        'group flex w-full items-start gap-3.5 rounded-lg px-3 py-3 text-left transition-all focus:outline-none',
                        index === activeIndex
                          ? 'bg-primary/10 ring-primary/20 ring-1'
                          : 'hover:bg-muted/80'
                      )}
                    >
                      <div className="bg-background border-border/50 group-hover:border-border/80 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg shadow-sm transition-colors">
                        {item.emoji}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex w-full items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                            <span className="text-foreground truncate text-sm font-medium sm:text-base">
                              {highlightText(
                                item.title ||
                                  (item.type === 'diagram' ? 'Untitled Diagram' : 'Untitled Note')
                              )}
                            </span>
                            <span
                              className={cn(
                                'inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
                                item.type === 'diagram'
                                  ? 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                  : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              )}
                            >
                              {item.type === 'diagram' ? (
                                <PenSquare className="h-2.5 w-2.5" />
                              ) : (
                                <FileText className="h-2.5 w-2.5" />
                              )}
                              <span className="hidden sm:inline">
                                {item.type === 'diagram' ? 'Diagram' : 'Note'}
                              </span>
                            </span>
                            {item.isFavorite && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                <Star className="h-2 w-2 fill-current" />
                              </span>
                            )}
                          </div>
                          <span className="text-muted-foreground shrink-0 font-mono text-[10px] whitespace-nowrap sm:text-xs">
                            {formatDate(item.updatedAt)}
                          </span>
                        </div>
                        {item.content && (
                          <p className="text-muted-foreground line-clamp-1 font-mono text-xs break-all opacity-80">
                            {highlightText(item.content)}
                          </p>
                        )}
                        {item.language && (
                          <p className="text-muted-foreground text-xs">Language: {item.language}</p>
                        )}
                      </div>
                    </button>
                  ))}
                  {isLoading && (
                    <div className="text-muted-foreground flex items-center justify-center gap-2 p-4 text-sm">
                      <Loader2 className="text-primary/60 h-4 w-4 animate-spin" />
                      <span>Loading…</span>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          {!results.length && !isLoading && !error && (
            <div className="bg-muted/30 border-border/50 flex gap-2 border-t p-4">
              <Button
                variant="outline"
                className="flex-1 gap-2 shadow-sm"
                onClick={() => {
                  setOpen(false);
                  router.push('/diagram');
                }}
              >
                <PenSquare className="h-4 w-4" /> New Diagram
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2 shadow-sm"
                onClick={() => {
                  setOpen(false);
                  router.push('/notes');
                }}
              >
                <FileText className="h-4 w-4" /> New Note
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
