'use client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useDiagramStore } from '@/lib/store';
import Link from 'next/link';
import { useEffect } from 'react';
import { Settings2, Keyboard, BookOpen, Github } from 'lucide-react';
import { GlobalSearchDialog } from '@/components/GlobalSearchDialog';
import { useShortcutPlatform } from '@/lib/use-platform';
import { useKeyboardShortcuts } from '@/lib/use-keyboard-shortcuts';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu } from 'lucide-react';

interface DashboardHeaderProps {
  enableApiAccess?: boolean;
}

export function DashboardHeader({ enableApiAccess }: DashboardHeaderProps) {
  const { settings, setHasAiApiKey, setAiProvider } = useDiagramStore();
  const { isMac } = useShortcutPlatform();
  const { setPaletteOpen } = useKeyboardShortcuts();

  // Load AI key status on mount
  useEffect(() => {
    const loadAiKey = async () => {
      try {
        const res = await fetch('/api/settings/ai-key');
        const data = await res.json();
        if (typeof data.hasKey === 'boolean') {
          setHasAiApiKey(data.hasKey);
        }
        if (typeof data.provider === 'string') {
          setAiProvider(data.provider);
        }
      } catch {
        // ignore
      }
    };
    loadAiKey();
  }, [setHasAiApiKey, setAiProvider]);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm shrink-0">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <span className="text-2xl" role="img" aria-label="atlantis logo">
            🔱
          </span>
          <h1 className="text-xl font-bold hidden sm:block">atlantis</h1>
        </Link>

        <div className="flex max-w-md flex-1 justify-center">
          <GlobalSearchDialog />
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setPaletteOpen(true)}
                aria-label="Keyboard shortcuts"
              >
                <Keyboard className="text-muted-foreground h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="flex items-center gap-1.5">
                Shortcuts
                <kbd className="border-border bg-background text-foreground ml-1 inline-flex h-5 items-center gap-0.5 rounded border px-1.5 font-mono text-[10px] font-medium select-none">
                  {isMac ? '⌘' : 'Ctrl+Shift'}+p
                </kbd>
              </p>
            </TooltipContent>
          </Tooltip>

          <div className="hidden items-center gap-2 lg:flex">
            <Button asChild variant="ghost">
              <Link href="/diagram">Diagrams</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/notes">Notes</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/tags">Tags</Link>
            </Button>
            {enableApiAccess && (
              <Button asChild variant="ghost">
                <Link href="/docs" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>

          <div className="lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/diagram">Diagrams</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/notes">Notes</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/tags">Tags</Link>
                </DropdownMenuItem>
                {enableApiAccess && (
                  <DropdownMenuItem asChild>
                    <Link href="/docs">Docs</Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button variant="outline" size="icon" asChild className="hidden sm:flex">
            <a
              href="https://github.com/Fantastic-Computing-Machine/atlantis"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Repository"
            >
              <Github className="h-4 w-4" />
            </a>
          </Button>

          <Button variant="outline" className="h-9 gap-2 px-2 sm:px-3" asChild>
            <Link href="/settings">
              <Settings2 className="h-4 w-4" />
              <span className="hidden font-semibold sm:inline">Settings</span>
              <span className="text-muted-foreground ml-1 hidden lg:inline">
                {settings.autoSave ? 'Auto-save On' : 'Auto-save Off'}
              </span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
