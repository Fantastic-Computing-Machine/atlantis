
'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tag } from '@/lib/types';

interface TagPickerProps {
    selectedTags: Tag[];
    onTagsChange: (tags: Tag[]) => void;
    maxTags?: number;
    align?: 'start' | 'end' | 'center';
}

export function TagPicker({
    selectedTags,
    onTagsChange,
    maxTags = 3,
    align = 'start',
}: TagPickerProps) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [allTags, setAllTags] = React.useState<Tag[]>([]);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setLoading(true);
            fetch('/api/tags')
                .then((res) => res.json())
                .then((data) => {
                    if (Array.isArray(data)) {
                        setAllTags(data);
                    }
                })
                .finally(() => setLoading(false));
        }
    }, [open]);

    const toggleTag = (tag: Tag) => {
        const isSelected = selectedTags.some((t) => t.id === tag.id);
        if (isSelected) {
            onTagsChange(selectedTags.filter((t) => t.id !== tag.id));
        } else {
            if (selectedTags.length >= maxTags) return;
            onTagsChange([...selectedTags, tag]);
        }
    };

    const filteredTags = allTags.filter((tag) =>
        tag.name.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="flex flex-nowrap items-center gap-1.5 overflow-hidden">
            {selectedTags.map((tag) => (
                <Badge
                    key={tag.id}
                    variant="secondary"
                    className="gap-1 pr-0.5 h-6 rounded-md px-2 font-normal shrink-0"
                    style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color + '40' }}
                >
                    <span className="text-[10px] opacity-70">#</span>
                    <a href={`/tags/${tag.slug}`} className="truncate max-w-[80px] sm:max-w-[120px] hover:underline" onClick={(e) => e.stopPropagation()}>
                        {tag.name}
                    </a>
                    <div
                        role="button"
                        className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 ml-1 cursor-pointer"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onTagsChange(selectedTags.filter((t) => t.id !== tag.id))
                        }}
                    >
                        <X className="h-3 w-3" />
                    </div>
                </Badge>
            ))}

            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-6 gap-1 rounded-md border-dashed border-muted-foreground/30 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                        disabled={selectedTags.length >= maxTags}
                    >
                        <Plus className="h-3 w-3" />
                        <span className={cn(selectedTags.length > 0 && "hidden lg:inline")}>
                            {selectedTags.length === 0 ? 'Add Tag' : 'Add'}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="p-0 w-52" align={align} sideOffset={8}>
                    <div className="p-2 border-b">
                        <input
                            className="flex h-8 w-full rounded-md bg-transparent px-3 py-1 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Search tags..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto p-1">
                        {loading && <div className="p-2 text-xs text-muted-foreground text-center">Loading...</div>}

                        {!loading && filteredTags.length === 0 && (
                            <div className="p-2 text-xs text-muted-foreground text-center">No tags found.</div>
                        )}

                        {filteredTags.map(tag => {
                            const isSelected = selectedTags.some(t => t.id === tag.id);
                            return (
                                <div
                                    key={tag.id}
                                    className={cn(
                                        "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                        isSelected && "bg-accent"
                                    )}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toggleTag(tag);
                                    }}
                                >
                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                                    <span className="flex-1 truncate">{tag.name}</span>
                                    {isSelected && <Check className="h-4 w-4" />}
                                </div>
                            )
                        })}
                    </div>
                    <div className="p-2 border-t bg-muted/50">
                        <p className="text-[10px] text-muted-foreground text-center">Manage tags in Settings</p>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
