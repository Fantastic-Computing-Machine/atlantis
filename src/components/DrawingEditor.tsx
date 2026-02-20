'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Tldraw, useEditor, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { useDebounceCallback } from 'usehooks-ts';
import { toast } from 'sonner';
import Link from 'next/link';
import { ResponsiveTagPicker } from '@/components/responsive-tag-picker';
import { Canvas, Tag } from '@/lib/types';
import { CSRF_HEADER_NAME, ensureCsrfToken } from '@/lib/csrf-client';

interface DrawingEditorProps {
    initialCanvas: Canvas;
    onSave?: (content: string, preview?: string) => Promise<void>;
}

function EditorController({
    initialContent,
    onSave,
    onEditorMount
}: {
    initialContent?: string;
    onSave?: (content: string, preview?: string) => Promise<void>;
    onEditorMount?: (editor: Editor) => void;
}) {
    const editor = useEditor();
    const isReadyRef = useRef(false);

    useEffect(() => {
        if (onEditorMount) {
            onEditorMount(editor);
        }
    }, [editor, onEditorMount]);

    // Load initial content
    useEffect(() => {
        if (isReadyRef.current) return;
        isReadyRef.current = true;
        if (initialContent) {
            try {
                const snapshot = JSON.parse(initialContent);
                editor.loadSnapshot(snapshot);
            } catch (e) {
                console.error('Failed to load snapshot', e);
            }
        }
    }, [editor, initialContent]);

    // Handle auto-save
    const handleSave = useDebounceCallback(async () => {
        if (!onSave) return;
        const { document, session } = editor.getSnapshot();
        const json = JSON.stringify({ document, session });

        // Generate SVG preview
        let preview: string | undefined;
        try {
            // 1. Get all shape IDs to render everything
            const shapeIds = Array.from(editor.getCurrentPageShapeIds());
            if (shapeIds.length > 0) {
                const result = await editor.getSvgElement(shapeIds, {
                    scale: 1,
                    background: true,
                });
                if (result) {
                    const svg = result.svg;
                    // Convert SVG to string
                    const serializer = new XMLSerializer();
                    const svgString = serializer.serializeToString(svg);
                    // Base64 encode for simple storage/transport (or store as raw string if DB permits)
                    // For correct data URI: data:image/svg+xml;base64,...
                    preview = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
                }
            }
        } catch (e) {
            console.error('Failed to generate preview', e);
        }

        // We need to pass the preview alongside content.
        // However, onSave currently only accepts content string (which is usually just the snapshot JSON).
        // Quick fix: The backend `updateCanvasById` expects us to call it.
        // But `onSave` in Page calls `saveCanvas` which calls `updateCanvasById`.
        // Let's modify `onSave` signature in props to accept options object or second arg.
        // OR better: The Page component defines `saveCanvas`. We should update `saveCanvas` to accept an optional preview.
        // But `onSave` prop type is `(content: string) => Promise<void>`.
        // Let's perform a direct API call here for the preview to ensure it saves even if `onSave` is just for content syncing?
        // Actually, the `Page` component's `saveCanvas` is a Server Action. We can't easily change its signature without changing the prop type everywhere.
        // Let's assume we can change the prop type in `DrawingEditor` and update `Page`.

        await onSave(json, preview);
    }, 1000);

    useEffect(() => {
        const cleanup = editor.store.listen(() => {
            handleSave();
        });
        return () => cleanup();
    }, [editor, handleSave]);

    return null;
}

export function DrawingEditor({ initialCanvas, onSave }: DrawingEditorProps) {
    const [canvas, setCanvas] = useState<Canvas>(initialCanvas);
    const [tags, setTags] = useState<Tag[]>(initialCanvas.tags || []);

    // Derived state for local edits before save
    const [title, setTitle] = useState(initialCanvas.title);
    const [emoji, setEmoji] = useState(initialCanvas.emoji);

    const lastSavedTitle = useRef(initialCanvas.title);
    const lastSavedEmoji = useRef(initialCanvas.emoji);
    const lastSavedTags = useRef(initialCanvas.tags || []);

    // Update document title
    useEffect(() => {
        document.title = `atlantis // ${title}`;
    }, [title]);

    const saveMetadata = useCallback(async (updates: Omit<Partial<Canvas>, 'tags'> & { tags?: string[] }, silent = false) => {
        try {
            const csrfToken = await ensureCsrfToken();
            const res = await fetch(`/api/canvases/${canvas.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    [CSRF_HEADER_NAME]: csrfToken,
                },
                body: JSON.stringify(updates),
            });

            if (!res.ok) throw new Error('Failed to save metadata');

            const updated = await res.json();
            setCanvas(prev => ({ ...prev, ...updated }));

            // Update refs
            if (updates.title !== undefined) lastSavedTitle.current = updated.title;
            if (updates.emoji !== undefined) lastSavedEmoji.current = updated.emoji;
            if (updates.tags !== undefined) lastSavedTags.current = updated.tags || [];

            if (!silent) toast.success('Saved');
        } catch (error) {
            console.error('Failed to save canvas metadata:', error);
            if (!silent) toast.error('Failed to save changes');
        }
    }, [canvas.id]);

    // Debounced title save
    const debouncedSaveTitle = useDebounceCallback(async (newTitle: string) => {
        if (newTitle === lastSavedTitle.current) return;
        await saveMetadata({ title: newTitle }, true);
    }, 1000);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        debouncedSaveTitle(e.target.value);
    };

    // Save tags immediately when changed
    useEffect(() => {
        // loose comparison for tags
        const currentTagIds = tags.map(t => t.id).sort().join(',');
        const savedTagIds = lastSavedTags.current.map(t => t.id).sort().join(',');

        if (currentTagIds !== savedTagIds) {
            saveMetadata({ tags: tags.map(t => t.id) }, true);
        }
    }, [tags, saveMetadata]);

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            {/* Header */}
            <div className="bg-background/80 sticky top-0 z-50 shrink-0 border-b backdrop-blur-sm h-14 flex items-center justify-between px-4 gap-4">
                {/* Left: Branding & Title */}
                <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
                    <Link
                        href="/"
                        className="flex shrink-0 items-center gap-1 transition-opacity hover:opacity-80"
                    >
                        <span className="text-2xl sm:hidden">🔱</span>
                        <span className="hidden text-lg font-semibold sm:inline">🔱 atlantis //</span>
                    </Link>

                    <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />

                    <div className="flex max-w-xl min-w-0 flex-1 items-center gap-2">
                        <input
                            value={emoji}
                            onChange={(e) => {
                                setEmoji(e.target.value);
                                saveMetadata({ emoji: e.target.value }, true);
                            }}
                            className="w-8 text-xl bg-transparent border-none focus:ring-0 text-center p-0 cursor-pointer"
                            title="Change Emoji"
                        />
                        <input
                            value={title}
                            onChange={handleTitleChange}
                            maxLength={60}
                            className="min-w-[60px] flex-1 truncate border-none bg-transparent px-0 text-sm font-medium focus:ring-0 focus:outline-none sm:text-base"
                            placeholder="Untitled Canvas"
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
                <div className="flex shrink-0 items-center gap-1">
                    {/* Placeholder for Search or other actions */}
                </div>
            </div>

            <div className="relative flex-1 w-full bg-muted/10">
                <Tldraw
                    persistenceKey={`canvas-${canvas.id}`}
                >
                    <EditorController
                        initialContent={canvas.content}
                        onSave={onSave}
                    />
                </Tldraw>
            </div>
        </div>
    );
}
