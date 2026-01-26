
'use client';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { History, Plus, Loader2 } from 'lucide-react';
import { Checkpoint } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDate } from '@/lib/utils';
import { useState } from 'react';

interface CheckpointHistoryProps {
    checkpoints: Checkpoint[];
    isLoading: boolean;
    isSaving: boolean;
    onCreateCheckpoint: () => void;
    onRestoreCheckpoint: (id: string) => void;
}

export function CheckpointHistory({
    checkpoints,
    isLoading,
    isSaving,
    onCreateCheckpoint,
    onRestoreCheckpoint,
}: CheckpointHistoryProps) {
    const [open, setOpen] = useState(false);

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="History & Checkpoints">
                    <History className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>History</span>
                    <span className="text-xs font-normal text-muted-foreground">{checkpoints.length} versions</span>
                </DropdownMenuLabel>

                <div className="p-2">
                    <Button
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={onCreateCheckpoint}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Create Checkpoint
                    </Button>
                </div>

                <DropdownMenuSeparator />

                <ScrollArea className="h-[300px]">
                    {isLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                    ) : checkpoints.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No checkpoints yet.
                        </div>
                    ) : (
                        <div className="py-1">
                            {checkpoints.map((cp) => (
                                <DropdownMenuItem
                                    key={cp.id}
                                    onClick={() => onRestoreCheckpoint(cp.id)}
                                    className="flex flex-col items-start gap-1 py-3 cursor-pointer"
                                >
                                    <span className="font-medium text-sm">
                                        {formatDate(cp.updatedAt)}
                                    </span>
                                    <span className="text-xs text-muted-foreground line-clamp-2">
                                        {cp.content.slice(0, 60).replace(/\n/g, ' ')}...
                                    </span>
                                </DropdownMenuItem>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
