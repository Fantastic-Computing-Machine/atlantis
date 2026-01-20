
'use client';

import { NoteEditor } from '@/components/notes/NoteEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Note } from '@/lib/types';
import { ensureCsrfToken, withCsrfHeader } from '@/lib/csrf-client';
import { cn } from '@/lib/utils';
import { useDiagramStore } from '@/lib/store';
import { useNotes } from '@/components/notes/NotesContext';
import { ArrowLeft, Star, Trash2, ChevronDown, Save, Download, Plus, Moon, Sun, MoreVertical } from 'lucide-react';
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
    const [isPrivate, setIsPrivate] = useState(initialNote.private);
    const [starred, setStarred] = useState(initialNote.starred);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Track changes
    useEffect(() => {
        const changed =
            title !== note.title ||
            content !== note.content ||
            language !== note.language ||
            isPrivate !== note.private ||
            starred !== note.starred;
        setHasChanges(changed);
    }, [title, content, language, isPrivate, starred, note]);

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
    }, [content, hasChanges, settings.autoSave]);

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
                }),
            }));

            if (!res.ok) {
                throw new Error('Failed to save');
            }

            const updatedNote = await res.json();
            setNote(updatedNote);
            setHasChanges(false);

            // Update sidebar in real-time
            updateNote(note.id, {
                title: updatedNote.title,
                language: updatedNote.language,
                starred: updatedNote.starred,
                private: updatedNote.private,
                updatedAt: updatedNote.updatedAt,
            });
        } catch {
            toast.error('Failed to save note');
        } finally {
            setIsSaving(false);
        }
    }, [note.id, title, content, language, isPrivate, starred, isSaving, updateNote]);

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

    const toggleStarred = useCallback(() => {
        setStarred((prev) => !prev);
    }, []);

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
            <div className="h-14 border-b flex items-center justify-between px-4 bg-background shrink-0 gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Link href="/notes" className="shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>

                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleSave}
                        className="h-8 min-w-[100px] flex-1 text-sm font-medium border-transparent hover:border-input focus:border-input px-2 truncate"
                        placeholder="Note title..."
                    />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-xs shrink-0 hidden md:flex">
                                {SUPPORTED_LANGUAGES.find((l) => l.value === language)?.label || language}
                                <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
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
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {hasChanges && (
                        <span className="text-xs text-muted-foreground mr-1 hidden sm:inline">Unsaved changes</span>
                    )}

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleDownload}
                            title="Download file"
                        >
                            <Download className="h-4 w-4" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={toggleStarred}
                        >
                            <Star
                                className={`h-4 w-4 ${starred ? 'text-yellow-500 fill-yellow-500' : ''}`}
                            />
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={handleSave}
                            disabled={!hasChanges || isSaving}
                        >
                            <Save className="h-3.5 w-3.5 mr-1" />
                            {isSaving ? 'Saving...' : 'Save'}
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setShowDeleteDialog(true)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>

                        <div className="w-px h-6 bg-border mx-1" />

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                >
                                    {theme === 'dark' ? (
                                        <Sun className="h-4 w-4" />
                                    ) : (
                                        <Moon className="h-4 w-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                            </TooltipContent>
                        </Tooltip>

                        <Button size="sm" onClick={handleCreateNote} className="h-8">
                            <Plus className="h-4 w-4 mr-1" />
                            New
                        </Button>
                    </div>

                    {/* Mobile Actions Menu */}
                    <div className="md:hidden flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleSave}
                            disabled={!hasChanges || isSaving}
                        >
                            <Save className={hasChanges ? "h-4 w-4 text-primary" : "h-4 w-4"} />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={toggleStarred}>
                                    <Star className={cn("h-4 w-4 mr-2", starred && "text-yellow-500 fill-yellow-500")} />
                                    {starred ? 'Unstar' : 'Star'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownload}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                                    {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                                    Toggle Theme
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Language</DropdownMenuLabel>
                                {SUPPORTED_LANGUAGES.map((lang) => (
                                    <DropdownMenuItem
                                        key={lang.value}
                                        onClick={() => setLanguage(lang.value)}
                                        className={language === lang.value ? 'bg-muted' : ''}
                                    >
                                        {lang.label}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Note
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button size="icon" variant="ghost" onClick={handleCreateNote} className="h-8 w-8">
                            <Plus className="h-5 w-5" />
                        </Button>
                    </div>
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
