'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Diagram } from '@/lib/types';
import { copyToClipboard } from '@/lib/utils';
import { ExternalLink, Eye, Focus, RotateCcw, Share2, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { toast } from 'sonner';

const TransformWrapper = dynamic(
    () => import('react-zoom-pan-pinch').then((mod) => mod.TransformWrapper),
    { ssr: false }
);
const TransformComponent = dynamic(
    () => import('react-zoom-pan-pinch').then((mod) => mod.TransformComponent),
    { ssr: false }
);

const ANIMATION_DURATION = 200;

interface PeekDiagramModalProps {
    diagram: Diagram | null;
    onClose: () => void;
    onDelete: (id: string) => void;
}

export function PeekDiagramModal({
    diagram,
    onClose,
    onDelete,
}: PeekDiagramModalProps) {
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Initialize Mermaid when theme changes
    useEffect(() => {
        import('mermaid').then((mermaid) => {
            mermaid.default.initialize({
                startOnLoad: false,
                theme: resolvedTheme === 'dark' ? 'dark' : 'default',
                securityLevel: 'loose',
                fontFamily: 'inherit',
                flowchart: { useMaxWidth: true },
                sequence: { useMaxWidth: true },
                suppressErrorRendering: true,
            });
        });
    }, [resolvedTheme]);

    // Render diagram when modal opens
    useEffect(() => {
        if (!diagram) {
            setSvg('');
            setError(null);
            return;
        }

        let isMounted = true;

        const renderDiagram = async () => {
            try {
                setError(null);
                setSvg('');

                const id = `peek-mermaid-${Date.now()}`;
                const mermaid = (await import('mermaid')).default;

                // Validate before render
                try {
                    mermaid.parse(diagram.content);
                } catch (parseErr) {
                    if (isMounted) {
                        const message = parseErr instanceof Error ? parseErr.message : String(parseErr);
                        setError(message || 'Mermaid parse error');
                    }
                    return;
                }

                const { svg: renderedSvg } = await mermaid.render(id, diagram.content);
                if (isMounted) setSvg(renderedSvg);
            } catch (err) {
                if (isMounted) {
                    const message = err instanceof Error ? err.message : String(err);
                    setError(message);
                }
            }
        };

        renderDiagram();

        return () => {
            isMounted = false;
        };
    }, [diagram, resolvedTheme]);

    const handleView = () => {
        if (diagram) {
            router.push(`/${diagram.id}`);
            onClose();
        }
    };

    const handleShare = async () => {
        if (!diagram) return;
        const url = `${window.location.origin}/${diagram.id}`;
        const success = await copyToClipboard(url);
        if (success) {
            toast.success('Link copied to clipboard');
        } else {
            toast.error('Failed to copy link');
        }
    };

    const handleDelete = () => {
        if (diagram) {
            onDelete(diagram.id);
        }
    };

    return (
        <Dialog open={!!diagram} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-xl">{diagram?.emoji || '📊'}</span>
                        {diagram?.title || 'Untitled Diagram'}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm mt-1.5 line-clamp-2">
                        {diagram?.description || 'No description provided.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-hidden">
                    <div
                        ref={containerRef}
                        className="bg-muted/30 rounded-lg h-[350px] overflow-hidden relative group"
                    >
                        {error ? (
                            <div className="h-full flex items-center justify-center text-destructive text-sm text-center p-4">
                                <div>
                                    <p className="font-medium">Syntax Error</p>
                                    <pre className="text-xs mt-1 whitespace-pre-wrap">{error}</pre>
                                </div>
                            </div>
                        ) : svg ? (
                            <TransformWrapper
                                initialScale={1}
                                minScale={0.1}
                                maxScale={5}
                                centerOnInit={true}
                                limitToBounds={false}
                                wheel={{ step: 0.08 }}
                                pinch={{ step: 3 }}
                                doubleClick={{ step: 0.4, mode: 'zoomIn' }}
                            >
                                {({ zoomIn, zoomOut, resetTransform, centerView }) => (
                                    <>
                                        <div className="absolute bottom-3 right-3 z-10 flex gap-1 bg-background/80 backdrop-blur-sm border rounded-lg p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => zoomIn(0.3, ANIMATION_DURATION)}
                                            >
                                                <ZoomIn className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => zoomOut(0.3, ANIMATION_DURATION)}
                                            >
                                                <ZoomOut className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => centerView(1, ANIMATION_DURATION)}
                                            >
                                                <Focus className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => resetTransform(ANIMATION_DURATION)}
                                            >
                                                <RotateCcw className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        <TransformComponent
                                            wrapperClass="!h-[350px] !w-full cursor-grab active:cursor-grabbing"
                                            contentClass="!h-full !w-full flex items-center justify-center"
                                        >
                                            <div
                                                className="[&_svg]:max-w-none [&_svg]:h-auto"
                                                dangerouslySetInnerHTML={{ __html: svg }}
                                            />
                                        </TransformComponent>
                                    </>
                                )}
                            </TransformWrapper>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm gap-2">
                                <Eye className="h-4 w-4 animate-pulse" />
                                Loading preview...
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="flex-row gap-2 sm:justify-center">
                    <Button onClick={handleView} className="flex-1 sm:flex-none">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View
                    </Button>
                    <Button variant="outline" onClick={handleShare} className="flex-1 sm:flex-none">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} className="flex-1 sm:flex-none">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
