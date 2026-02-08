'use client';

import { AiChatPanel } from '@/components/AiChatPanel';
import { GeminiSpark } from '@/components/icons/GeminiSpark';
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
import { EditorState, StateEffect, StateField, Transaction } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
import { Decoration, EditorView, keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { indentUnit } from '@codemirror/language';
import { indentationMarkers } from '@replit/codemirror-indentation-markers';
import CodeMirror from '@uiw/react-codemirror';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import { mermaid } from 'codemirror-lang-mermaid';
import { Copy, Settings2, WrapText } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  selectionRange?: { from: number; to: number } | null;
  onCursorLineChange?: (line: string) => void;
  onToggleAiChat?: () => void;
  aiEnabled?: boolean;
  hasAiKey?: boolean;
  aiChatOpen?: boolean;
  onApplyAiContent?: (content: string) => void;
  diagramId?: string;
}

const setHighlightedLine = StateEffect.define<{ from: number; to: number } | null>();
const highlightLineField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    let next = decorations.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setHighlightedLine)) {
        const range = effect.value;
        if (!range) {
          next = Decoration.none;
          break;
        }
        const line = tr.state.doc.lineAt(Math.max(0, Math.min(range.from, tr.state.doc.length)));
        next = Decoration.set([
          Decoration.line({ class: 'cm-highlight-line' }).range(line.from)
        ]);
        break;
      }
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

const insertNewlineAndIndent = ({ state, dispatch }: { state: EditorState; dispatch: (tr: Transaction) => void }) => {
  const { from, to } = state.selection.main;
  const line = state.doc.lineAt(from);
  const indent = line.text.match(/^\s*/)?.[0] || "";

  let additionalIndent = "";
  const trimmed = line.text.trim();
  if (
    trimmed.startsWith('subgraph') ||
    trimmed.startsWith('class ') ||
    trimmed.endsWith('{') ||
    trimmed.endsWith('[') ||
    trimmed.endsWith('(')
  ) {
    additionalIndent = state.facet(indentUnit);
  }

  const transaction = state.update({
    changes: { from, to, insert: "\n" + indent + additionalIndent },
    selection: { anchor: from + 1 + indent.length + additionalIndent.length },
    scrollIntoView: true,
  });
  dispatch(transaction);
  return true;
};

export function Editor({
  value,
  onChange,
  selectionRange,
  onCursorLineChange,
  onToggleAiChat,
  aiEnabled,
  hasAiKey,
  aiChatOpen,
  onApplyAiContent,
  diagramId,
}: EditorProps) {
  const { resolvedTheme } = useTheme();
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showIndentGuides, setShowIndentGuides] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const editorViewRef = useRef<EditorView | null>(null);

  const handleChange = useCallback((val: string) => {
    onChange(val);
  }, [onChange]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard');
  }, [value]);

  const handleCreateEditor = useCallback((view: EditorView) => {
    editorViewRef.current = view;
  }, []);

  useEffect(() => {
    if (!editorViewRef.current) return;
    const view = editorViewRef.current;
    if (!selectionRange) {
      view.dispatch({ effects: setHighlightedLine.of(null) });
      return;
    }
    const docLength = view.state.doc.length;
    const from = Math.max(0, Math.min(selectionRange.from, docLength));
    const to = Math.max(from, Math.min(selectionRange.to, docLength));
    view.dispatch({ effects: setHighlightedLine.of({ from, to }) });
  }, [selectionRange]);

  const handleUpdate = useCallback((update: ViewUpdate) => {
    if (!onCursorLineChange) return;
    if (!update.selectionSet) return;
    const line = update.state.doc.lineAt(update.state.selection.main.head).text;
    onCursorLineChange(line);
  }, [onCursorLineChange]);

  const extensions = useMemo(() => {
    const exts: Extension[] = [highlightLineField, mermaid()];
    if (wordWrap) {
      exts.push(EditorView.lineWrapping);
    }
    if (showIndentGuides) {
      exts.push(indentationMarkers());
    }
    exts.push(keymap.of([
      { key: "Enter", run: insertNewlineAndIndent },
      indentWithTab
    ]));
    return exts;
  }, [wordWrap, showIndentGuides]);

  return (
    <div className="h-full w-full overflow-hidden bg-background flex flex-col">
      {/* Editor Toolbar */}
      <div className="h-10 border-b flex items-center justify-between px-3 bg-muted/30 shrink-0">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Mermaid
        </span>
        <div className="flex items-center gap-1">

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={aiEnabled ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  if (!hasAiKey) {
                    toast.info('Add an AI key in settings to enable the assistant');
                  }
                  onToggleAiChat?.();
                }}
              >
                <GeminiSpark className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {aiEnabled ? 'Hide AI chat' : 'AI helper'}
            </TooltipContent>
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

      {/* Code Editor + AI Panel */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0">
          <CodeMirror
            value={value}
            height="100%"
            theme={resolvedTheme === 'dark' ? githubDark : githubLight}
            onChange={handleChange}
            onCreateEditor={handleCreateEditor}
            onUpdate={handleUpdate}
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
              autocompletion: true,
              highlightSelectionMatches: true,
              defaultKeymap: true,
              historyKeymap: true,
              lintKeymap: true,
            }}
          />
        </div>
        {aiChatOpen && onApplyAiContent && diagramId && (
          <AiChatPanel
            diagramId={diagramId}
            currentContent={value}
            onApply={onApplyAiContent}
          />
        )}
      </div>
    </div>
  );
}
