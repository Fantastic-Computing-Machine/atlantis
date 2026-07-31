'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import matter from 'gray-matter';
import { Check, Copy, ExternalLink, FileText, GitBranch, Loader2 } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';

import { Button } from '@/components/ui/button';
import type { Diagram, Note } from '@/lib/types';

interface NoteMarkdownPreviewProps {
  content: string;
  filename?: string;
  editorScrollPercentage?: number;
  onScroll?: (percentage: number) => void;
}

type FrontmatterEntry = {
  key: string;
  label: string;
  values: string[];
};

type ParsedMarkdown = {
  body: string;
  frontmatter: FrontmatterEntry[];
};

type InternalLink = {
  type: 'note' | 'diagram';
  id: string;
};

type MarkdownExtraProps = {
  node?: unknown;
};

const remarkPlugins = [remarkGfm, remarkMath, remarkBreaks];
const rehypePlugins = [rehypeRaw, rehypeKatex];

const markdownComponents: Components = {
  a: MarkdownLink,
  code: MarkdownCode,
  pre: ({ children }) => <>{children}</>,
  img: MarkdownImage,
};

function InternalLinkEmbed({ type, id }: InternalLink) {
  const [data, setData] = useState<Note | Diagram | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const href = type === 'note' ? `/notes/${id}` : `/diagram/${id}`;

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
      <span className="border-border bg-muted/50 my-2 flex items-center gap-2 rounded-md border p-3">
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        <span className="text-muted-foreground text-sm">Loading {type}...</span>
      </span>
    );
  }

  if (error || !data) {
    return (
      <a
        href={href}
        className="border-border bg-muted/50 hover:bg-muted my-2 flex items-center gap-2 rounded-md border p-3 no-underline transition-colors"
      >
        {type === 'note' ? <FileText className="h-4 w-4" /> : <GitBranch className="h-4 w-4" />}
        <span className="text-sm">Open {type}</span>
      </a>
    );
  }

  const title = data.title || 'Untitled';
  const emoji = data.emoji || (type === 'note' ? '📝' : '📊');
  const preview =
    data.content
      ?.slice(0, 120)
      .replace(/[#*`\n]/g, ' ')
      .trim() || '';

  return (
    <a
      href={href}
      className="border-border bg-card hover:bg-muted/50 group my-3 flex items-start gap-3 rounded-md border p-4 no-underline transition-colors"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="text-foreground group-hover:text-primary block font-medium transition-colors">
          {title}
        </span>
        {preview && (
          <span className="text-muted-foreground mt-1 line-clamp-2 block text-sm">
            {preview}...
          </span>
        )}
      </span>
      <ExternalLink className="text-muted-foreground mt-1 h-4 w-4 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}

function Frontmatter({ entries }: { entries: FrontmatterEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <dl className="markdown-frontmatter">
      {entries.map((entry) => (
        <div key={entry.key}>
          <dt>{entry.label}</dt>
          <dd>
            {entry.values.length > 1 ? (
              <span className="markdown-frontmatter-list">
                {entry.values.map((value) => (
                  <span key={`${entry.key}-${value}`}>{value}</span>
                ))}
              </span>
            ) : (
              entry.values[0]
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function MarkdownLink(props: React.AnchorHTMLAttributes<HTMLAnchorElement> & MarkdownExtraProps) {
  const { children, href, ...linkProps } = omitMarkdownNode(props);
  const internalLink = parseInternalHref(href);

  if (internalLink) {
    return <InternalLinkEmbed {...internalLink} />;
  }

  return (
    <a
      href={href}
      rel={href?.startsWith('#') ? undefined : 'noopener'}
      target={href?.startsWith('#') ? undefined : '_blank'}
      {...linkProps}
    >
      {children}
    </a>
  );
}

function MarkdownCode(props: React.HTMLAttributes<HTMLElement> & MarkdownExtraProps) {
  const { children, className, ...codeProps } = omitMarkdownNode(props);
  const code = String(children).replace(/\n$/, '');
  const language = /language-([\w-]+)/.exec(className || '')?.[1];
  const isBlock = Boolean(language) || code.includes('\n');

  if (!isBlock) {
    return (
      <code className={className} {...codeProps}>
        {children}
      </code>
    );
  }

  return <CodeBlock code={code} language={language} />;
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);

      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }

      resetTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        resetTimerRef.current = null;
      }, 1500);
    } catch {
      setCopied(false);
    }
  }, [code]);

  return (
    <div className="markdown-code-block">
      {language && <span>{language}</span>}
      <button type="button" aria-label="Copy code" onClick={handleCopy}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MarkdownImage(props: React.ImgHTMLAttributes<HTMLImageElement> & MarkdownExtraProps) {
  const imageProps = omitMarkdownNode(props);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Markdown image dimensions are user-authored.
    <img {...imageProps} alt={imageProps.alt || ''} />
  );
}

export function NoteMarkdownPreview({
  content,
  filename,
  editorScrollPercentage = 0,
  onScroll,
}: NoteMarkdownPreviewProps) {
  const [debouncedContent, setDebouncedContent] = useState(content);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedContent(content);
    }, 150);

    return () => window.clearTimeout(handle);
  }, [content]);

  const markdown = useMemo(() => parseMarkdown(debouncedContent), [debouncedContent]);

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
    const title = buildWindowTitle(filename);
    const html = previewContentRef.current?.innerHTML ?? '';
    const htmlContent = `<!doctype html><html><head><title>${escapeHtml(title)}</title>
<meta charset="utf-8" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV" crossorigin="anonymous">
<style>${markdownCss.replaceAll('</style>', '<\\/style>')}</style>
</head><body><main class="markdown-body">${html}</main></body></html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(
      url,
      '_blank',
      'resizable=yes,scrollbars=yes,width=1200,height=900,left=120,top=80'
    );

    if (win) {
      win.addEventListener('beforeunload', () => {
        URL.revokeObjectURL(url);
      });
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
      <div className="sticky top-4 right-4 z-10 float-right mb-4 ml-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="bg-background/50 h-8 w-8 border shadow-sm backdrop-blur-sm"
          onClick={popOut}
          title="Open in new window"
          aria-label="Open preview in new window"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
      <div ref={previewContentRef} className="markdown-body clear-both max-w-none p-6 pt-2">
        <Frontmatter entries={markdown.frontmatter} />
        <ReactMarkdown
          components={markdownComponents}
          rehypePlugins={rehypePlugins}
          remarkPlugins={remarkPlugins}
        >
          {markdown.body}
        </ReactMarkdown>
      </div>
      <style jsx global>
        {markdownCss}
      </style>
    </div>
  );
}

function parseMarkdown(content: string): ParsedMarkdown {
  try {
    const parsed = matter(content);
    const normalizedBody = normalizeLatexMathDelimiters(parsed.content);

    return {
      body: normalizedBody,
      frontmatter: normalizeFrontmatter(parsed.data),
    };
  } catch {
    return { body: content, frontmatter: [] };
  }
}

function normalizeLatexMathDelimiters(markdown: string): string {
  const segments = splitByFencedCodeBlocks(markdown);

  return segments
    .map((segment) =>
      segment.type === 'fence' ? segment.value : normalizeLatexMathInText(segment.value)
    )
    .join('');
}

function splitByFencedCodeBlocks(
  markdown: string
): Array<{ type: 'text' | 'fence'; value: string }> {
  const segments: Array<{ type: 'text' | 'fence'; value: string }> = [];
  const lines = markdown.split('\n');
  let textBuffer = '';
  let fenceBuffer = '';
  let inFence = false;
  let fenceChar = '';
  let fenceLength = 0;

  const flushText = () => {
    if (textBuffer) {
      segments.push({ type: 'text', value: textBuffer });
      textBuffer = '';
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineWithBreak = index < lines.length - 1 ? `${line}\n` : line;

    if (!inFence) {
      const openMatch = line.match(/^\s{0,3}(`{3,}|~{3,})[^\n]*$/);

      if (!openMatch) {
        textBuffer += lineWithBreak;
        continue;
      }

      flushText();
      inFence = true;
      fenceChar = openMatch[1][0];
      fenceLength = openMatch[1].length;
      fenceBuffer = lineWithBreak;
      continue;
    }

    fenceBuffer += lineWithBreak;

    const closeMatch = line.match(/^\s{0,3}(`{3,}|~{3,})[ \t]*$/);
    if (!closeMatch) {
      continue;
    }

    if (closeMatch[1][0] !== fenceChar || closeMatch[1].length < fenceLength) {
      continue;
    }

    segments.push({ type: 'fence', value: fenceBuffer });
    inFence = false;
    fenceChar = '';
    fenceLength = 0;
    fenceBuffer = '';
  }

  if (inFence && fenceBuffer) {
    segments.push({ type: 'fence', value: fenceBuffer });
  }

  flushText();
  return segments;
}

function normalizeLatexMathInText(text: string): string {
  const blockNormalized = normalizeBracketWrappedBlockMath(text);
  let output = '';
  let cursor = 0;

  while (cursor < blockNormalized.length) {
    if (blockNormalized[cursor] === '`') {
      const backtickCount = countConsecutive(blockNormalized, cursor, '`');
      const delimiter = '`'.repeat(backtickCount);
      const closeIndex = blockNormalized.indexOf(delimiter, cursor + backtickCount);

      if (closeIndex === -1) {
        output += blockNormalized.slice(cursor);
        break;
      }

      output += blockNormalized.slice(cursor, closeIndex + backtickCount);
      cursor = closeIndex + backtickCount;
      continue;
    }

    if (blockNormalized.startsWith('\\[', cursor)) {
      const closeIndex = findClosingMathDelimiter(blockNormalized, cursor + 2, '\\]');

      if (closeIndex !== -1) {
        output += `$$${blockNormalized.slice(cursor + 2, closeIndex)}$$`;
        cursor = closeIndex + 2;
        continue;
      }
    }

    if (blockNormalized.startsWith('\\(', cursor)) {
      const closeIndex = findClosingMathDelimiter(blockNormalized, cursor + 2, '\\)');

      if (closeIndex !== -1) {
        output += `$${blockNormalized.slice(cursor + 2, closeIndex)}$`;
        cursor = closeIndex + 2;
        continue;
      }
    }

    if (blockNormalized[cursor] === '(') {
      const closeIndex = blockNormalized.indexOf(')', cursor + 1);

      if (closeIndex !== -1) {
        const candidate = blockNormalized.slice(cursor + 1, closeIndex);

        if (
          /^\s+[\s\S]*\s+$/.test(candidate) &&
          isLikelyMathContent(candidate.trim()) &&
          !isEscaped(blockNormalized, cursor)
        ) {
          output += `$${candidate.trim()}$`;
          cursor = closeIndex + 1;
          continue;
        }
      }
    }

    output += blockNormalized[cursor];
    cursor += 1;
  }

  return output;
}

