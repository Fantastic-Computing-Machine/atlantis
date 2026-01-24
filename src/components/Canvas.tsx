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
  Download,
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
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { toast } from 'sonner';

import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';

interface CanvasProps {
  code: string;
  diagramId?: string;
  title?: string;
  selectedNodeId?: string | null;
  onNodeSelect?: (node: { id: string; label?: string }) => void;
}

type BgPattern = 'none' | 'dots' | 'grid';

// Smooth animation duration in ms
const ANIMATION_DURATION = 200;

const extractNodeId = (element: Element): string | null => {
  const dataId = element.getAttribute('data-id');
  if (dataId) return dataId;

  const title = element.querySelector('title')?.textContent?.trim();
  if (title) return title;

  const rawId = element.getAttribute('id');
  if (!rawId) return null;

  const cleaned = rawId
    .replace(/^flowchart-/, '')
    .replace(/^graph-/, '')
    .replace(/^classDiagram-/, '')
    .replace(/^stateDiagram-/, '')
    .replace(/^erDiagram-/, '');

  const trimmed = cleaned.replace(/-\d+$/, '');
  return trimmed || null;
};

const isNodeElement = (element: Element): boolean => {
  const classList = Array.from(element.classList);
  if (classList.includes('edgePath') || classList.includes('edgeLabel')) return false;
  if (element.hasAttribute('data-id')) return true;
  if (classList.includes('node') || classList.includes('cluster')) return true;
  if (classList.some((cls) => cls.endsWith('node') || cls.includes('node'))) return true;
  const id = element.getAttribute('id') ?? '';
  if (/^(flowchart|graph|classDiagram|stateDiagram|erDiagram)-/i.test(id)) return true;
  return !!element.querySelector('title');
};

