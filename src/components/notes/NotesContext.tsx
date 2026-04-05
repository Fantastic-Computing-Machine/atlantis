'use client';

import type { Note } from '@/lib/types';
import { LIVE_SYNC_CONFIG } from '@/lib/live-sync-config';
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

  // Live sync: poll for note property changes and new items
  useListSync<NoteListItem>({
    listUrl: '/api/notes?limit=50&offset=0',
    currentItems: notes,
    enabled: LIVE_SYNC_CONFIG.enabled,
    intervalMs: LIVE_SYNC_CONFIG.pollIntervalMs * 2,
    liveSyncMethod: LIVE_SYNC_CONFIG.method,
    eventTopics: ['list:notes'],
    onUpdate: (serverItems) => {
      setNotes(serverItems);
    },
    onListChanged: () => {
      toast.info('Note list updated');
    },
  });

  const updateNote = useCallback((id: string, updates: Partial<NoteListItem>) => {
    setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, ...updates } : note)));
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
