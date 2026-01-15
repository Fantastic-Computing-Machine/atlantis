'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn, copyToClipboard } from '@/lib/utils';
import {
  AlertCircle,
  Focus,
  Grid3x3,
  Maximize,
  Minimize,
  RotateCcw,
  Settings2,
  Share2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import mermaid from 'mermaid';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactZoomPanPinchRef,
  TransformComponent,
  TransformWrapper
} from 'react-zoom-pan-pinch';
import { toast } from 'sonner';

interface CanvasProps {
  code: string;
  diagramId?: string;
}

type BgPattern = 'none' | 'dots' | 'grid';

// Smooth animation duration in ms
const ANIMATION_DURATION = 200;

export function Canvas({ code, diagramId }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bgPattern, setBgPattern] = useState<BgPattern>('dots');
  const [bgColorClass, setBgColorClass] = useState<string>('bg-muted/30');
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: resolvedTheme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
      flowchart: { useMaxWidth: false },
      sequence: { useMaxWidth: false },
      gantt: { useMaxWidth: false },
      journey: { useMaxWidth: false },
      class: { useMaxWidth: false },
      state: { useMaxWidth: false },
      er: { useMaxWidth: false },
      pie: { useMaxWidth: false },
    });
  }, [resolvedTheme]);

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;

    if (!document.fullscreenElement) {
      wrapperRef.current
        .requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
        })
        .catch(() => {
          toast.error('Failed to enter fullscreen');
        });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      try {
        setError(null);
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);
        if (isMounted) setSvg(svg);
      } catch (err) {
        if (isMounted) {
          console.error('Mermaid render error:', err);
          setError(
            err instanceof Error ? err.message : String(err)
          );
        }
      }
    };

    if (code) {
      const timeout = setTimeout(renderDiagram, 300);
      return () => clearTimeout(timeout);
    }

    return () => {
      isMounted = false;
    };
  }, [code, resolvedTheme]);

  // Center the diagram when SVG changes
  useEffect(() => {
    if (svg && transformRef.current) {
      const timeout = setTimeout(() => {
        transformRef.current?.centerView(1, ANIMATION_DURATION);
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [svg]);

  // Recenter handler
  const handleRecenter = useCallback(() => {
    if (transformRef.current) {
      transformRef.current.centerView(1, ANIMATION_DURATION);
    }
  }, []);

  const getPatternClass = () => {
    switch (bgPattern) {
      case 'dots':
        return 'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff22_1px,transparent_1px)] [background-size:16px_16px]';
      case 'grid':
        return 'bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] [background-size:24px_24px]';
      default:
        return '';
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'h-full w-full relative overflow-hidden flex flex-col group transition-colors duration-300',
        bgColorClass,
        getPatternClass()
      )}
    >
      {error && (
        <Alert variant="destructive" className="absolute top-4 left-4 z-10 max-w-md shadow-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Syntax Error</AlertTitle>
          <AlertDescription>
            <pre className="text-xs whitespace-pre-wrap font-mono mt-1">{error}</pre>
          </AlertDescription>
        </Alert>
      )}

      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={0.1}
        maxScale={5}
        centerOnInit={true}
        limitToBounds={false}
        // Smooth panning settings
        panning={{
          velocityDisabled: false,
        }}
        // Fine-grained wheel zoom (smaller step = more control)
        wheel={{
          step: 0.08,
          smoothStep: 0.002,
        }}
        // Fine-grained pinch zoom
        pinch={{
          step: 3,
        }}
        // Moderate double-click zoom
        doubleClick={{
          step: 0.4,
          mode: 'zoomIn',
        }}
        // Velocity and animation settings for smooth movement
        velocityAnimation={{
          sensitivity: 1,
          animationTime: 300,
          animationType: 'easeOut',
          equalToMove: true,
        }}
        alignmentAnimation={{
          sizeX: 0,
          sizeY: 0,
          animationTime: ANIMATION_DURATION,
          animationType: 'easeInOutCubic',
        }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex flex-col gap-1 bg-background/80 backdrop-blur-sm border rounded-lg p-1 shadow-sm">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => zoomIn(0.3, ANIMATION_DURATION)}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Zoom in</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => zoomOut(0.3, ANIMATION_DURATION)}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Zoom out</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRecenter}
                    >
                      <Focus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Center diagram</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => resetTransform(ANIMATION_DURATION)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Reset view</TooltipContent>
                </Tooltip>
              </div>

              <div className="flex flex-col gap-1 bg-background/80 backdrop-blur-sm border rounded-lg p-1 shadow-sm">
                {diagramId && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          const url = `${window.location.origin}/${diagramId}`;
                          const success = await copyToClipboard(url);
                          if (success) {
                            toast.success('Link copied to clipboard');
                          } else {
                            toast.error('Failed to copy link');
                          }
                        }}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Copy link</TooltipContent>
                  </Tooltip>
                )}

                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="left">Canvas settings</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Background</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setBgPattern('none')}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border rounded bg-transparent" />
                        <span>None</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBgPattern('dots')}>
                      <div className="flex items-center gap-2">
                        <Grid3x3 className="w-4 h-4" />
                        <span>Dots</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBgPattern('grid')}>
                      <div className="flex items-center gap-2">
                        <Grid3x3 className="w-4 h-4 opacity-50" />
                        <span>Grid</span>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Color</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setBgColorClass('bg-muted/30')}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border bg-muted" />
                        Default
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBgColorClass('bg-background')}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border bg-background" />
                        Plain
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBgColorClass('bg-blue-50/50 dark:bg-blue-950/20')}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border bg-blue-100 dark:bg-blue-900" />
                        Blue Tint
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleFullscreen}
                    >
                      {isFullscreen ? (
                        <Minimize className="h-4 w-4" />
                      ) : (
                        <Maximize className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    {isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <TransformComponent
              wrapperClass="!h-full !w-full !cursor-grab active:!cursor-grabbing"
              contentClass="!h-full !w-full !flex !items-center !justify-center"
              wrapperStyle={{
                width: '100%',
                height: '100%',
              }}
            >
              <div
                ref={containerRef}
                className="[&_svg]:max-w-none [&_svg]:h-auto [&_svg]:w-auto transition-opacity duration-200"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
