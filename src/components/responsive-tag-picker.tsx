
'use client';

import * as React from 'react';
import { TagPicker } from '@/components/tag-picker';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Tag as TagIcon } from 'lucide-react';
import type { Tag } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface ResponsiveTagPickerProps {
    selectedTags: Tag[];
    onTagsChange: (tags: Tag[]) => void;
    maxTags?: number;
    align?: 'start' | 'end' | 'center';
}

export function ResponsiveTagPicker({
    selectedTags,
    onTagsChange,
    maxTags = 3,
    align = 'start',
}: ResponsiveTagPickerProps) {
    const [open, setOpen] = React.useState(false);

    // Desktop view: Use the standard inline picker
    const DesktopView = (
        <div className="hidden lg:block">
            <TagPicker
                selectedTags={selectedTags}
                onTagsChange={onTagsChange}
                maxTags={maxTags}
                align={align}
            />
        </div>
    );

    // Mobile/Tablet view: Use a Dialog (or Drawer/Sheet could be better, but Dialog is safe)
    const MobileView = (
        <div className="lg:hidden">
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                        <TagIcon className="h-4 w-4" />
                        {selectedTags.length > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground font-bold">
                                {selectedTags.length}
                            </span>
                        )}
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage Tags</DialogTitle>
                        <DialogDescription>
                            Assign up to {maxTags} tags to this item.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <TagPicker selectedTags={selectedTags} onTagsChange={onTagsChange} maxTags={maxTags} />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );

    return (
        <>
            {DesktopView}
            {MobileView}
        </>
    );
}
