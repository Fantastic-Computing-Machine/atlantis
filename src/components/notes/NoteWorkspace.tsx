'use client';

import { NoteEditor } from '@/components/notes/NoteEditor';

import { ResponsiveTagPicker } from '@/components/responsive-tag-picker';
import { Button } from '@/components/ui/button';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import type { Note, Tag } from '@/lib/types';
import { ensureCsrfToken, withCsrfHeader } from '@/lib/csrf-client';
import { LIVE_SYNC_CONFIG } from '@/lib/live-sync-config';
import { cn } from '@/lib/utils';
import { useDiagramStore } from '@/lib/store';
import { getLiveSyncClientId, useLiveSync } from '@/lib/useLiveSync';
import { useNotes } from '@/components/notes/NotesContext';
import {
  Star,
  Trash2,
  ChevronDown,
  Save,
  Download,
  Plus,
  Moon,
  Sun,
  MoreHorizontal,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

interface NoteWorkspaceProps {
  initialNote: Note;
}

const SUPPORTED_LANGUAGES = [
  { value: 'txt', label: 'Plain Text' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'latex', label: 'LaTeX' },
  { value: 'todo', label: 'Todo List' },
];

const nextIsoAfter = (currentIso: string): string => {
  const currentMs = Date.parse(currentIso);
  const nowMs = Date.now();
  const nextMs = Number.isFinite(currentMs) ? Math.max(nowMs, currentMs + 1) : nowMs;
  return new Date(nextMs).toISOString();
};

const toNoteListItem = (fullNote: Note): Omit<Note, 'content'> => {
  const { content, ...rest } = fullNote;
  void content;
  return rest;
};

export function NoteWorkspace({ initialNote }: NoteWorkspaceProps) {
  const router = useRouter();
  const { settings } = useDiagramStore();
  const { setTheme, theme } = useTheme();
  const { updateNote, addNote, removeNote } = useNotes();
  const [note, setNote] = useState<Note>(initialNote);
  const [title, setTitle] = useState(initialNote.title);
  const [content, setContent] = useState(initialNote.content);
  const [language, setLanguage] = useState(initialNote.language);
  const [tags, setTags] = useState<Tag[]>(initialNote.tags || []);
  const [isPrivate, setIsPrivate] = useState(initialNote.private);
  const [starred, setStarred] = useState(initialNote.starred);
  const [liveUpdatedAt, setLiveUpdatedAt] = useState(initialNote.updatedAt);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mounted, setMounted] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const draftPublishTimerRef = useRef<NodeJS.Timeout | null>(null);
  const draftSeqRef = useRef(0);
  const clientId = useMemo(() => getLiveSyncClientId(), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const publishDraftUpdate = useCallback(
    async (next: Note) => {
      if (!mounted || next.private) return;

      try {
        await ensureCsrfToken();
        const seq = ++draftSeqRef.current;
        await fetch(
          '/api/sync/publish',
          withCsrfHeader({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-client-id': clientId,
            },
            body: JSON.stringify({
              topic: `draft:note:${next.id}`,
              source: clientId,
              payload: {
                ...next,
                seq,
              },
            }),
          })
        );
      } catch {
        // ignore draft sync errors; autosave remains source of truth
      }
    },
    [clientId, mounted]
  );

  const queueDraftUpdate = useCallback(
    (next: Note) => {
      if (!mounted || next.private) return;

      if (draftPublishTimerRef.current) {
        clearTimeout(draftPublishTimerRef.current);
      }

      draftPublishTimerRef.current = setTimeout(() => {
        draftPublishTimerRef.current = null;
        void publishDraftUpdate(next);
      }, 180);
    },
    [mounted, publishDraftUpdate]
  );

  useLiveSync<Note>({
    resourceUrl: `/api/notes/${note.id}`,
    currentUpdatedAt: liveUpdatedAt,
    hasLocalChanges: hasChanges,
    enabled: LIVE_SYNC_CONFIG.enabled && mounted && !isPrivate,
    intervalMs: LIVE_SYNC_CONFIG.pollIntervalMs,
    liveSyncMethod: LIVE_SYNC_CONFIG.method,
    eventTopics: [`doc:note:${note.id}`, `draft:note:${note.id}`],
    allowWhileDirty: true,
    isInstantPayload: (payload): payload is Note => {
      if (!payload || typeof payload !== 'object') return false;
      const candidate = payload as Partial<Note>;
      return (
        typeof candidate.id === 'string' &&
        typeof candidate.title === 'string' &&
        typeof candidate.content === 'string' &&
        typeof candidate.language === 'string' &&
        typeof candidate.updatedAt === 'string'
      );
    },
    onUpdate: (remoteNote) => {
      setNote(remoteNote);
      setLiveUpdatedAt(remoteNote.updatedAt);
      setTitle(remoteNote.title);
      setContent(remoteNote.content);
      setLanguage(remoteNote.language);
      setTags(remoteNote.tags || []);
      setIsPrivate(remoteNote.private);
      setStarred(remoteNote.starred);
      setHasChanges(false);
      updateNote(note.id, toNoteListItem(remoteNote));
    },
    onExternalChange: () => {
      toast.info('Note updated by another user');
    },
  });

  // Track changes (only for auto-save debounce candidates: title and content)
  useEffect(() => {
    const changed =
      title !== note.title ||
      content !== note.content ||
      language !== note.language ||
      isPrivate !== note.private ||
      JSON.stringify(tags) !== JSON.stringify(note.tags || []);
    setHasChanges(changed);
  }, [title, content, language, isPrivate, tags, note]);

  useEffect(() => {
    return () => {
      if (draftPublishTimerRef.current) {
        clearTimeout(draftPublishTimerRef.current);
      }
    };
  }, []);

  const emitDraft = useCallback(
    (patch: Partial<Note>) => {
      if (!mounted) return;

      const nextDraft: Note = {
        ...note,
        title,
        content,
        language,
        starred,
        private: isPrivate,
        tags,
        updatedAt: nextIsoAfter(liveUpdatedAt),
        ...patch,
      };

      if (nextDraft.private) {
        return;
      }

      setLiveUpdatedAt(nextDraft.updatedAt);
      queueDraftUpdate(nextDraft);
    },
    [
      mounted,
      note,
      title,
      content,
      language,
      starred,
      isPrivate,
      tags,
      liveUpdatedAt,
      queueDraftUpdate,
    ]
  );

  const handleTitleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextTitle = e.target.value;
      setTitle(nextTitle);
      emitDraft({ title: nextTitle });
    },
    [emitDraft]
  );

  const handleContentChange = useCallback(
    (nextContent: string) => {
      setContent(nextContent);
      emitDraft({ content: nextContent });
    },
    [emitDraft]
  );

  const handleLanguageChange = useCallback(
    (nextLanguage: string) => {
      setLanguage(nextLanguage);
      emitDraft({ language: nextLanguage });
    },
    [emitDraft]
  );

  const handleTagsChange = useCallback(
    (nextTags: Tag[]) => {
      setTags(nextTags);
      emitDraft({ tags: nextTags });
    },
    [emitDraft]
  );

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    // Clear any pending auto-save timer to avoid double pushes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    setIsSaving(true);

    try {
      await ensureCsrfToken();
      const res = await fetch(
        `/api/notes/${note.id}`,
        withCsrfHeader({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
          body: JSON.stringify({
            title,
            content,
            language,
            private: isPrivate,
            starred,
            tags: tags.map((t) => t.id),
          }),
        })
      );

      if (!res.ok) {
        throw new Error('Failed to save');
      }

      const updatedNote = await res.json();
      setNote(updatedNote);
      setLiveUpdatedAt(updatedNote.updatedAt);
      setTags(updatedNote.tags || []);
      setHasChanges(false);

      // Update sidebar in real-time
      updateNote(note.id, toNoteListItem(updatedNote));
    } catch {
      toast.error('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  }, [note.id, title, content, language, isPrivate, starred, isSaving, updateNote, tags, clientId]);

  // Auto-save debounced (only if autoSave is enabled)
  useEffect(() => {
    if (!hasChanges || !settings.autoSave) return;
    const autoSaveDelay = settings.autoSaveDelay ?? 2000;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, autoSaveDelay);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasChanges, settings.autoSave, settings.autoSaveDelay, handleSave]);

  // Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const handleDelete = useCallback(async () => {
    try {
      await ensureCsrfToken();
      const res = await fetch(
        `/api/notes/${note.id}`,
        withCsrfHeader({
          method: 'DELETE',
          headers: { 'x-client-id': clientId },
        })
      );

      if (!res.ok) {
        throw new Error('Failed to delete');
      }

      // Remove from sidebar immediately
      removeNote(note.id);
      toast.success('Note deleted');
      router.push('/notes');
    } catch {
      toast.error('Failed to delete note');
    }
  }, [note.id, router, removeNote, clientId]);

  const toggleStarred = useCallback(async () => {
    const newStarred = !starred;
    setStarred(newStarred);
    emitDraft({ starred: newStarred });

    // Immediately persist starred state to server
    try {
      await ensureCsrfToken();
      const res = await fetch(
        `/api/notes/${note.id}`,
        withCsrfHeader({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
          body: JSON.stringify({ starred: newStarred }),
        })
      );

      if (!res.ok) {
        // Revert on failure
        setStarred(!newStarred);
        throw new Error('Failed to update starred status');
      }

      const updatedNote = await res.json();
      // Update the note reference to reflect the server state
      setNote((prev) => ({
        ...prev,
        starred: updatedNote.starred,
        updatedAt: updatedNote.updatedAt,
      }));
      setLiveUpdatedAt(updatedNote.updatedAt);

      // Update sidebar in real-time
      updateNote(note.id, {
        starred: updatedNote.starred,
        updatedAt: updatedNote.updatedAt,
      });
    } catch {
      toast.error('Failed to update starred status');
    }
  }, [starred, note.id, updateNote, clientId, emitDraft]);

  const togglePrivate = useCallback(() => {
    setIsPrivate((prev) => {
      const nextPrivate = !prev;
      emitDraft({ private: nextPrivate });
      return nextPrivate;
    });
  }, [emitDraft]);

  const handleDownload = useCallback(() => {
    const extensionMap: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      markdown: 'md',
      python: 'py',
    };
    const ext = extensionMap[language] || language;
    const filename = `${title.replace(/[^a-zA-Z0-9_\- ]/g, '_')}.${ext}`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [title, content, language]);

  const handleCreateNote = useCallback(async () => {
    try {
      await ensureCsrfToken();
      const res = await fetch(
        '/api/notes',
        withCsrfHeader({
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
          body: JSON.stringify({ title: 'Untitled Note' }),
        })
      );

      if (!res.ok) {
        throw new Error('Failed to create note');
      }

      const newNote = await res.json();
      // Add to sidebar immediately
      addNote(newNote);
      toast.success('Note created');
      router.push(`/notes/${newNote.id}`);
    } catch {
      toast.error('Failed to create note');
    }
  }, [router, addNote, clientId]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="bg-background/50 z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4 backdrop-blur-sm">
        {/* Left: Branding & Title */}
        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
          <Link
            href="/notes"
            className="flex shrink-0 items-center gap-1 transition-opacity hover:opacity-80"
          >
            <span className="text-2xl sm:hidden">📝</span>
            <span className="hidden text-lg font-semibold sm:inline">📝 notes //</span>
          </Link>

          <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />

          <div className="flex max-w-xl min-w-0 flex-1 items-center gap-2">
            <input
              value={title}
              onChange={handleTitleInputChange}
              onBlur={handleSave}
              className="placeholder:text-muted-foreground/50 text-foreground min-w-[60px] flex-1 truncate border-none bg-transparent px-0 text-sm font-medium focus:ring-0 focus:outline-none sm:text-base"
              placeholder="Note title..."
            />
            <div className="shrink-0">
              <ResponsiveTagPicker
                selectedTags={tags}
                onTagsChange={handleTagsChange}
                maxTags={3}
                align="start"
              />
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-muted-foreground mr-2 hidden text-xs lg:inline">
            {hasChanges ? 'Unsaved' : 'Saved'}
          </span>

          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hidden h-8 gap-1 sm:flex"
              >
                {SUPPORTED_LANGUAGES.find((l) => l.value === language)?.label || language}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Language</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SUPPORTED_LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.value}
                  onClick={() => handleLanguageChange(lang.value)}
                  className={language === lang.value ? 'bg-muted' : ''}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Language selector for mobile (hidden on sm+ where standalone dropdown is visible) */}
              <DropdownMenuLabel className="sm:hidden">Language</DropdownMenuLabel>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.value}
                  onClick={() => handleLanguageChange(lang.value)}
                  className={cn('sm:hidden', language === lang.value && 'bg-muted')}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="sm:hidden" />
              <DropdownMenuItem onClick={toggleStarred}>
                <Star className={cn('mr-2 h-4 w-4', starred && 'fill-amber-400 text-amber-400')} />
                <span>{starred ? 'Unstar' : 'Star'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                <span>Download</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? (
                  <Sun className="mr-2 h-4 w-4" />
                ) : (
                  <Moon className="mr-2 h-4 w-4" />
                )}
                <span>Switch Theme</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete Note</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="bg-border mx-1 h-6 w-px" />

          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            size="sm"
            className="gap-2"
            aria-label="Save note"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
          </Button>

          <Button size="sm" variant="ghost" onClick={handleCreateNote} aria-label="Create new note">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:ml-1 sm:inline">New</span>
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="min-h-0 flex-1">
        <NoteEditor
          value={content}
          onChange={handleContentChange}
          language={language}
          isPrivate={isPrivate}
          onTogglePrivate={togglePrivate}
          previewFilename={title}
        />
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The note &quot;{note.title}&quot; will be permanently
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
