'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Tag as TagIcon, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import type { Tag } from '@/lib/types';

type TagWithCounts = Tag & { _count?: { notes: number; diagrams: number } };

export default function TagsSettingsPage() {
  const [tags, setTags] = useState<TagWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [creating, setCreating] = useState(false);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTags(data);
      }
    } catch {
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleCreateTag = async (e: FormEvent) => {
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
      await fetchTags();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    const confirmed = confirm(
      'Are you sure you want to delete this tag? It will be removed from all items.'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete tag');

      toast.success('Tag deleted');
      setTags((prevTags) => prevTags.filter((t) => t.id !== id));
    } catch {
      toast.error('Failed to delete tag');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground animate-spin" />
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
            <Link href="/" className="transition-opacity hover:opacity-80">
              <span className="text-2xl" role="img" aria-label="atlantis logo">
                🔱
              </span>
            </Link>
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
            <div className="bg-muted/30 rounded-lg border border-dashed p-4">
              <form
                onSubmit={handleCreateTag}
                className="flex flex-col items-end gap-4 sm:flex-row"
              >
                <div className="w-full flex-1 space-y-2">
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
                      className="bg-background h-10 w-12 cursor-pointer rounded border p-1"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={creating || !newTagName.trim()}
                  className="w-full sm:w-auto"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Create
                </Button>
              </form>
            </div>

            {/* List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-muted-foreground text-sm font-medium">Existing Tags</h4>
                <span className="text-muted-foreground text-xs">{tags.length} / 25</span>
              </div>

              <div className="grid gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="bg-card hover:bg-muted/20 group flex items-center justify-between rounded-md border p-3 transition-colors"
                  >
                    <Link
                      href={`/tags/${tag.slug}`}
                      className="flex flex-1 items-center gap-3 transition-opacity hover:opacity-80"
                    >
                      <div
                        className="h-4 w-4 rounded-full border shadow-sm"
                        style={{ backgroundColor: tag.color }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium group-hover:underline">
                          {tag.name}
                        </span>
                        <span className="text-muted-foreground font-mono text-[10px]">
                          #{tag.slug}
                        </span>
                      </div>
                    </Link>
                    <div className="flex items-center gap-4">
                      {tag._count && (
                        <div className="text-muted-foreground text-xs">
                          {tag._count.notes + tag._count.diagrams} uses
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTag(tag.id)}
                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {tags.length === 0 && (
                  <div className="text-muted-foreground bg-muted/10 rounded-md border border-dashed p-8 text-center">
                    <TagIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
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
