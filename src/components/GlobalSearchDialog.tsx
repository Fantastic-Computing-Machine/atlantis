'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Star, Loader2 } from 'lucide-react';
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
import { cn, formatDate } from '@/lib/utils';
import type { Diagram } from '@/lib/types';

const EMPTY_RESULTS = [] as const;

type GlobalSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDiagrams?: Diagram[];
  onSelect?: (diagram: Diagram) => void;
};

export function GlobalSearchDialog({
  open,
  onOpenChange,
  initialDiagrams,
  onSelect,
}: GlobalSearchDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [diagrams, setDiagrams] = useState<Diagram[]>(initialDiagrams || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (initialDiagrams) {
      setDiagrams(initialDiagrams);
    }
  }, [initialDiagrams]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isModifier = event.metaKey || event.ctrlKey;
      if (isModifier && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
      const fetchDiagrams = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const res = await fetch('/api/diagrams');
          if (!res.ok) throw new Error('Failed to fetch diagrams');
          const data: Diagram[] = await res.json();
          setDiagrams(data);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unable to load diagrams');
        } finally {
          setIsLoading(false);
        }
      };
      fetchDiagrams();
    } else {
      setQuery('');
    }
  }, [open]);

  const sortedResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const results = diagrams
      .filter((diagram) => {
        if (!normalized) return true;
        const haystack = `${diagram.title} ${diagram.content}`.toLowerCase();
        return haystack.includes(normalized);
      })
      .sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) {
          return a.isFavorite ? -1 : 1;
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

    if (!results.length) return EMPTY_RESULTS;
    return results;
  }, [diagrams, query]);

  useEffect(() => {
    if (!sortedResults.length) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((prev) => Math.min(prev, sortedResults.length - 1));
  }, [sortedResults]);

  const handleSelect = (diagram: Diagram) => {
    onOpenChange(false);
    setQuery('');
    setActiveIndex(0);
    if (onSelect) {
      onSelect(diagram);
    } else {
      router.push(`/${diagram.id}`);
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (sortedResults.length ? (prev + 1) % sortedResults.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => {
        if (!sortedResults.length) return 0;
        return prev === 0 ? sortedResults.length - 1 : prev - 1;
      });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = sortedResults[activeIndex] ?? sortedResults[0];
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 w-[94vw] max-w-[700px] sm:w-full overflow-hidden border bg-background/95 backdrop-blur-xl shadow-2xl rounded-xl sm:rounded-2xl">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold">
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            Search diagrams
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-xs text-muted-foreground">
            Favorites appear first · Press Enter to open
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 sm:px-6 pb-4">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 group-focus-within:text-primary transition-colors" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by title or Mermaid content..."
              className="pl-10 pr-24 h-12 rounded-xl bg-muted/40 border-border/60 hover:border-border focus:border-primary/50 text-base shadow-sm transition-all"
              aria-label="Search diagrams"
            />
            <kbd className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 h-6 select-none items-center gap-1 rounded border bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>

        <div className="border-t border-border/50 bg-muted/5">
          <ScrollArea className="max-h-[60vh] sm:max-h-[600px] w-full">
            {isLoading ? (
              <div className="p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
                <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
                <p>Loading diagrams...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-sm text-destructive text-center">{error}</div>
            ) : !sortedResults.length ? (
              <div className="p-12 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No diagrams found</p>
                <p className="text-xs text-muted-foreground mt-1">Try searching for a different term</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {sortedResults.map((diagram, index) => (
                  <button
                    key={diagram.id}
                    type="button"
                    onClick={() => handleSelect(diagram)}
                    className={cn(
                      'w-full text-left px-3 py-3 rounded-lg transition-all flex items-start gap-3.5 focus:outline-none group',
                      index === activeIndex 
                        ? 'bg-primary/10 ring-1 ring-primary/20' 
                        : 'hover:bg-muted/80'
                    )}
                  >
                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-background border border-border/50 text-lg shrink-0 shadow-sm group-hover:border-border/80 transition-colors">
                      {diagram.emoji || '📊'}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2 w-full">
                        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                          <span className="font-medium text-sm sm:text-base truncate text-foreground">
                            {highlightText(diagram.title || 'Untitled Diagram')}
                          </span>
                          {diagram.isFavorite && (
                            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium rounded-full bg-amber-500/10 text-amber-600 px-1.5 py-0.5 dark:text-amber-400 border border-amber-500/20">
                              <Star className="h-2 w-2 fill-current" />
                              <span className="hidden sm:inline">Fav</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-mono shrink-0 whitespace-nowrap">
                          {formatDate(diagram.updatedAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 font-mono opacity-80 break-all">
                        {highlightText(diagram.content || '')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {!sortedResults.length && !isLoading && !error && (
          <div className="p-4 bg-muted/30 border-t border-border/50">
            <Button
              className="w-full gap-2 shadow-sm"
              onClick={() => {
                onOpenChange(false);
                router.push('/');
              }}
            >
              <span className="text-lg">+</span> Create New Diagram
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>

  );
}
