'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  ExternalLink,
  RotateCcw,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface NoteLatexPreviewProps {
  content: string;
  editorScrollPercentage: number; // 0 to 1
  onScroll: (percentage: number) => void;
  filename?: string;
}

export function NoteLatexPreview({
  content,
  editorScrollPercentage,
  onScroll,
  filename,
}: NoteLatexPreviewProps) {
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [showFullLog, setShowFullLog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [fitScale, setFitScale] = useState(1.0);
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isFirstCompile, setIsFirstCompile] = useState(true);
  const requestIdRef = useRef(0);

  const scale = fitScale * zoom;

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Debounce compilation
  const compileLatex = useCallback(async () => {
    if (!content.trim()) return;

    const currentId = requestIdRef.current + 1;
    requestIdRef.current = currentId;

    setLoading(true);
    setError(null);
    setLog(null);
    setWarning(null);
    setShowFullLog(false);

    try {
      const res = await fetch('/api/notes/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      // Ignore stale responses
      if (currentId !== requestIdRef.current) {
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Compilation failed', { cause: data });
      }

      const warningHeader = res.headers.get('x-latex-warning');
      const logSnippet = res.headers.get('x-latex-log-b64');
      const warningMsg = res.headers.get('x-latex-warning-msg');

      const blob = await res.blob();
      const buffer = await blob.arrayBuffer();
      setPdfData(buffer);
      setIsFirstCompile(false);
      if (warningHeader) {
        let decodedLog: string | null = null;
        if (logSnippet) {
          try {
            decodedLog = atob(logSnippet);
          } catch (decodeError) {
            console.error('Failed to decode log snippet', decodeError);
            decodedLog = logSnippet;
          }
        }

        setWarning(warningMsg || 'Compilation completed with warnings.');
        setLog(decodedLog);
      }
    } catch (err: unknown) {
      console.error(err);
      const error = err as Error & { cause?: { log?: string; stdout?: string; details?: string } };
      setError(error.message);
      if (error.cause?.log) {
        setLog(error.cause.log);
      } else if (error.cause?.stdout) {
        setLog(error.cause.stdout);
      } else if (error.cause?.details) {
        setLog(error.cause.details);
      }
      setWarning(null);
    } finally {
      if (currentId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [content]);

  useEffect(() => {
    const baseDelay = 1500;
    const initialExtra = isFirstCompile ? 400 : 0;
    const timer = setTimeout(() => {
      compileLatex();
    }, baseDelay + initialExtra);

    return () => clearTimeout(timer);
  }, [compileLatex, isFirstCompile]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // Scroll Sync: Editor -> Preview
  useEffect(() => {
    if (loading || numPages === 0) return;
    if (containerRef.current) {
      const container = containerRef.current;
      const maxScroll = container.scrollHeight - container.clientHeight;
      // Only scroll if the difference is significant to avoid loops if we add bidirectional sync carefully
      // Ideally we check if "we" are scrolling or "they" are scrolling.
      // For now, simple set.
      if (maxScroll > 0) {
        container.scrollTop = maxScroll * editorScrollPercentage;
      }
    }
  }, [editorScrollPercentage, loading, numPages]); // Remove onScroll from dependency to avoid loops?

  // Handle user scrolling the preview
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll > 0) {
        const percentage = scrollTop / maxScroll;
        onScroll(percentage);
      }
    }
  };

  // Auto-scale width
  useEffect(() => {
    // rough estimation: width - padding
    if (width) {
      // Standard A4 is approx 595pt width.
      // Lets just fit width
      const a4width = 595;
      const calculated = (width - 48) / a4width;
      setFitScale(calculated > 0 ? calculated : 1);
    }
  }, [width]);

  useEffect(() => {
    if (!pdfData) {
      setPdfUrl(null);
      return;
    }
    const blob = new Blob([pdfData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [pdfData]);

  const zoomIn = useCallback(() => {
    setZoom((prev) => clamp(prev + 0.1, 0.5, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => clamp(prev - 0.1, 0.5, 3));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  const openInNewWindow = useCallback(() => {
    if (!pdfUrl) return;
    // Request a separate window with resizable controls; browsers may still choose a tab depending on settings
    window.open(
      pdfUrl,
      '_blank',
      'noopener,noreferrer,resizable=yes,scrollbars=yes,width=1280,height=800,left=120,top=80'
    );
  }, [pdfUrl]);

  const downloadPdf = useCallback(() => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = buildDownloadName(filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [pdfUrl, filename]);

  return (
    <div className="bg-muted/20 relative flex h-full flex-col">
      {/* Status Bar */}
      <div className="bg-background flex h-10 shrink-0 items-center justify-between border-b px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          {loading ? (
            <>
              <Loader2 className="text-muted-foreground h-3 w-3 animate-spin" />
              <span className="text-muted-foreground">Compiling...</span>
            </>
          ) : error ? (
            <span className="text-destructive flex items-center gap-1 font-medium">
              <AlertCircle className="h-3 w-3" />
              Compilation Failed
            </span>
          ) : warning ? (
            <span className="flex items-center gap-1 font-medium text-amber-600">
              <AlertCircle className="h-3 w-3" />
              Warning
            </span>
          ) : (
            <span className="font-medium text-green-600">Ready</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={compileLatex}
          title="Force Recompile"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={zoomOut}
            disabled={!pdfData}
            title="Zoom out"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={resetZoom}
            disabled={!pdfData}
            title="Reset zoom"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={zoomIn}
            disabled={!pdfData}
            title="Zoom in"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={openInNewWindow}
            disabled={!pdfUrl}
            title="Open in new window"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={downloadPdf}
            disabled={!pdfUrl}
            title="Download PDF"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Preview Area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative flex flex-1 flex-col items-center gap-4 overflow-auto p-6"
      >
        {loading && pdfData && (
          <div className="bg-background/40 pointer-events-none absolute inset-0 z-10 flex items-start justify-center backdrop-blur-[1px]">
            <div className="bg-background/90 text-muted-foreground mt-4 flex items-center gap-2 rounded-full px-3 py-1 text-xs shadow-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Compiling…</span>
            </div>
          </div>
        )}
        {error ? (
          <Alert variant="destructive" className="max-w-full">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="mt-2 max-h-[50vh] overflow-auto font-mono text-xs whitespace-pre-wrap">
              {log || error}
            </AlertDescription>
          </Alert>
        ) : null}

        {pdfData ? (
          <>
            {warning && (
              <Alert className="max-w-full border-amber-200 bg-amber-50 text-amber-900">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Compiled with warnings</AlertTitle>
                <AlertDescription className="mt-2 max-h-[25vh] overflow-auto font-mono text-xs whitespace-pre-wrap">
                  <div className="flex items-start justify-between gap-2">
                    <span className="leading-relaxed">{warning}</span>
                    {log && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setShowFullLog((prev) => !prev)}
                      >
                        {showFullLog ? (
                          <>
                            Hide log
                            <ChevronUp className="ml-1 h-3 w-3" />
                          </>
                        ) : (
                          <>
                            Show log
                            <ChevronDown className="ml-1 h-3 w-3" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  {showFullLog && log && (
                    <pre className="mt-3 max-h-64 overflow-auto rounded border border-amber-200 bg-white/60 p-3 text-[11px] whitespace-pre-wrap text-slate-900">
                      {log.length > 2000 ? `${log.slice(0, 2000)}…` : log}
                    </pre>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <Document
              file={pdfData}
              onLoadSuccess={onDocumentLoadSuccess}
              className="shadow-lg"
              loading={
                <div className="text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading PDF...
                </div>
              }
            >
              {Array.from(new Array(numPages), (el, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  scale={scale}
                  className="mb-4 bg-white shadow-sm last:mb-0"
                  renderAnnotationLayer={true}
                  renderTextLayer={true}
                />
              ))}
            </Document>
          </>
        ) : (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-sm">
            <p>No PDF generated yet.</p>
            <p className="text-xs opacity-70">Type some LaTeX to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function buildDownloadName(name?: string): string {
  const base = (name || 'document').trim();
  const safeTitle =
    base
      .replace(/[^a-zA-Z0-9_\-\. ]+/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 60) || 'document';
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:]/g, '-').replace(/\..+/, '');
  const filename = `${safeTitle}_${timestamp}`;
  return filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
}
