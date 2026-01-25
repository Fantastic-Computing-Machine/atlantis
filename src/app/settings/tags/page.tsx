
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Loader2, ArrowLeft, Tag as TagIcon } from 'lucide-react';
import type { Tag } from '@/lib/types';
import { toast } from 'sonner';
import Link from 'next/link';

export default function TagsSettingsPage() {
    const [tags, setTags] = React.useState<Tag[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [newTagName, setNewTagName] = React.useState('');
    const [newTagColor, setNewTagColor] = React.useState('#3b82f6');
    const [creating, setCreating] = React.useState(false);

    const fetchTags = React.useCallback(async () => {
        try {
            const res = await fetch('/api/tags');
            const data = await res.json();
            if (Array.isArray(data)) {
                setTags(data);
            }
        } catch (error) {
            toast.error('Failed to load tags');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchTags();
    }, [fetchTags]);

    const handleCreateTag = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTagName.trim()) return;

        setCreating(true);
        try {
            const res = await fetch('/api/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newTagName, color: newTagColor }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create tag');
            }

            toast.success('Tag created');
            setNewTagName('');
            fetchTags();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteTag = async (id: string) => {
        if (!confirm('Are you sure you want to delete this tag? It will be removed from all items.')) return;

        try {
            const res = await fetch(`/api/tags/${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Failed to delete tag');

            toast.success('Tag deleted');
            setTags(tags.filter(t => t.id !== id));
        } catch (error) {
            toast.error('Failed to delete tag');
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="bg-background text-foreground min-h-screen">
            {/* Header */}
            <header className="bg-background/80 sticky top-0 z-50 border-b backdrop-blur-sm">
                <div className="container mx-auto flex h-16 items-center gap-4 px-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/settings">
                            <ArrowLeft className="h-5 w-5" />
                            <span className="sr-only">Back</span>
                        </Link>
                    </Button>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl" role="img" aria-label="atlantis logo">
                            🔱
                        </span>
                        <h1 className="text-xl font-bold">Tag Settings</h1>
                    </div>
                </div>
            </header>

            <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <TagIcon className="text-primary h-5 w-5" />
                            <CardTitle>Manage Tags</CardTitle>
                        </div>
                        <CardDescription>
                            Create and manage tags to organize your notes and diagrams. Max 25 tags.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Create Form */}
                        <div className="bg-muted/30 p-4 rounded-lg border border-dashed">
                            <form onSubmit={handleCreateTag} className="flex flex-col sm:flex-row gap-4 items-end">
                                <div className="flex-1 space-y-2 w-full">
                                    <label className="text-sm font-medium">Name</label>
                                    <Input
                                        placeholder="New Tag Name"
                                        value={newTagName}
                                        onChange={(e) => setNewTagName(e.target.value)}
                                        maxLength={20}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={newTagColor}
                                            onChange={(e) => setNewTagColor(e.target.value)}
                                            className="h-10 w-12 p-1 rounded border cursor-pointer bg-background"
                                        />
                                    </div>
                                </div>
                                <Button type="submit" disabled={creating || !newTagName.trim()} className="w-full sm:w-auto">
                                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                                    Create
                                </Button>
                            </form>
                        </div>

                        {/* List */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <h4 className="text-sm font-medium text-muted-foreground">Existing Tags</h4>
                                <span className="text-xs text-muted-foreground">{tags.length} / 25</span>
                            </div>

                            <div className="grid gap-2">
                                {tags.map((tag) => (
                                    <div key={tag.id} className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-4 w-4 rounded-full border shadow-sm" style={{ backgroundColor: tag.color }} />
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{tag.name}</span>
                                                <span className="text-[10px] text-muted-foreground font-mono">#{tag.slug}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {(tag as any)._count && (
                                                <div className="text-xs text-muted-foreground">
                                                    {(tag as any)._count.notes + (tag as any)._count.diagrams} uses
                                                </div>
                                            )}
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteTag(tag.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {tags.length === 0 && (
                                    <div className="text-center p-8 text-muted-foreground border border-dashed rounded-md bg-muted/10">
                                        <TagIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p>No tags created yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
