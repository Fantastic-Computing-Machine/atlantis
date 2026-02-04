'use client';

import { useEffect, useState, useRef, type ComponentPropsWithoutRef } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, GitBranch, Loader2, Copy, Check } from 'lucide-react';
import type { Note, Diagram } from '@/lib/types';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface NoteMarkdownPreviewProps {
  content: string;
  filename?: string;
  editorScrollPercentage?: number;
  onScroll?: (percentage: number) => void;
}

// Internal link embed component
function InternalLinkEmbed({ type, id }: { type: 'note' | 'diagram'; id: string }) {
  const [data, setData] = useState<Note | Diagram | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const endpoint = type === 'note' ? `/api/notes/${id}` : `/api/diagrams/${id}`;
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('Not found');
        const json = await res.json();
        setData(json);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [type, id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 my-2 rounded-lg border border-border bg-muted/50">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading {type}...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <a
        href={type === 'note' ? `/notes/${id}` : `/diagram/${id}`}
        className="flex items-center gap-2 p-3 my-2 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors"
      >
        {type === 'note' ? <FileText className="h-4 w-4" /> : <GitBranch className="h-4 w-4" />}
        <span className="text-sm">Open {type}</span>
      </a>
    );
  }

  const title = data.title || 'Untitled';
  const emoji = data.emoji || (type === 'note' ? '📝' : '📊');
  const preview = data.content?.slice(0, 120).replace(/[#*`\n]/g, ' ').trim() || '';
  const href = type === 'note' ? `/notes/${id}` : `/diagram/${id}`;

  return (
    <a
      href={href}
      className="block p-4 my-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground group-hover:text-primary transition-colors">
            {title}
          </div>
          {preview && (
            <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {preview}...
            </div>
          )}
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
      </div>
    </a>
  );
}

// Code block component with copy button
function CodeBlock({ children, className, ...props }: ComponentPropsWithoutRef<'code'>) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const isInline = !className?.includes('language-');

  // For inline code
  if (isInline) {
    return (
      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    );
  }

  const codeString = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4">
      {language && (
        <span className="absolute top-2 left-3 text-xs text-muted-foreground uppercase">
          {language}
        </span>
      )}
      <button
        className="absolute top-2 right-2 p-1.5 rounded bg-muted-foreground/10 hover:bg-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
      <pre className={`bg-muted p-4 ${language ? 'pt-8' : ''} rounded-lg overflow-x-auto`}>
        <code className="text-sm font-mono block whitespace-pre">{codeString}</code>
      </pre>
    </div>
  );
}

// Custom link component that detects internal links
function CustomLink({ href, children, ...props }: ComponentPropsWithoutRef<'a'>) {
  // Check for internal note/diagram links
  const noteMatch = href?.match(/\/notes\/([a-zA-Z0-9_-]+)$/);
  const diagramMatch = href?.match(/\/diagram\/([a-zA-Z0-9_-]+)$/);

  if (noteMatch) {
    return <InternalLinkEmbed type="note" id={noteMatch[1]} />;
  }

  if (diagramMatch) {
    return <InternalLinkEmbed type="diagram" id={diagramMatch[1]} />;
  }

  // Regular external link
  return (
    <a
      href={href}
      className="text-primary underline hover:no-underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  );
}

// Custom components for react-markdown
const markdownComponents = {
  // Headings with proper styling
  h1: ({ children, ...props }: ComponentPropsWithoutRef<'h1'>) => (
    <h1 className="text-2xl font-bold mt-6 mb-4 border-b pb-2" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: ComponentPropsWithoutRef<'h2'>) => (
    <h2 className="text-xl font-semibold mt-6 mb-3 border-b pb-2" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="text-lg font-semibold mt-5 mb-2" {...props}>{children}</h3>
  ),
  h4: ({ children, ...props }: ComponentPropsWithoutRef<'h4'>) => (
    <h4 className="text-base font-semibold mt-4 mb-2" {...props}>{children}</h4>
  ),
  h5: ({ children, ...props }: ComponentPropsWithoutRef<'h5'>) => (
    <h5 className="text-sm font-semibold mt-4 mb-2" {...props}>{children}</h5>
  ),
  h6: ({ children, ...props }: ComponentPropsWithoutRef<'h6'>) => (
    <h6 className="text-sm font-semibold mt-4 mb-2" {...props}>{children}</h6>
  ),

  // Paragraphs
  p: ({ children, ...props }: ComponentPropsWithoutRef<'p'>) => (
    <p className="my-3" {...props}>{children}</p>
  ),

  // Lists
  ul: ({ children, ...props }: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="my-2 ml-6 list-disc space-y-1" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: ComponentPropsWithoutRef<'ol'>) => (
    <ol className="my-2 ml-6 list-decimal space-y-1" {...props}>{children}</ol>
  ),
  li: ({ children, ...props }: ComponentPropsWithoutRef<'li'>) => (
    <li className="pl-1" {...props}>{children}</li>
  ),

  // Blockquote
  blockquote: ({ children, ...props }: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground my-4" {...props}>
      {children}
    </blockquote>
  ),

  // Horizontal rule
  hr: ({ ...props }: ComponentPropsWithoutRef<'hr'>) => (
    <hr className="my-6 border-border" {...props} />
  ),

  // Tables
  table: ({ children, ...props }: ComponentPropsWithoutRef<'table'>) => (
    <table className="border-collapse border border-border my-4 w-full" {...props}>{children}</table>
  ),
  thead: ({ children, ...props }: ComponentPropsWithoutRef<'thead'>) => (
    <thead className="bg-muted" {...props}>{children}</thead>
  ),
  th: ({ children, ...props }: ComponentPropsWithoutRef<'th'>) => (
    <th className="border border-border px-3 py-2 text-left font-semibold" {...props}>{children}</th>
  ),
  td: ({ children, ...props }: ComponentPropsWithoutRef<'td'>) => (
    <td className="border border-border px-3 py-2" {...props}>{children}</td>
  ),

  // Images
  img: ({ src, alt, ...props }: ComponentPropsWithoutRef<'img'>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt || ''} className="max-w-full rounded my-4" {...props} />
  ),

  // Code
  code: CodeBlock,

  // Links
  a: CustomLink,

  // Text formatting - only del needs custom styling
  del: ({ children, ...props }: ComponentPropsWithoutRef<'del'>) => (
    <del className="opacity-70" {...props}>{children}</del>
  ),

  // Task list items (GFM)
  input: ({ checked, ...props }: ComponentPropsWithoutRef<'input'>) => (
    <input
      type="checkbox"
      checked={checked}
      disabled
      className="mr-2 accent-primary"
      {...props}
    />
  ),
};

