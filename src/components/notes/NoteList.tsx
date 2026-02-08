'use client';

import { Search, Star, Lock, Settings2, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNotes } from '@/components/notes/NotesContext';
import { ensureCsrfToken, withCsrfHeader } from '@/lib/csrf-client';
import { cn, formatDate } from '@/lib/utils';

export function NoteList() {
  const { notes, addNote } = useNotes();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'starred'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Extract current note based on path
  const currentNote = useMemo(() => {
    const match = pathname.match(/^\/notes\/([^/]+)/);
    if (!match) return null;
    const noteId = match[1];
    return notes.find((n) => n.id === noteId) ?? null;
  }, [pathname, notes]);

  const filteredNotes = notes.filter((note) => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'starred' && note.starred);
    return matchesSearch && matchesFilter;
  });

  // Build header title based on current note
  const headerTitle = currentNote ? `${currentNote.emoji || '📝'} ${currentNote.title}` : 'Notes';

  const handleCreateNote = async () => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      await ensureCsrfToken();
      const res = await fetch(
        '/api/notes',
        withCsrfHeader({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Untitled Note' }),
        })
      );

      if (!res.ok) {
        throw new Error('Failed to create note');
      }

      const newNote = await res.json();
      addNote(newNote);
      toast.success('Note created');
      router.push(`/notes/${newNote.id}`);
    } catch {
      toast.error('Unable to create note');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-background flex h-full flex-col border-r overflow-hidden">
      {/* Header */}
      <div className="space-y-3 border-b p-3">
        <div className="flex items-center gap-2">
          <Link href="/" className="shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <span className="text-lg">🔱</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Home</TooltipContent>
            </Tooltip>
          </Link>
          <span className="text-muted-foreground">{'//'}</span>
          <h2 className="flex-1 truncate text-sm font-semibold">{headerTitle}</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                <Link href="/settings">
                  <Settings2 className="h-4 w-4" />
                  <span className="sr-only">Settings</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1">
          <Button
            variant={filter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'starred' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => setFilter('starred')}
          >
            <Star className="mr-1 h-3 w-3" />
            Starred
          </Button>
        </div>

        {/* Mobile New Note */}
        <Button onClick={handleCreateNote} disabled={isCreating} className="w-full md:hidden">
          <Plus className="mr-2 h-4 w-4" />
          {isCreating ? 'Creating…' : 'New note'}
        </Button>
      </div>

      {/* Notes List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-1 p-2">
          {filteredNotes.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-sm">
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
                    'block rounded-lg p-3 transition-colors',
                    isActive ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 text-lg">{note.emoji || '📝'}</span>
                      <span className="truncate text-sm font-medium">{note.title}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {note.private && <Lock className="text-muted-foreground h-3 w-3" />}
                      {note.starred && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />}
                    </div>
                  </div>
                  <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                    <span className="uppercase">{note.language}</span>
                    <span>·</span>
                    <span>{formatDate(note.updatedAt)}</span>
                  </div>
                  {note.tags && note.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {note.tags.map(tag => (
                        <div key={tag.id} className="rounded-full px-1.5 py-0.5 text-[10px] font-medium border bg-opacity-50" style={{ backgroundColor: `${tag.color}20`, borderColor: `${tag.color}40`, color: tag.color }}>
                          #{tag.slug}
                        </div>
                      ))}
                    </div>
                  )}
                </Link>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
