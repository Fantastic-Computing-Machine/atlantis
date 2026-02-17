'use client';

import * as React from 'react';
import Link from 'next/link';
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
          className="h-6 shrink-0 gap-1 rounded-md px-2 pr-0.5 font-normal"
          style={{
            backgroundColor: tag.color + '20',
            color: tag.color,
            borderColor: tag.color + '40',
          }}
        >
          <span className="text-[10px] opacity-70">#</span>
          <Link
            href={`/tags/${tag.slug}`}
            className="max-w-[80px] truncate hover:underline sm:max-w-[120px]"
            onClick={(e) => e.stopPropagation()}
          >
            {tag.name}
          </Link>
          <div
            role="button"
            className="ml-1 cursor-pointer rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTagsChange(selectedTags.filter((t) => t.id !== tag.id));
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
            className="border-muted-foreground/30 text-muted-foreground hover:text-foreground h-6 shrink-0 gap-1 rounded-md border-dashed px-2 text-xs"
            disabled={selectedTags.length >= maxTags}
          >
            <Plus className="h-3 w-3" />
            <span className={cn(selectedTags.length > 0 && 'hidden lg:inline')}>
              {selectedTags.length === 0 ? 'Add Tag' : 'Add'}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-52 p-0" align={align} sideOffset={8}>
          <div className="border-b p-2">
            <input
              className="placeholder:text-muted-foreground flex h-8 w-full rounded-md bg-transparent px-3 py-1 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search tags..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {loading && (
              <div className="text-muted-foreground p-2 text-center text-xs">Loading...</div>
            )}

            {!loading && filteredTags.length === 0 && (
              <div className="text-muted-foreground p-2 text-center text-xs">No tags found.</div>
            )}

            {filteredTags.map((tag) => {
              const isSelected = selectedTags.some((t) => t.id === tag.id);
              return (
                <div
                  key={tag.id}
                  className={cn(
                    'hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
                    isSelected && 'bg-accent'
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
              );
            })}
          </div>
          <div className="bg-muted/50 border-t p-2">
            <p className="text-muted-foreground text-center text-[10px]">
              Manage tags in{' '}
              <a
                href="/settings/tags"
                className="hover:text-foreground underline transition-colors"
              >
                Settings
              </a>
            </p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
