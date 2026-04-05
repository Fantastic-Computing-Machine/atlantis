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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
import { StreamLanguage } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { Copy, Settings2, WrapText, Search, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { toast } from 'sonner';
import { NoteSearchReplace } from './NoteSearchReplace';
import { NoteMarkdownPreview } from './NoteMarkdownPreview';
import dynamic from 'next/dynamic';
import { TodoList } from './TodoList';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';

const NoteLatexPreview = dynamic(
  () => import('./NoteLatexPreview').then((mod) => mod.NoteLatexPreview),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground flex h-full items-center justify-center">
        Loading previewer...
      </div>
    ),
  }
);

interface NoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  isPrivate: boolean;
  onTogglePrivate: () => void;
  previewFilename?: string;
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
  latex: () => StreamLanguage.define(stex),
  tex: () => StreamLanguage.define(stex),
};

export function NoteEditor({
  value,
  onChange,
  language,
  isPrivate,
  onTogglePrivate,
  previewFilename,
}: NoteEditorProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showIndentGuides, setShowIndentGuides] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [hideLatexPreview, setHideLatexPreview] = useState(false);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const isScrollingSyncRef = useRef(false); // Prevent recursive scroll updates

  const isMarkdown = language === 'markdown' || language === 'md';
  const isLatex = language === 'latex' || language === 'tex';
  const effectiveShowPreview = isLatex ? !hideLatexPreview : showPreview;

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

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

  const togglePreview = useCallback(() => {
    if (isLatex) {
      setHideLatexPreview((prev) => !prev);
      return;
    }
    setShowPreview((prev) => !prev);
  }, [isLatex]);

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
    <div className="bg-background flex h-full w-full flex-col overflow-hidden">
      {/* Editor Toolbar */}
      <div className="bg-muted/30 flex h-10 shrink-0 items-center justify-between border-b px-3">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {language || 'txt'}
        </span>
        <div className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showSearch ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7 shrink-0"
                aria-label="Search and replace"
                onClick={toggleSearch}
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search & Replace (Ctrl+F)</TooltipContent>
          </Tooltip>

          {(isMarkdown || isLatex) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={effectiveShowPreview ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label={effectiveShowPreview ? 'Hide preview' : 'Show preview'}
                  onClick={togglePreview}
                >
                  {effectiveShowPreview ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {effectiveShowPreview ? 'Hide preview' : 'Show preview'}
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isPrivate ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7 shrink-0"
                aria-label={isPrivate ? 'Make public' : 'Make private'}
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
                className="h-7 w-7 shrink-0"
                aria-label="Copy code"
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
                className="h-7 w-7 shrink-0"
                aria-label={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
                onClick={() => setWordWrap(!wordWrap)}
              >
                <WrapText className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{wordWrap ? 'Disable word wrap' : 'Enable word wrap'}</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    aria-label="Editor settings"
                  >
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
              <DropdownMenuCheckboxItem checked={wordWrap} onCheckedChange={setWordWrap}>
                Word wrap
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search & Replace Panel */}
      {showSearch && (
        <NoteSearchReplace editorView={editorView} onClose={() => setShowSearch(false)} />
      )}

      {/* Code Editor + Optional Preview */}
      {(isMarkdown || isLatex) && effectiveShowPreview ? (
        <PanelGroup orientation="horizontal" className="flex min-h-0 flex-1 overflow-hidden">
          <Panel defaultSize={55} minSize={25} className="min-h-0">
            <div className="h-full">
              <CodeMirror
                value={value}
                height="100%"
                theme={editorTheme}
                onChange={onChange}
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
                onUpdate={(update) => {
                  if (update.docChanged || update.geometryChanged) {
                    // Only update if we didn't trigger this scroll from preview
                    if (isScrollingSyncRef.current) return;
                    const scroller = update.view.scrollDOM;
                    const maxScroll = scroller.scrollHeight - scroller.clientHeight;
                    if (maxScroll > 0) {
                      setScrollPercentage(scroller.scrollTop / maxScroll);
                    } else {
                      setScrollPercentage(0);
                    }
                  }
                }}
              />
            </div>
          </Panel>
          <PanelResizeHandle className="bg-border/60 hover:bg-border data-[separator-highlighted]:bg-border data-[separator-dragged]:bg-foreground/30 w-2 cursor-col-resize transition-colors" />
          <Panel defaultSize={45} minSize={20} className="min-h-0 border-l">
            <div className="h-full overflow-hidden">
              {isMarkdown ? (
                <NoteMarkdownPreview
                  content={value}
                  filename={previewFilename}
                  editorScrollPercentage={scrollPercentage}
                  onScroll={(p) => {
                    if (editorView) {
                      isScrollingSyncRef.current = true;
                      const scroller = editorView.scrollDOM;
                      const maxScroll = scroller.scrollHeight - scroller.clientHeight;
                      if (maxScroll > 0) {
                        scroller.scrollTo({ top: maxScroll * p });
                      }
                      // Reset flag after a short delay
                      requestAnimationFrame(() => {
                        isScrollingSyncRef.current = false;
                      });
                    }
                  }}
                />
              ) : (
                <NoteLatexPreview
                  content={value}
                  editorScrollPercentage={scrollPercentage}
                  filename={previewFilename}
                  onScroll={(p) => {
                    if (editorView) {
                      isScrollingSyncRef.current = true;
                      const scroller = editorView.scrollDOM;
                      const maxScroll = scroller.scrollHeight - scroller.clientHeight;
                      if (maxScroll > 0) {
                        scroller.scrollTo({ top: maxScroll * p });
                      }
                      // Reset flag after a short delay
                      requestAnimationFrame(() => {
                        isScrollingSyncRef.current = false;
                      });
                    }
                  }}
                />
              )}
            </div>
          </Panel>
        </PanelGroup>
      ) : (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="h-full w-full">
            {language === 'todo' ? (
              <TodoList value={value} onChange={onChange} />
            ) : (
              <CodeMirror
                value={value}
                height="100%"
                theme={editorTheme}
                onChange={onChange}
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
                onUpdate={(update) => {
                  if (update.docChanged || update.geometryChanged) {
                    const scroller = update.view.scrollDOM;
                    const maxScroll = scroller.scrollHeight - scroller.clientHeight;
                    if (maxScroll > 0) {
                      setScrollPercentage(scroller.scrollTop / maxScroll);
                    } else {
                      setScrollPercentage(0);
                    }
                  }
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
