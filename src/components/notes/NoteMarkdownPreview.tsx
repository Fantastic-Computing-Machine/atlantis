'use client';

import { useMemo } from 'react';

interface NoteMarkdownPreviewProps {
    content: string;
}

// Simple markdown to HTML converter for preview
function parseMarkdown(text: string): string {
    let html = text
        // Escape HTML
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Headers
        .replace(/^#{6}\s+(.*)$/gm, '<h6 class="text-sm font-semibold mt-4 mb-2">$1</h6>')
        .replace(/^#{5}\s+(.*)$/gm, '<h5 class="text-sm font-semibold mt-4 mb-2">$1</h5>')
        .replace(/^#{4}\s+(.*)$/gm, '<h4 class="text-base font-semibold mt-4 mb-2">$1</h4>')
        .replace(/^#{3}\s+(.*)$/gm, '<h3 class="text-lg font-semibold mt-5 mb-2">$1</h3>')
        .replace(/^#{2}\s+(.*)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-3 border-b pb-2">$1</h2>')
        .replace(/^#{1}\s+(.*)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4 border-b pb-2">$1</h1>')
        // Bold and italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        .replace(/_(.+?)_/g, '<em>$1</em>')
        // Strikethrough
        .replace(/~~(.+?)~~/g, '<del>$1</del>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
        // Code blocks
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-muted p-4 rounded-lg overflow-x-auto my-4"><code class="text-sm font-mono">$2</code></pre>')
        // Blockquotes
        .replace(/^>\s+(.*)$/gm, '<blockquote class="border-l-4 border-primary/50 pl-4 italic text-muted-foreground my-2">$1</blockquote>')
        // Horizontal rules
        .replace(/^---$/gm, '<hr class="my-6 border-border" />')
        .replace(/^\*\*\*$/gm, '<hr class="my-6 border-border" />')
        // Unordered lists
        .replace(/^[\*\-]\s+(.*)$/gm, '<li class="ml-4">$1</li>')
        // Ordered lists
        .replace(/^\d+\.\s+(.*)$/gm, '<li class="ml-4 list-decimal">$1</li>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:no-underline" target="_blank" rel="noopener">$1</a>')
        // Images
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded my-4" />')
        // Line breaks
        .replace(/\n\n/g, '</p><p class="my-3">')
        .replace(/\n/g, '<br />');

    // Wrap in paragraph
    html = '<p class="my-3">' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p class="my-3"><\/p>/g, '');

    return html;
}

export function NoteMarkdownPreview({ content }: NoteMarkdownPreviewProps) {
    const html = useMemo(() => parseMarkdown(content), [content]);

    return (
        <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
    );
}
