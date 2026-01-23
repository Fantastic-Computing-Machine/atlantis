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
import { Command, Home, Settings, FileText, PenSquare, Search, Download, Sun, List, Layout, BookOpen } from 'lucide-react';
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
    const searchShortcut: typeof shortcuts[number] = useMemo(() => ({
        id: 'search',
        key: 'k',
        modifiers: ['ctrl'],
        description: 'Search diagrams',
        category: 'general',
        action: () => { },
    }), []);

    const allShortcutsForDisplay = useMemo(() => [...shortcuts, searchShortcut], [shortcuts, searchShortcut]);

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
            <DialogContent className="p-0 gap-0 w-[94vw] max-w-[500px] sm:w-full overflow-hidden border bg-background/95 backdrop-blur-xl shadow-2xl rounded-xl sm:rounded-2xl">
                <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
                    <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold">
                        <Command className="h-4 w-4 sm:h-5 sm:w-5" />
                        Keyboard Shortcuts
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Quick access to platform features
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4 sm:px-6 pb-4">
                    <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 group-focus-within:text-primary transition-colors" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Filter shortcuts..."
                            className="pl-10 h-10 rounded-xl bg-muted/40 border-border/60 hover:border-border focus:border-primary/50 text-sm shadow-sm transition-all"
                            aria-label="Filter shortcuts"
                        />
                    </div>
                </div>

                <div className="border-t border-border/50 bg-muted/5 overflow-hidden" style={{ maxHeight: '50vh' }}>
                    <ScrollArea className="h-full w-full">
                        {displayGroups.length === 0 ? (
                            <div className="p-8 text-center space-y-2">
                                <p className="text-sm font-medium text-foreground">No shortcuts found</p>
                                <p className="text-xs text-muted-foreground">Try a different search term</p>
                            </div>
                        ) : (
                            <div className="p-3 space-y-4">
                                {displayGroups.map((group) => (
                                    <div key={group.category} className="space-y-1.5">
                                        <div className="flex items-center gap-2 px-2 py-1">
                                            <span className="text-muted-foreground">{getCategoryIcon(group.category)}</span>
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
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
                                                        'w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-3 focus:outline-none group/item',
                                                        shortcut.id === 'search'
                                                            ? 'opacity-70 cursor-default'
                                                            : 'hover:bg-muted/80 focus:bg-primary/10 focus:ring-1 focus:ring-primary/20'
                                                    )}
                                                >
                                                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-background border border-border/50 text-muted-foreground shrink-0 shadow-sm group-hover/item:border-border/80 transition-colors">
                                                        {getShortcutIcon(shortcut.id)}
                                                    </div>
                                                    <span className="flex-1 font-medium text-sm text-foreground">
                                                        {shortcut.description}
                                                    </span>
                                                    <kbd className="inline-flex h-6 select-none items-center gap-1 rounded border bg-muted/50 px-2 font-mono text-[11px] font-medium text-muted-foreground">
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