function normalizeBracketWrappedBlockMath(text: string): string {
  return text.replace(
    /(^|\n)[ \t]*\[\s*\n([\s\S]*?)\n[ \t]*\](?=\n|$)/g,
    (match, prefix: string, body: string) => {
      const trimmedBody = body.trim();

      if (!trimmedBody || !isLikelyMathContent(trimmedBody)) {
        return match;
      }

      return `${prefix}$$${trimmedBody}$$`;
    }
  );
}

function findClosingMathDelimiter(text: string, fromIndex: number, delimiter: '\\)' | '\\]'): number {
  let searchIndex = fromIndex;

  while (searchIndex < text.length) {
    const matchIndex = text.indexOf(delimiter, searchIndex);

    if (matchIndex === -1) {
      return -1;
    }

    if (!isEscaped(text, matchIndex)) {
      return matchIndex;
    }

    searchIndex = matchIndex + delimiter.length;
  }

  return -1;
}

function isEscaped(text: string, index: number): boolean {
  let slashCount = 0;
  let cursor = index - 1;

  while (cursor >= 0 && text[cursor] === '\\') {
    slashCount += 1;
    cursor -= 1;
  }

  return slashCount % 2 === 1;
}

function countConsecutive(text: string, startIndex: number, char: string): number {
  let count = 0;
  let cursor = startIndex;

  while (cursor < text.length && text[cursor] === char) {
    count += 1;
    cursor += 1;
  }

  return count;
}

