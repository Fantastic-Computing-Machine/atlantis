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
import { indentationMarkers } from '@replit/codemirror-indentation-markers';
import { EditorView } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import { Copy, Settings2, WrapText } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function Editor({ value, onChange }: EditorProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showIndentGuides, setShowIndentGuides] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = useCallback((val: string) => {
    onChange(val);
  }, [onChange]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard');
  }, [value]);

  const extensions = useMemo(() => {
    const exts = [];
    if (wordWrap) {
      exts.push(EditorView.lineWrapping);
    }
    if (showIndentGuides) {
      exts.push(indentationMarkers());
    }
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

      {/* Code Editor */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <CodeMirror
          value={value}
          height="100%"
          theme={mounted && resolvedTheme === 'dark' ? 'dark' : 'light'}
          onChange={handleChange}
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
      </div>
    </div>
  );
}
