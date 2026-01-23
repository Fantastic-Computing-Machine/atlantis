'use client';

import type { Note } from '@/lib/types';
import { useDiagramStore } from '@/lib/store';
import { useListSync } from '@/lib/useListSync';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { toast } from 'sonner';

type NoteListItem = Omit<Note, 'content'>;

interface NotesContextType {
    notes: NoteListItem[];
    updateNote: (id: string, updates: Partial<NoteListItem>) => void;
    addNote: (note: NoteListItem) => void;
    removeNote: (id: string) => void;
}

const NotesContext = createContext<NotesContextType | null>(null);

export function useNotes() {
    const context = useContext(NotesContext);
    if (!context) {
        throw new Error('useNotes must be used within a NotesProvider');
    }
    return context;
}

interface NotesProviderProps {
    children: ReactNode;
    initialNotes: NoteListItem[];
}

export function NotesProvider({ children, initialNotes }: NotesProviderProps) {
    const [notes, setNotes] = useState<NoteListItem[]>(initialNotes);
    const { settings } = useDiagramStore();

    // Live sync: poll for note property changes and new items
    useListSync<NoteListItem>({
        listUrl: '/api/notes?limit=50&offset=0',
        currentItems: notes,
        enabled: Boolean(settings.liveSync),
        intervalMs: (settings.liveSyncInterval ?? 5000) * 2, // Poll lists less frequently
        onUpdate: (serverItems) => {
            setNotes(serverItems);
        },
        onListChanged: () => {
            toast.info('Note list updated');
        },
    });

    const updateNote = useCallback((id: string, updates: Partial<NoteListItem>) => {
        setNotes((prev) =>
            prev.map((note) =>
                note.id === id ? { ...note, ...updates } : note
            )
        );
    }, []);

    const addNote = useCallback((note: NoteListItem) => {
        setNotes((prev) => [note, ...prev]);
    }, []);

    const removeNote = useCallback((id: string) => {
        setNotes((prev) => prev.filter((note) => note.id !== id));
    }, []);

    return (
        <NotesContext.Provider value={{ notes, updateNote, addNote, removeNote }}>
            {children}
        </NotesContext.Provider>
    );
}