function isLikelyMathContent(content: string): boolean {
  return /\\[a-zA-Z]+|[=_^]|[+\-*/]/.test(content);
}

function normalizeFrontmatter(data: Record<string, unknown>): FrontmatterEntry[] {
  return Object.entries(data)
    .map(([key, value]) => ({
      key,
      label: humanizeFrontmatterKey(key),
      values: normalizeFrontmatterValue(value),
    }))
    .filter((entry) => entry.values.length > 0);
}

function normalizeFrontmatterValue(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeFrontmatterValue(item));
  }

  if (value instanceof Date) {
    return [value.toISOString().slice(0, 10)];
  }

  if (typeof value === 'object') {
    return [JSON.stringify(value)];
  }

  return [String(value)];
}

function parseInternalHref(href?: string): InternalLink | null {
  if (!href) return null;

  let pathname = '';

  try {
    pathname = new URL(href, 'http://atlantis.local').pathname;
  } catch {
    return null;
  }

  const noteMatch = pathname.match(/^\/notes\/([a-zA-Z0-9_-]+)\/?$/);
  if (noteMatch) {
    return { type: 'note', id: noteMatch[1] };
  }

  const diagramMatch = pathname.match(/^\/diagram\/([a-zA-Z0-9_-]+)\/?$/);
  if (diagramMatch) {
    return { type: 'diagram', id: diagramMatch[1] };
  }

  return null;
}

