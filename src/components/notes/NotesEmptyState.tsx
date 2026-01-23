'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CSRF_HEADER_NAME, ensureCsrfToken } from '@/lib/csrf-client';
import { useKeyboardShortcuts } from '@/lib/use-keyboard-shortcuts';

type CreatedNote = { id: string };

export function NotesEmptyState() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const { setPaletteOpen } = useKeyboardShortcuts();

  const handleCreateNote = async () => {
    setIsCreating(true);
    try {
      const csrf = await ensureCsrfToken();
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrf,
        },
        body: JSON.stringify({ title: 'Untitled Note' }),
      });

      if (!res.ok) {
        throw new Error('Failed to create note');
      }

      const newNote = (await res.json()) as CreatedNote;
      toast.success('Note created');
      router.push(`/notes/${newNote.id}`);
    } catch {
      toast.error('Unable to create note');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-muted/20 flex h-full items-center justify-center px-4">
      <div className="max-w-sm space-y-4 text-center">
        <div className="bg-muted border-border/60 mx-auto flex h-16 w-16 items-center justify-center rounded-full border">
          <FileText className="text-muted-foreground h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Select a note</h2>
          <p className="text-muted-foreground text-sm">
            Choose a note from the sidebar or create a new one to get started.
          </p>
        </div>
        <div className="flex items-center justify-center">
          <Button onClick={handleCreateNote} disabled={isCreating}>
            <Plus className="mr-2 h-4 w-4" />
            New note
          </Button>
        </div>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4 transition-colors"
        >
          Open shortcut palette
        </button>
      </div>
    </div>
  );
}