const findNodeElement = (start: Element | null, root: SVGSVGElement): Element | null => {
  let current: Element | null = start;
  while (current && current !== root) {
    if (current.tagName.toLowerCase() === 'g' && isNodeElement(current)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
};

export function Canvas({ code, diagramId, title, selectedNodeId, onNodeSelect }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const pointerDownRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const lastErrorRef = useRef<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bgPattern, setBgPattern] = useState<BgPattern>('dots');
  const [bgColorClass, setBgColorClass] = useState<string>('bg-muted/30');
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    import('mermaid').then((mermaid) => {
      mermaid.default.initialize({
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
        // Suppress built-in error SVG/banner; handle errors ourselves
        suppressErrorRendering: true,
        // @ts-expect-error parseError exists at runtime in Mermaid 11
        parseError: (err: unknown) => {
          const message =
            typeof err === 'string'
              ? err
              : (err as { str?: string; message?: string }).str ||
              (err as { str?: string; message?: string }).message ||
              'Mermaid parse error';
          throw new Error(message);
        },
      });
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
        if (isMounted) {
          setError(null);
          setSvg('');
        }
        const id = `mermaid-${Date.now()}`;
        const mermaid = (await import('mermaid')).default;
        // Validate before render to surface parser errors cleanly
        try {
          mermaid.parse(code);
        } catch (parseErr) {
          if (isMounted) {
            const message = parseErr instanceof Error ? parseErr.message : String(parseErr);
            setError(message || 'Mermaid parse error');
            setSvg('');
          }
          return;
        }

        const { svg } = await mermaid.render(id, code);
        // Mermaid can return an error SVG; guard against it
        if (svg.includes('Syntax error in text') || svg.includes('Parse error')) {
          if (isMounted) {
            setError('Mermaid parse error');
            setSvg('');
          }
          return;
        }

        if (isMounted) setSvg(svg);
      } catch (err) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : String(err);
          if (lastErrorRef.current !== message) {
            console.error('Mermaid render error:', err);
            lastErrorRef.current = message;
          }
          setError(message);
          setSvg('');
        }
      }
    };

    if (code) {
      const timeout = setTimeout(renderDiagram, 300);
      return () => clearTimeout(timeout);
    }

    // If code is empty, clear previous output and errors
    setSvg('');
    setError(null);

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

  useEffect(() => {
    if (!svg || !onNodeSelect) return;
    const svgEl = containerRef.current?.querySelector('svg');
    if (!svgEl) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      const nodeEl =
        (target?.closest('[data-id]') as Element | null) ??
        (target?.closest('g.node') as Element | null) ??
        (target?.closest('g.cluster') as Element | null) ??
        null;

      pointerDownRef.current = {
        x: event.clientX,
        y: event.clientY,
        time: Date.now()
      };

      // Prevent pan start when clicking a node
      if (nodeEl) {
        event.stopPropagation();
        event.preventDefault();
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      const start = pointerDownRef.current;
      pointerDownRef.current = null;
      if (!start) return;

      const dx = Math.abs(event.clientX - start.x);
      const dy = Math.abs(event.clientY - start.y);
      if (dx > 6 || dy > 6) return;

      const target = event.target as Element | null;
      if (!target) return;
      const nodeEl =
        (target.closest('[data-id]') as Element | null) ??
        (target.closest('g.node') as Element | null) ??
        (target.closest('g.cluster') as Element | null) ??
        findNodeElement(target, svgEl);
      if (!nodeEl) return;
      const nodeId = extractNodeId(nodeEl);
      if (!nodeId) return;
      const labelNode = nodeEl.querySelector('text');
      const label = labelNode?.textContent?.trim();
      onNodeSelect({ id: nodeId, label });
    };

    svgEl.addEventListener('pointerdown', handlePointerDown);
    svgEl.addEventListener('pointerup', handlePointerUp);
    return () => {
      svgEl.removeEventListener('pointerdown', handlePointerDown);
      svgEl.removeEventListener('pointerup', handlePointerUp);
    };
  }, [svg, onNodeSelect]);

  useEffect(() => {
    if (!svg) return;
    const svgEl = containerRef.current?.querySelector('svg');
    if (!svgEl) return;

    const nodes = Array.from(svgEl.querySelectorAll('g'));
    const nodeElements = nodes.filter((el) => isNodeElement(el));
    nodeElements.forEach((el) => {
      (el as SVGElement).style.cursor = onNodeSelect ? 'pointer' : '';
      (el as SVGElement).style.filter = '';
      el.classList.remove('mermaid-node-selected');
      (el as SVGElement).style.pointerEvents = onNodeSelect ? 'all' : '';
      Array.from(el.querySelectorAll('*')).forEach((child) => {
        (child as SVGElement).style.pointerEvents = onNodeSelect ? 'all' : '';
      });
    });

    if (!selectedNodeId) return;
    const active = nodeElements.find((el) => extractNodeId(el) === selectedNodeId);
    if (active) {
      (active as SVGElement).style.filter = 'drop-shadow(0 0 8px rgba(59,130,246,0.55))';
      active.classList.add('mermaid-node-selected');
    }
  }, [selectedNodeId, svg, onNodeSelect]);

  // Recenter handler
  const handleRecenter = useCallback(() => {
    if (transformRef.current) {
      transformRef.current.centerView(1, ANIMATION_DURATION);
    }
  }, []);

  const sanitizeFilename = (ext: string) => {
    const name = title || diagramId || 'diagram';
    const safeName = name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    return `${safeName}.${ext}`;
  };

  const handleExportSvg = () => {
    if (!svg) return;
    try {
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = sanitizeFilename('svg');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('SVG downloaded');
    } catch (err) {
      console.error('Export SVG error:', err);
      toast.error('Failed to export SVG');
    }
  };

  const handleExportPng = async () => {
    if (!containerRef.current) return;
    const svgEl = containerRef.current.querySelector('svg');
    if (!svgEl) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not supported');

      // Get intrinsic dimensions from viewBox
      const viewBox = svgEl.getAttribute('viewBox')?.split(' ').map(Number);
      const svgWidth = viewBox ? viewBox[2] : svgEl.clientWidth;
      const svgHeight = viewBox ? viewBox[3] : svgEl.clientHeight;

      // Use high DPI for better quality
      const scale = 2;
      canvas.width = svgWidth * scale;
      canvas.height = svgHeight * scale;

      const img = new Image();
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, svgWidth, svgHeight);

      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = sanitizeFilename('png');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PNG downloaded');
    } catch (err) {
      console.error('Export PNG error:', err);
      toast.error('Failed to export PNG');
    }
  };

  const handleExportPdf = async () => {
    if (!containerRef.current) return;
    const svgEl = containerRef.current.querySelector('svg');
    if (!svgEl) return;

    try {
      // 1. Render to Canvas first (reusing PNG logic parts)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not supported');

      const viewBox = svgEl.getAttribute('viewBox')?.split(' ').map(Number);
      const svgWidth = viewBox ? viewBox[2] : svgEl.clientWidth;
      const svgHeight = viewBox ? viewBox[3] : svgEl.clientHeight;

      // Scale for PDF quality
      const scale = 2;
      canvas.width = svgWidth * scale;
      canvas.height = svgHeight * scale;

      const img = new Image();
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
      const imgData = canvas.toDataURL('image/png');
      URL.revokeObjectURL(url);

      // 2. Create PDF
      const isLandscape = svgWidth > svgHeight;
      const jsPDF = (await import('jspdf')).default;
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'px',
        format: [svgWidth + 40, svgHeight + 40] // Add margin
      });

      // Add white background
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), 'F');

      // Add image centered
      pdf.addImage(imgData, 'PNG', 20, 20, svgWidth, svgHeight);
      pdf.save(sanitizeFilename('pdf'));
      toast.success('PDF downloaded');

    } catch (err) {
      console.error('Export PDF error:', err);
      toast.error('Failed to export PDF');
    }
  };

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
            <div className="absolute z-20 flex gap-2 md:flex-col md:bottom-6 md:right-6 top-4 right-3 md:top-auto md:right-6 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
              <div className="hidden md:flex flex-col gap-1 bg-background/80 backdrop-blur-sm border rounded-lg p-1 shadow-sm">
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

              <div className="flex flex-row md:flex-col gap-1 bg-background/80 backdrop-blur-sm border rounded-lg p-1 shadow-sm">
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
                        <Button variant="ghost" size="icon" disabled={!svg}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="left">Export diagram</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportSvg}>
                      Download SVG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPng}>
                      Download PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPdf}>
                      Download PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="hidden md:block">
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
                </div>

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