function omitMarkdownNode<T extends MarkdownExtraProps>(props: T): Omit<T, 'node'> {
  const { node, ...rest } = props;
  void node;
  return rest;
}

function humanizeFrontmatterKey(key: string): string {
  return key
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildWindowTitle(name?: string): string {
  return (
    (name || 'document')
      .trim()
      .replace(/[^a-zA-Z0-9_\-. ]+/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 80) || 'document'
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const markdownCss = `
.markdown-body {
  color: var(--foreground);
  font-size: 0.9375rem;
  line-height: 1.7;
}

.markdown-body > :first-child,
.markdown-body .markdown-frontmatter + :first-child {
  margin-top: 0;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  color: var(--foreground);
  font-weight: 650;
  line-height: 1.25;
  margin: 1.5em 0 0.55em;
}

.markdown-body h1 {
  border-bottom: 1px solid var(--border);
  font-size: 1.75rem;
  padding-bottom: 0.45rem;
}

.markdown-body h2 {
  border-bottom: 1px solid var(--border);
  font-size: 1.35rem;
  padding-bottom: 0.35rem;
}

.markdown-body h3 {
  font-size: 1.15rem;
}

.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  font-size: 1rem;
}

.markdown-body p,
.markdown-body blockquote,
.markdown-body ul,
.markdown-body ol,
.markdown-body table,
.markdown-body pre,
.markdown-body .markdown-code-block {
  margin: 0.85rem 0;
}

.markdown-body details {
  background: color-mix(in oklch, var(--muted) 85%, transparent);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  margin: 0.85rem 0;
  padding: 0.65rem 0.8rem;
}

.markdown-body summary {
  cursor: pointer;
  font-weight: 600;
  user-select: none;
}

.markdown-body details > :not(summary) {
  margin-top: 0.6rem;
}

.markdown-body a {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 0.16em;
}

.markdown-body a:hover {
  text-decoration: none;
}

.markdown-body ul,
.markdown-body ol {
  padding-left: 1.5rem;
}

.markdown-body li + li {
  margin-top: 0.25rem;
}

.markdown-body li.task-list-item {
  list-style: none;
  margin-left: -1.3rem;
}

.markdown-body input[type='checkbox'] {
  accent-color: var(--primary);
  margin-right: 0.45rem;
  transform: translateY(0.1rem);
}

.markdown-body blockquote {
  border-left: 3px solid var(--border);
  color: var(--muted-foreground);
  padding-left: 1rem;
}

.markdown-body table {
  border-collapse: collapse;
  display: block;
  max-width: 100%;
  overflow-x: auto;
}

.markdown-body th,
.markdown-body td {
  border: 1px solid var(--border);
  padding: 0.45rem 0.65rem;
  vertical-align: top;
}

.markdown-body th {
  background: var(--muted);
  font-weight: 600;
}

.markdown-body hr {
  border: 0;
  border-top: 1px solid var(--border);
  margin: 1.6rem 0;
}

.markdown-body img {
  border-radius: 0.375rem;
  height: auto;
  max-width: 100%;
}

.markdown-body code {
  background: var(--muted);
  border-radius: 0.25rem;
  font-family: var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.88em;
  padding: 0.12rem 0.32rem;
}

.markdown-body pre {
  background: var(--muted);
  border-radius: 0.5rem;
  overflow-x: auto;
  padding: 0.9rem;
}

.markdown-body pre code,
.markdown-body .markdown-code-block code {
  background: transparent;
  border-radius: 0;
  display: block;
  padding: 0;
  white-space: pre;
}

.markdown-body .markdown-code-block {
  position: relative;
}

.markdown-body .markdown-code-block > span {
  color: var(--muted-foreground);
  font-size: 0.75rem;
  font-weight: 600;
  left: 0.75rem;
  position: absolute;
  text-transform: uppercase;
  top: 0.55rem;
}

.markdown-body .markdown-code-block > span + button + pre {
  padding-top: 1.9rem;
}

.markdown-body .markdown-code-block button {
  align-items: center;
  background: color-mix(in oklch, var(--foreground) 8%, transparent);
  border-radius: 0.35rem;
  display: flex;
  height: 1.75rem;
  justify-content: center;
  opacity: 0;
  position: absolute;
  right: 0.5rem;
  top: 0.5rem;
  transition: opacity 120ms ease, background-color 120ms ease;
  width: 1.75rem;
}

.markdown-body .markdown-code-block:hover button,
.markdown-body .markdown-code-block button:focus-visible {
  opacity: 1;
}

.markdown-body .markdown-code-block button:hover {
  background: color-mix(in oklch, var(--foreground) 14%, transparent);
}

.markdown-body mark {
  background: #fef08a;
  border-radius: 0.2rem;
  padding: 0 0.15rem;
}

.dark .markdown-body mark {
  background: #713f12;
}

.markdown-body .footnotes {
  border-top: 1px solid var(--border);
  color: var(--muted-foreground);
  font-size: 0.875rem;
  margin-top: 2rem;
  padding-top: 1rem;
}

.markdown-frontmatter {
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  display: grid;
  gap: 0.6rem;
  margin: 0 0 1.25rem;
  padding: 0.9rem 1rem;
}

.markdown-frontmatter div {
  display: grid;
  gap: 0.15rem;
}

.markdown-frontmatter dt {
  color: var(--muted-foreground);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.markdown-frontmatter dd {
  margin: 0;
}

.markdown-frontmatter-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.markdown-frontmatter-list span {
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 0.35rem;
  font-size: 0.8rem;
  padding: 0.05rem 0.45rem;
}
`;
