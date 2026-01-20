'use client';

import { NoteList } from '@/components/notes/NoteList';
import { NotesProvider } from '@/components/notes/NotesContext';
import type { Note } from '@/lib/types';

type NoteListItem = Omit<Note, 'content'>;

interface NotesLayoutClientProps {
    children: React.ReactNode;
    initialNotes: NoteListItem[];
}

export function NotesLayoutClient({ children, initialNotes }: NotesLayoutClientProps) {
    return (
        <NotesProvider initialNotes={initialNotes}>
            <div className="h-screen flex">
                {/* Sidebar */}
                <div className="w-72 shrink-0">
                    <NoteList />
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    {children}
                </div>
            </div>
        </NotesProvider>
    );
}

