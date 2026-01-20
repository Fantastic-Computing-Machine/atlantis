'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNotes } from '@/components/notes/NotesContext';
import { cn, formatDate } from '@/lib/utils';
import { Search, Star, Lock } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';

export function NoteList() {
    const { notes } = useNotes();
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'starred'>('all');
    const pathname = usePathname();

    // Extract current note based on path
    const currentNote = useMemo(() => {
        const match = pathname.match(/^\/notes\/([^/]+)/);
        if (!match) return null;
        const noteId = match[1];
        return notes.find(n => n.id === noteId) ?? null;
    }, [pathname, notes]);

    const filteredNotes = notes.filter((note) => {
        const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filter === 'all' || (filter === 'starred' && note.starred);
        return matchesSearch && matchesFilter;
    });

    // Build header title based on current note
    const headerTitle = currentNote
        ? `${currentNote.emoji || '📝'} ${currentNote.title}`
        : 'Notes';

    return (
        <div className="h-full flex flex-col bg-background border-r">
            {/* Header */}
            <div className="p-3 border-b space-y-3">
                <div className="flex items-center gap-2">
                    <Link href="/" className="shrink-0">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <span className="text-lg">🔱</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Back to Diagrams</TooltipContent>
                        </Tooltip>
                    </Link>
                    <span className="text-muted-foreground">//</span>
                    <h2 className="font-semibold text-sm truncate flex-1">{headerTitle}</h2>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-sm"
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1">
                    <Button
                        variant={filter === 'all' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={() => setFilter('all')}
                    >
                        All
                    </Button>
                    <Button
                        variant={filter === 'starred' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={() => setFilter('starred')}
                    >
                        <Star className="h-3 w-3 mr-1" />
                        Starred
                    </Button>
                </div>
            </div>

            {/* Notes List */}
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {filteredNotes.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            {searchQuery ? 'No notes found' : 'No notes yet'}
                        </div>
                    ) : (
                        filteredNotes.map((note) => {
                            const isActive = pathname === `/notes/${note.id}`;
                            return (
                                <Link
                                    key={note.id}
                                    href={`/notes/${note.id}`}
                                    className={cn(
                                        'block p-3 rounded-lg transition-colors',
                                        isActive
                                            ? 'bg-primary/10 border border-primary/20'
                                            : 'hover:bg-muted/50'
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-lg shrink-0">{note.emoji || '📝'}</span>
                                            <span className="font-medium text-sm truncate">{note.title}</span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {note.private && <Lock className="h-3 w-3 text-muted-foreground" />}
                                            {note.starred && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                        <span className="uppercase">{note.language}</span>
                                        <span>·</span>
                                        <span>{formatDate(note.updatedAt)}</span>
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