/**
 * Normalize markdown to fix common formatting issues that cause parsing problems.
 * - Fixes double spaces after list numbers (1.  -> 1. )
 * - Normalizes multiple spaces after list markers (*   -> - )
 * - Converts * to - for list items (clearer parsing)
 */
function normalizeMarkdown(content: string): string {
  let normalized = content;

  // Fix double+ spaces after numbered list markers: "1.  " -> "1. "
  normalized = normalized.replace(/^(\d+\.)\s{2,}/gm, '$1 ');

  // Convert "*" list markers to "-" and normalize spacing: "*   " -> "- "
  normalized = normalized.replace(/^(\s*)\*\s+/gm, '$1- ');

  return normalized;
}

export function NoteMarkdownPreview({ content, filename, editorScrollPercentage = 0, onScroll }: NoteMarkdownPreviewProps) {
  const [debouncedContent, setDebouncedContent] = useState(content);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce content updates for performance
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedContent(content);
    }, 150);
    return () => window.clearTimeout(handle);
  }, [content]);

  // Scroll Sync: Editor -> Preview
  useEffect(() => {
    if (containerRef.current && editorScrollPercentage >= 0) {
      const container = containerRef.current;
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll > 0) {
        container.scrollTop = maxScroll * editorScrollPercentage;
      }
    }
  }, [editorScrollPercentage]);

  const handleScroll = () => {
    if (onScroll && containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll > 0) {
        onScroll(scrollTop / maxScroll);
      }
    }
  };

  const popOut = () => {
    const safeTitle = buildDownloadName(filename);

    // Build standalone HTML for pop-out window
    const htmlContent = `<!doctype html><html><head><title>${safeTitle}</title>
<meta charset="utf-8" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV" crossorigin="anonymous">
<style>
body { margin: 24px; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; color: #111827; line-height: 1.6; }
h1,h2,h3,h4,h5,h6 { color: #0f172a; margin-top: 1.2em; }
h1, h2 { border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
code { background: #f3f4f6; padding: 2px 4px; border-radius: 4px; font-family: ui-monospace, monospace; }
pre { background: #f8fafc; padding: 12px; border-radius: 8px; overflow: auto; }
pre code { background: none; padding: 0; }
img { max-width: 100%; height: auto; border-radius: 8px; }
a { color: #2563eb; text-decoration: underline; }
a:hover { text-decoration: none; }
table { border-collapse: collapse; border: 1px solid #e5e7eb; margin: 16px 0; width: 100%; }
th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
thead { background: #f3f4f6; }
th { font-weight: 600; }
blockquote { border-left: 4px solid #3b82f6; padding-left: 16px; margin: 16px 0; font-style: italic; color: #6b7280; }
ul, ol { margin: 8px 0; padding-left: 24px; }
li { margin: 4px 0; }
hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
input[type="checkbox"] { margin-right: 8px; }
</style>
</head><body><div id="content">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script>document.getElementById('content').innerHTML = marked.parse(document.getElementById('content').textContent);</script>
</body></html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'resizable=yes,scrollbars=yes,width=1200,height=900,left=120,top=80');

    if (win) {
      win.addEventListener('beforeunload', () => URL.revokeObjectURL(url));
    } else {
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative h-full w-full overflow-auto"
    >
      <div className="sticky top-4 right-4 float-right z-10 flex items-center gap-2 mb-4 ml-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 bg-background/50 backdrop-blur-sm border shadow-sm"
          onClick={popOut}
          title="Open in new window"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none p-6 pt-2 clear-both">
        <Markdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={markdownComponents}
        >
          {normalizeMarkdown(debouncedContent)}
        </Markdown>
      </div>
    </div>
  );
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
