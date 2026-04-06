'use client';

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
import { Button } from '@/components/ui/button';
import { History, Plus, Loader2, Trash2, RotateCcw, Check } from 'lucide-react';
import { Checkpoint } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDate } from '@/lib/utils';
import { useState } from 'react';

interface CheckpointHistoryProps {
  checkpoints: Checkpoint[];
  currentCheckpointId?: string;
  viewingCheckpointId?: string | null;
  isLoading: boolean;
  isSaving: boolean;
  onCreateCheckpoint: () => void;
  onViewCheckpoint: (id: string) => void;
  onMakeCurrent: (id: string) => void;
  onDeleteCheckpoint: (id: string) => void;
}

export function CheckpointHistory({
  checkpoints,
  currentCheckpointId,
  viewingCheckpointId,
  isLoading,
  isSaving,
  onCreateCheckpoint,
  onViewCheckpoint,
  onMakeCurrent,
  onDeleteCheckpoint,
}: CheckpointHistoryProps) {
  const [open, setOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteCheckpoint(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleMakeCurrent = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onMakeCurrent(id);
    setOpen(false);
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" title="History & Checkpoints">
            <History className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>History</span>
            <span className="text-muted-foreground text-xs font-normal">
              {checkpoints.length} versions
            </span>
          </DropdownMenuLabel>

          <div className="p-2">
            <Button
              size="sm"
              className="w-full justify-start gap-2"
              onClick={onCreateCheckpoint}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Checkpoint
            </Button>
          </div>

          <DropdownMenuSeparator />

          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="text-muted-foreground p-4 text-center text-sm">Loading...</div>
            ) : checkpoints.length === 0 ? (
              <div className="text-muted-foreground p-4 text-center text-sm">
                No checkpoints yet.
              </div>
            ) : (
              <div className="py-1">
                {checkpoints.map((cp, index) => {
                  const isCurrent = index === 0 || cp.id === currentCheckpointId;
                  const isViewing = cp.id === viewingCheckpointId;

                  return (
                    <DropdownMenuItem
                      key={cp.id}
                      onClick={() => onViewCheckpoint(cp.id)}
                      className="group flex cursor-pointer flex-col items-start gap-1 py-3"
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{formatDate(cp.updatedAt)}</span>
                          {isCurrent && (
                            <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium">
                              <Check className="h-3 w-3" />
                              Current
                            </span>
                          )}
                          {isViewing && !isCurrent && (
                            <span className="bg-muted text-muted-foreground inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium">
                              Viewing
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          {!isCurrent && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => handleMakeCurrent(e, cp.id)}
                                title="Make current"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive h-6 w-6"
                                onClick={(e) => handleDelete(e, cp.id)}
                                title="Delete checkpoint"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-muted-foreground line-clamp-2 text-xs">
                        {cp.content.slice(0, 60).replace(/\n/g, ' ')}...
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Checkpoint?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this checkpoint. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
