'use client';

import { NoteList } from '@/components/notes/NoteList';
import { NotesProvider } from '@/components/notes/NotesContext';
import type { Note } from '@/lib/types';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type NoteListItem = Omit<Note, 'content'>;

interface NotesLayoutClientProps {
  children: React.ReactNode;
  initialNotes: NoteListItem[];
}

export function NotesLayoutClient({ children, initialNotes }: NotesLayoutClientProps) {
  const pathname = usePathname();
  const isNoteSelected = pathname !== '/notes';

  return (
    <NotesProvider initialNotes={initialNotes}>
      <div className="bg-background flex h-[100dvh] w-full overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            'bg-background h-full w-full flex-col overflow-hidden border-r md:flex md:w-72',
            isNoteSelected ? 'hidden' : 'flex'
          )}
        >
          <NoteList />
        </aside>

        {/* Main Content */}
        <main
          className={cn(
            'h-full w-full flex-1 flex-col overflow-hidden',
            !isNoteSelected ? 'hidden md:flex' : 'flex'
          )}
        >
          {children}
        </main>
      </div>
    </NotesProvider>
  );
}
