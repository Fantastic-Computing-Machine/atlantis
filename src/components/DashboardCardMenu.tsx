'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Star, Trash2, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
import { CSRF_HEADER_NAME, ensureCsrfToken } from '@/lib/csrf-client';
import { copyToClipboard, cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DashboardCardMenuProps {
    id: string;
    title: string;
    type: 'diagram' | 'note';
    isStarred: boolean;
}

export function DashboardCardMenu({ id, title, type, isStarred }: DashboardCardMenuProps) {
    const router = useRouter();
    const [starred, setStarred] = useState(isStarred);
    const [showDelete, setShowDelete] = useState(false);

    const handleStar = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const newStarred = !starred;
        setStarred(newStarred);

        try {
            const csrfToken = await ensureCsrfToken();
            const url = type === 'diagram' ? `/api/diagrams/${id}` : `/api/notes/${id}`;
            const body = type === 'diagram' ? { isFavorite: newStarred } : { starred: newStarred };

            const res = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    [CSRF_HEADER_NAME]: csrfToken,
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error('Failed to update');
            router.refresh();
        } catch {
            setStarred(!newStarred);
            toast.error('Failed to update');
        }
    };

    const handleDelete = async () => {
        try {
            const csrfToken = await ensureCsrfToken();
            const url = type === 'diagram' ? `/api/diagrams/${id}` : `/api/notes/${id}`;

            const res = await fetch(url, {
                method: 'DELETE',
                headers: {
                    [CSRF_HEADER_NAME]: csrfToken,
                },
            });

            if (!res.ok) throw new Error('Failed to delete');
            toast.success(`${type === 'diagram' ? 'Diagram' : 'Note'} deleted`);
            router.refresh();
        } catch {
            toast.error('Failed to delete');
        }
        setShowDelete(false);
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const path = type === 'diagram' ? `/diagram/${id}` : `/notes/${id}`;
        const url = `${window.location.origin}${path}`;
        const success = await copyToClipboard(url);
        if (success) {
            toast.success('Link copied');
        } else {
            toast.error('Failed to copy');
        }
    };

    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (type === 'note') {
            // Download note as .txt
            try {
                const res = await fetch(`/api/notes/${id}`);
                const note = await res.json();
                const blob = new Blob([note.content || ''], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${title || 'note'}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success('Downloaded');
            } catch {
                toast.error('Failed to download');
            }
        } else {
            // For diagrams, navigate to the diagram page where full download options exist
            window.open(`/diagram/${id}`, '_blank');
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                        <span className="sr-only">Menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem onClick={handleShare}>
                        <Share2 className="mr-2 h-3.5 w-3.5" />
                        Copy link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleStar}>
                        <Star className={cn('mr-2 h-3.5 w-3.5', starred && 'fill-yellow-400 text-yellow-400')} />
                        {starred ? 'Unstar' : 'Star'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownload}>
                        <Download className="mr-2 h-3.5 w-3.5" />
                        Download
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowDelete(true);
                        }}
                    >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {type}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete &ldquo;{title}&rdquo;. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
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
