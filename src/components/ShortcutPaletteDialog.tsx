'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useKeyboardShortcuts, type ShortcutCategory } from '@/lib/use-keyboard-shortcuts';
import {
  Command,
  Home,
  Settings,
  FileText,
  PenSquare,
  Search,
  Download,
  Sun,
  List,
  Layout,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  navigation: 'Navigation',
  creation: 'Create',
  general: 'General',
};

const CATEGORY_ORDER: ShortcutCategory[] = ['general', 'navigation', 'creation'];

function getCategoryIcon(category: ShortcutCategory) {
  switch (category) {
    case 'navigation':
      return <Home className="h-3.5 w-3.5" />;
    case 'creation':
      return <PenSquare className="h-3.5 w-3.5" />;
    case 'general':
      return <Command className="h-3.5 w-3.5" />;
  }
}

function getShortcutIcon(id: string) {
  switch (id) {
    case 'open-palette':
      return <Command className="h-4 w-4" />;
    case 'go-home':
      return <Home className="h-4 w-4" />;
    case 'go-settings':
      return <Settings className="h-4 w-4" />;
    case 'go-notes':
      return <List className="h-4 w-4" />;
    case 'go-diagrams':
      return <Layout className="h-4 w-4" />;
    case 'go-docs':
      return <BookOpen className="h-4 w-4" />;
    case 'new-note':
      return <FileText className="h-4 w-4" />;
    case 'new-diagram':
      return <PenSquare className="h-4 w-4" />;
    case 'download-backup':
      return <Download className="h-4 w-4" />;
    case 'toggle-theme':
      return <Sun className="h-4 w-4" />;
    case 'search':
      return <Search className="h-4 w-4" />;
    default:
      return <Command className="h-4 w-4" />;
  }
}

export function ShortcutPaletteDialog() {
  const { shortcuts, paletteOpen, setPaletteOpen, getDisplayKey } = useKeyboardShortcuts();
  const [query, setQuery] = useState('');

  const handleOpenChange = (open: boolean) => {
    setPaletteOpen(open);
    if (!open) {
      setQuery('');
    }
  };

  const handleAction = (action: () => void) => {
    setPaletteOpen(false);
    setQuery('');
    action();
  };

  // Add Ctrl+K to the display (handled by GlobalSearchDialog but we show it here for reference)
  const searchShortcut: (typeof shortcuts)[number] = useMemo(
    () => ({
      id: 'search',
      key: 'k',
      modifiers: ['ctrl'],
      description: 'Search diagrams',
      category: 'general',
      action: () => {},
    }),
    []
  );

  const allShortcutsForDisplay = useMemo(
    () => [...shortcuts, searchShortcut],
    [shortcuts, searchShortcut]
  );

  const displayGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = normalized
      ? allShortcutsForDisplay.filter(
          (s) =>
            s.description.toLowerCase().includes(normalized) ||
            s.key.toLowerCase().includes(normalized)
        )
      : allShortcutsForDisplay;

    const groups: Record<ShortcutCategory, typeof filtered> = {
      general: [],
      navigation: [],
      creation: [],
    };

    for (const shortcut of filtered) {
      groups[shortcut.category].push(shortcut);
    }

    return CATEGORY_ORDER.filter((cat) => groups[cat].length > 0).map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      shortcuts: groups[cat],
    }));
  }, [query, allShortcutsForDisplay]);

  return (
    <Dialog open={paletteOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-background/95 w-[94vw] max-w-[500px] gap-0 overflow-hidden rounded-xl border p-0 shadow-2xl backdrop-blur-xl sm:w-full sm:rounded-2xl">
        <DialogHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-5">
          <DialogTitle className="flex items-center gap-2.5 text-base font-semibold sm:text-lg">
            <Command className="h-4 w-4 sm:h-5 sm:w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Quick access to platform features
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pb-4 sm:px-6">
          <div className="group relative">
            <Search className="text-muted-foreground/70 group-focus-within:text-primary absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 transition-colors" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter shortcuts..."
              className="bg-muted/40 border-border/60 hover:border-border focus:border-primary/50 h-10 rounded-xl pl-10 text-sm shadow-sm transition-all"
              aria-label="Filter shortcuts"
            />
          </div>
        </div>

        <div
          className="border-border/50 bg-muted/5 overflow-hidden border-t"
          style={{ maxHeight: '50vh' }}
        >
          <ScrollArea className="h-full w-full">
            {displayGroups.length === 0 ? (
              <div className="space-y-2 p-8 text-center">
                <p className="text-foreground text-sm font-medium">No shortcuts found</p>
                <p className="text-muted-foreground text-xs">Try a different search term</p>
              </div>
            ) : (
              <div className="space-y-4 p-3">
                {displayGroups.map((group) => (
                  <div key={group.category} className="space-y-1.5">
                    <div className="flex items-center gap-2 px-2 py-1">
                      <span className="text-muted-foreground">
                        {getCategoryIcon(group.category)}
                      </span>
                      <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                        {group.label}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {group.shortcuts.map((shortcut) => (
                        <button
                          key={shortcut.id}
                          type="button"
                          onClick={() => shortcut.id !== 'search' && handleAction(shortcut.action)}
                          disabled={shortcut.id === 'search'}
                          className={cn(
                            'group/item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all focus:outline-none',
                            shortcut.id === 'search'
                              ? 'cursor-default opacity-70'
                              : 'hover:bg-muted/80 focus:bg-primary/10 focus:ring-primary/20 focus:ring-1'
                          )}
                        >
                          <div className="bg-background border-border/50 text-muted-foreground group-hover/item:border-border/80 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-colors">
                            {getShortcutIcon(shortcut.id)}
                          </div>
                          <span className="text-foreground flex-1 text-sm font-medium">
                            {shortcut.description}
                          </span>
                          <kbd className="bg-muted/50 text-muted-foreground inline-flex h-6 items-center gap-1 rounded border px-2 font-mono text-[11px] font-medium select-none">
                            {getDisplayKey(shortcut)}
                          </kbd>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
