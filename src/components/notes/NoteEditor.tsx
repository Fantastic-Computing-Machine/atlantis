'use client';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { indentationMarkers } from '@replit/codemirror-indentation-markers';
import CodeMirror from '@uiw/react-codemirror';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { Copy, Settings2, WrapText, Search, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { NoteSearchReplace } from './NoteSearchReplace';
import { NoteMarkdownPreview } from './NoteMarkdownPreview';
import { TodoList } from './TodoList';

interface NoteEditorProps {
    value: string;
    onChange: (value: string) => void;
    language: string;
    isPrivate: boolean;
    onTogglePrivate: () => void;
}

const LANGUAGE_EXTENSIONS: Record<string, () => Extension> = {
    javascript: javascript,
    js: javascript,
    typescript: () => javascript({ typescript: true }),
    ts: () => javascript({ typescript: true }),
    python: python,
    py: python,
    html: html,
    css: css,
    json: json,
    markdown: markdown,
    md: markdown,
};

export function NoteEditor({
    value,
    onChange,
    language,
    isPrivate,
    onTogglePrivate,
}: NoteEditorProps) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [showLineNumbers, setShowLineNumbers] = useState(true);
    const [showIndentGuides, setShowIndentGuides] = useState(true);
    const [wordWrap, setWordWrap] = useState(true);
    const [showSearch, setShowSearch] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [editorView, setEditorView] = useState<EditorView | null>(null);

    const isMarkdown = language === 'markdown' || language === 'md';

    useEffect(() => {
        setTimeout(() => setMounted(true), 0);
    }, []);

    const handleChange = useCallback((val: string) => {
        onChange(val);
    }, [onChange]);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(value);
        toast.success('Copied to clipboard');
    }, [value]);

    const handleCreateEditor = useCallback((view: EditorView) => {
        setEditorView(view);
    }, []);

    const toggleSearch = useCallback(() => {
        setShowSearch((prev) => !prev);
    }, []);

    const extensions = useMemo(() => {
        const exts: Extension[] = [];

        // Open search with Ctrl+F / Cmd+F
        exts.push(
            keymap.of([
                {
                    key: 'Mod-f',
                    run: () => {
                        setShowSearch(true);
                        return true;
                    },
                },
            ])
        );

        if (wordWrap) {
            exts.push(EditorView.lineWrapping);
        }
        if (showIndentGuides) {
            exts.push(indentationMarkers());
        }

        // Language-specific extension
        const langExt = LANGUAGE_EXTENSIONS[language.toLowerCase()];
        if (langExt) {
            exts.push(langExt());
        }

        return exts;
    }, [wordWrap, showIndentGuides, language]);

    const editorTheme = mounted && resolvedTheme === 'dark' ? githubDark : githubLight;

    return (
        <div className="h-full w-full overflow-hidden bg-background flex flex-col">
            {/* Editor Toolbar */}
            <div className="h-10 border-b flex items-center justify-between px-3 bg-muted/30 shrink-0">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {language || 'txt'}
                </span>
                <div className="flex items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={showSearch ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-7 w-7"
                                onClick={toggleSearch}
                            >
                                <Search className="h-3.5 w-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Search & Replace (Ctrl+F)</TooltipContent>
                    </Tooltip>

                    {isMarkdown && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={showPreview ? 'secondary' : 'ghost'}
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setShowPreview(!showPreview)}
                                >
                                    {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{showPreview ? 'Hide preview' : 'Show preview'}</TooltipContent>
                        </Tooltip>
                    )}

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={isPrivate ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-7 w-7"
                                onClick={onTogglePrivate}
                            >
                                {isPrivate ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{isPrivate ? 'Private (API hidden)' : 'Public'}</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={handleCopy}
                            >
                                <Copy className="h-3.5 w-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy code</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={wordWrap ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setWordWrap(!wordWrap)}
                            >
                                <WrapText className="h-3.5 w-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
                        </TooltipContent>
                    </Tooltip>

                    <DropdownMenu>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <Settings2 className="h-3.5 w-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Editor settings</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Display</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={showLineNumbers}
                                onCheckedChange={setShowLineNumbers}
                            >
                                Line numbers
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={showIndentGuides}
                                onCheckedChange={setShowIndentGuides}
                            >
                                Indentation guides
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={wordWrap}
                                onCheckedChange={setWordWrap}
                            >
                                Word wrap
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Search & Replace Panel */}
            {showSearch && (
                <NoteSearchReplace
                    editorView={editorView}
                    onClose={() => setShowSearch(false)}
                />
            )}

            {/* Code Editor + Optional Preview */}
            <div className="flex-1 min-h-0 overflow-hidden flex">
                <div className={`${isMarkdown && showPreview ? 'w-1/2' : 'w-full'} h-full`}>
                    {language === 'todo' ? (
                        <TodoList value={value} onChange={handleChange} />
                    ) : (
                        <CodeMirror
                            value={value}
                            height="100%"
                            theme={editorTheme}
                            onChange={handleChange}
                            onCreateEditor={handleCreateEditor}
                            extensions={extensions}
                            className="h-full text-sm [&_.cm-editor]:h-full [&_.cm-scroller]:!overflow-auto"
                            basicSetup={{
                                lineNumbers: showLineNumbers,
                                foldGutter: true,
                                highlightActiveLine: true,
                                highlightActiveLineGutter: true,
                                indentOnInput: true,
                                bracketMatching: true,
                                closeBrackets: true,
                                autocompletion: false,
                                highlightSelectionMatches: true,
                            }}
                        />
                    )}
                </div>
                {isMarkdown && showPreview && (
                    <div className="w-1/2 h-full border-l overflow-auto">
                        <NoteMarkdownPreview content={value} />
                    </div>
                )}
            </div>
        </div>
    );
}
