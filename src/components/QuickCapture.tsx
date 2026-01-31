'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CSRF_HEADER_NAME, ensureCsrfToken } from '@/lib/csrf-client';
import { useShortcutPlatform } from '@/lib/use-platform';
import { toast } from 'sonner';

export function QuickCapture() {
    const router = useRouter();
    const { shortcutSymbol } = useShortcutPlatform();
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Keyboard shortcut: Alt + N to open quick capture
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && e.key === 'n') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
                setTitle('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsCreating(true);
        try {
            const csrfToken = await ensureCsrfToken();
            const res = await fetch('/api/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [CSRF_HEADER_NAME]: csrfToken,
                },
                body: JSON.stringify({ title: title.trim(), content: '', language: 'markdown' }),
            });

            if (!res.ok) throw new Error('Failed to create');
            const newNote = await res.json();
            toast.success('Note created');
            setTitle('');
            setIsOpen(false);
            router.push(`/notes/${newNote.id}`);
        } catch {
            toast.error('Failed to create note');
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) {
        return (
            <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => setIsOpen(true)}
            >
                <Plus className="h-3.5 w-3.5" />
                Quick capture
                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    Alt + N
                </kbd>
            </Button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
                ref={inputRef}
                type="text"
                placeholder="Note title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-sm w-48"
                disabled={isCreating}
            />
            <Button type="submit" size="sm" disabled={isCreating || !title.trim()}>
                {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Create'}
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                    setIsOpen(false);
                    setTitle('');
                }}
            >
                Cancel
            </Button>
        </form>
    );
}

export function KeyboardShortcuts() {
    const { shortcutSymbol } = useShortcutPlatform();

    const shortcuts = [
        { key: `${shortcutSymbol} + K`, label: 'Search' },
        { key: 'Alt + N', label: 'Quick note' },
    ];

    return (
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
            {shortcuts.map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1">
                    <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">{s.key}</kbd>
                    <span>{s.label}</span>
                </span>
            ))}
        </div>
    );
}
