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
import { cn } from '@/lib/utils';
import { useDiagramStore } from '@/lib/store';
import { useLiveSync } from '@/lib/useLiveSync';
import { useNotes } from '@/components/notes/NotesContext';
import { Star, Trash2, ChevronDown, Save, Download, Plus, Moon, Sun, MoreHorizontal } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
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
    { value: 'todo', label: 'Todo List' },
];

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
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [mounted, setMounted] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Live sync: poll for external changes from other users
    const { refresh: syncFromServer } = useLiveSync<Note>({
        resourceUrl: `/api/notes/${note.id}`,
        currentUpdatedAt: note.updatedAt,
        hasLocalChanges: hasChanges,
        enabled: Boolean(settings.liveSync) && mounted && !note.private,
        intervalMs: settings.liveSyncInterval ?? 5000,
        onUpdate: (remoteNote) => {
            setNote(remoteNote);
            setTitle(remoteNote.title);
            setContent(remoteNote.content);
            setLanguage(remoteNote.language);
            setTags(remoteNote.tags || []);
            setIsPrivate(remoteNote.private);
            setStarred(remoteNote.starred);
            setHasChanges(false);
            updateNote(note.id, {
                title: remoteNote.title,
                language: remoteNote.language,
                starred: remoteNote.starred,
                private: remoteNote.private,
                updatedAt: remoteNote.updatedAt,
            });
        },
        onExternalChange: () => {
            toast.info('Note updated by another user');
        },
    });

    // Track changes
    useEffect(() => {
        const changed =
            title !== note.title ||
            content !== note.content ||
            language !== note.language ||
            JSON.stringify(tags) !== JSON.stringify(note.tags || []) || // Simple array comparison
            isPrivate !== note.private ||
            starred !== note.starred;
        setHasChanges(changed);
    }, [title, content, language, tags, isPrivate, starred, note]);



    const handleSave = useCallback(async () => {
        if (isSaving) return;
        setIsSaving(true);

        try {
            await ensureCsrfToken();
            const res = await fetch(`/api/notes/${note.id}`, withCsrfHeader({
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    content,
                    language,
                    private: isPrivate,
                    starred,
                    tags: tags.map(t => t.id),
                }),
            }));

            if (!res.ok) {
                throw new Error('Failed to save');
            }

            const updatedNote = await res.json();
            setNote(updatedNote);
            setTags(updatedNote.tags || []);
            setHasChanges(false);

            // Update sidebar in real-time
            updateNote(note.id, {
                title: updatedNote.title,
                language: updatedNote.language,
                starred: updatedNote.starred,
                private: updatedNote.private,
                updatedAt: updatedNote.updatedAt,
            });
            // Sync from server after save to pull any concurrent changes
            syncFromServer();
        } catch {
            toast.error('Failed to save note');
        } finally {
            setIsSaving(false);
        }
    }, [note.id, title, content, language, isPrivate, starred, isSaving, updateNote, syncFromServer, tags]);

    // Auto-save debounced (only if autoSave is enabled)
    useEffect(() => {
        if (!hasChanges || !settings.autoSave) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            handleSave();
        }, 2000);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [content, hasChanges, settings.autoSave, handleSave]);

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
            const res = await fetch(`/api/notes/${note.id}`, withCsrfHeader({
                method: 'DELETE',
            }));

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
    }, [note.id, router, removeNote]);

    const toggleStarred = useCallback(async () => {
        const newStarred = !starred;
        setStarred(newStarred);

        // Immediately persist starred state to server
        try {
            await ensureCsrfToken();
            const res = await fetch(`/api/notes/${note.id}`, withCsrfHeader({
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ starred: newStarred }),
            }));

            if (!res.ok) {
                // Revert on failure
                setStarred(!newStarred);
                throw new Error('Failed to update starred status');
            }

            const updatedNote = await res.json();
            // Update the note reference to reflect the server state
            setNote((prev) => ({ ...prev, starred: updatedNote.starred, updatedAt: updatedNote.updatedAt }));

            // Update sidebar in real-time
            updateNote(note.id, {
                starred: updatedNote.starred,
                updatedAt: updatedNote.updatedAt,
            });
        } catch {
            toast.error('Failed to update starred status');
        }
    }, [starred, note.id, updateNote]);

    const togglePrivate = useCallback(() => {
        setIsPrivate((prev) => !prev);
    }, []);

    const handleDownload = useCallback(() => {
        const extensionMap: Record<string, string> = {
            'javascript': 'js',
            'typescript': 'ts',
            'markdown': 'md',
            'python': 'py',
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
            const res = await fetch('/api/notes', withCsrfHeader({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'Untitled Note' }),
            }));

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
    }, [router, addNote]);

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="h-14 border-b flex items-center px-4 bg-background/50 backdrop-blur-sm z-10 shrink-0 justify-between gap-4">

                {/* Left: Branding & Title */}
                <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                    <Link href="/notes" className="shrink-0 hover:opacity-80 transition-opacity flex items-center gap-1">
                        <span className="text-2xl sm:hidden">📝</span>
                        <span className="hidden sm:inline font-semibold text-lg">📝 notes //</span>
                    </Link>

                    <div className="h-6 w-px bg-border shrink-0 hidden sm:block" />

                    <div className="flex items-center gap-2 min-w-0 flex-1 max-w-xl">
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={handleSave}
                            className="bg-transparent border-none focus:outline-none focus:ring-0 px-0 min-w-[60px] flex-1 truncate font-medium text-sm sm:text-base placeholder:text-muted-foreground/50 text-foreground"
                            placeholder="Note title..."
                        />
                        <div className="shrink-0">
                            <ResponsiveTagPicker
                                selectedTags={tags}
                                onTagsChange={setTags}
                                maxTags={3}
                                align="start"
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground mr-2 hidden lg:inline">
                        {hasChanges ? 'Unsaved' : 'Saved'}
                    </span>

                    {/* Language Selector */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="hidden sm:flex gap-1 text-muted-foreground hover:text-foreground h-8">
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
                                    onClick={() => setLanguage(lang.value)}
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
                            <Button variant="ghost" size="icon" title="More options">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={toggleStarred}>
                                <Star className={cn("mr-2 h-4 w-4", starred && "fill-amber-400 text-amber-400")} />
                                <span>{starred ? 'Unstar' : 'Star'}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDownload}>
                                <Download className="mr-2 h-4 w-4" />
                                <span>Download</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                                {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                                <span>Switch Theme</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete Note</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="w-px h-6 bg-border mx-1" />

                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        size="sm"
                        className="gap-2"
                    >
                        <Save className="h-4 w-4" />
                        <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
                    </Button>

                    <Button size="sm" variant="ghost" onClick={handleCreateNote}>
                        <Plus className="h-4 w-4" />
                        <span className="sr-only sm:not-sr-only sm:ml-1">New</span>
                    </Button>
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 min-h-0">
                <NoteEditor
                    value={content}
                    onChange={setContent}
                    language={language}
                    isPrivate={isPrivate}
                    onTogglePrivate={togglePrivate}
                />
            </div>

            {/* Delete Confirmation */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. The note &quot;{note.title}&quot; will be permanently deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
