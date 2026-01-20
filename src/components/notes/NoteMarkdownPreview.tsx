'use client';

import { useMemo } from 'react';

interface NoteMarkdownPreviewProps {
    content: string;
}

// Parse markdown to HTML with proper code block handling
function parseMarkdown(text: string): string {
    // Use markers that won't be affected by HTML escaping
    const codeBlockMarker = '\u0000CB';
    const inlineCodeMarker = '\u0000IC';

    // First, extract and protect code blocks
    const codeBlocks: string[] = [];
    let processed = text;

    // Extract fenced code blocks (```)
    processed = processed.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, _lang, code) => {
        const escaped = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const index = codeBlocks.length;
        codeBlocks.push(
            `<pre class="bg-muted p-4 rounded-lg overflow-x-auto my-4"><code class="text-sm font-mono block whitespace-pre">${escaped}</code></pre>`
        );
        return `${codeBlockMarker}${index}${codeBlockMarker}`;
    });

    // Extract inline code (`)
    const inlineCodes: string[] = [];
    processed = processed.replace(/`([^`\n]+)`/g, (_match, code) => {
        const escaped = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const index = inlineCodes.length;
        inlineCodes.push(
            `<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">${escaped}</code>`
        );
        return `${inlineCodeMarker}${index}${inlineCodeMarker}`;
    });

    // Now escape remaining HTML
    processed = processed
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Headers (process from h6 to h1 to avoid conflicts)
    processed = processed
        .replace(/^######\s+(.*)$/gm, '<h6 class="text-sm font-semibold mt-4 mb-2">$1</h6>')
        .replace(/^#####\s+(.*)$/gm, '<h5 class="text-sm font-semibold mt-4 mb-2">$1</h5>')
        .replace(/^####\s+(.*)$/gm, '<h4 class="text-base font-semibold mt-4 mb-2">$1</h4>')
        .replace(/^###\s+(.*)$/gm, '<h3 class="text-lg font-semibold mt-5 mb-2">$1</h3>')
        .replace(/^##\s+(.*)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-3 border-b pb-2">$1</h2>')
        .replace(/^#\s+(.*)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4 border-b pb-2">$1</h1>');

    // Bold and italic
    processed = processed
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^\s*][^*]*[^\s*])\*/g, '<em>$1</em>')
        .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        .replace(/_([^\s_][^_]*[^\s_])_/g, '<em>$1</em>');

    // Strikethrough
    processed = processed.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Blockquotes (> becomes &gt; after escaping)
    processed = processed.replace(
        /^&gt;\s+(.*)$/gm,
        '<blockquote class="border-l-4 border-primary/50 pl-4 italic text-muted-foreground my-2">$1</blockquote>'
    );

    // Horizontal rules
    processed = processed
        .replace(/^---$/gm, '<hr class="my-6 border-border" />')
        .replace(/^\*\*\*$/gm, '<hr class="my-6 border-border" />');

    // Lists
    processed = processed
        .replace(/^[\*\-]\s+(.*)$/gm, '<li class="ml-6 list-disc">$1</li>')
        .replace(/^\d+\.\s+(.*)$/gm, '<li class="ml-6 list-decimal">$1</li>');

    // Links
    processed = processed.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="text-primary underline hover:no-underline" target="_blank" rel="noopener">$1</a>'
    );

    // Images
    processed = processed.replace(
        /!\[([^\]]*)\]\(([^)]+)\)/g,
        '<img src="$2" alt="$1" class="max-w-full rounded my-4" />'
    );

    // Paragraphs - split by double newlines
    const blocks = processed.split(/\n\n+/);
    processed = blocks
        .map((block) => {
            const trimmed = block.trim();
            if (!trimmed) return '';
            // Don't wrap block elements or code block placeholders
            if (
                trimmed.startsWith('<h') ||
                trimmed.startsWith('<ul') ||
                trimmed.startsWith('<ol') ||
                trimmed.startsWith('<li') ||
                trimmed.startsWith('<blockquote') ||
                trimmed.startsWith('<hr') ||
                trimmed.startsWith('<pre') ||
                trimmed.startsWith(codeBlockMarker)
            ) {
                return trimmed;
            }
            // Wrap in paragraph
            return `<p class="my-3">${trimmed.replace(/\n/g, '<br />')}</p>`;
        })
        .join('\n');

    // Restore code blocks
    for (let i = 0; i < codeBlocks.length; i++) {
        processed = processed.split(`${codeBlockMarker}${i}${codeBlockMarker}`).join(codeBlocks[i]);
    }

    // Restore inline code
    for (let i = 0; i < inlineCodes.length; i++) {
        processed = processed.split(`${inlineCodeMarker}${i}${inlineCodeMarker}`).join(inlineCodes[i]);
    }

    return processed;
}

export function NoteMarkdownPreview({ content }: NoteMarkdownPreviewProps) {
    const html = useMemo(() => parseMarkdown(content), [content]);

    return (
        <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
    );
}

