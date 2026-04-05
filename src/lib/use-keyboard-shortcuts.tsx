'use client';

import {
  useEffect,
  useCallback,
  useState,
  createContext,
  useContext,
  type ReactNode,
  useMemo,
} from 'react';
import { useRouter } from 'next/navigation';
import { useShortcutPlatform } from '@/lib/use-platform';

export type ShortcutCategory = 'navigation' | 'creation' | 'general';

export type ShortcutDefinition = {
  id: string;
  key: string;
  modifiers: ('ctrl' | 'shift' | 'alt')[];
  description: string;
  category: ShortcutCategory;
  action: () => void;
};

type ShortcutsContextValue = {
  shortcuts: ShortcutDefinition[];
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  isMac: boolean;
  getDisplayKey: (shortcut: ShortcutDefinition) => string;
};

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null);

export function useKeyboardShortcuts() {
  const ctx = useContext(ShortcutsContext);
  if (!ctx) {
    throw new Error('useKeyboardShortcuts must be used within GlobalShortcutsProvider');
  }
  return ctx;
}

type GlobalShortcutsProviderProps = {
  children: ReactNode;
};

export function GlobalShortcutsProvider({ children }: GlobalShortcutsProviderProps) {
  const router = useRouter();
  const { isMac } = useShortcutPlatform();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  const shortcuts: ShortcutDefinition[] = useMemo(
    () => [
      {
        id: 'open-palette',
        key: 'p',
        modifiers: ['ctrl', 'shift'],
        description: 'Open shortcut palette',
        category: 'general',
        action: () => setPaletteOpen(true),
      },
      {
        id: 'go-home',
        key: 'h',
        modifiers: ['alt'],
        description: 'Go to Dashboard',
        category: 'navigation',
        action: () => router.push('/'),
      },
      {
        id: 'go-settings',
        key: ',',
        modifiers: ['alt'],
        description: 'Go to Settings',
        category: 'navigation',
        action: () => router.push('/settings'),
      },
      {
        id: 'go-notes',
        key: 'l',
        modifiers: ['alt'],
        description: 'Go to Notes list',
        category: 'navigation',
        action: () => router.push('/notes'),
      },
      {
        id: 'go-diagrams',
        key: 'g',
        modifiers: ['alt'],
        description: 'Go to Diagrams list',
        category: 'navigation',
        action: () => router.push('/diagram'),
      },
      {
        id: 'go-docs',
        key: '.',
        modifiers: ['alt'],
        description: 'Go to API Docs',
        category: 'navigation',
        action: () => router.push('/docs'),
      },
      {
        id: 'new-note',
        key: 'n',
        modifiers: ['alt'],
        description: 'Create new note',
        category: 'creation',
        action: () => router.push('/notes'),
      },
      {
        id: 'new-diagram',
        key: 'd',
        modifiers: ['alt'],
        description: 'Create new diagram',
        category: 'creation',
        action: () => router.push('/diagram'),
      },
      {
        id: 'download-backup',
        key: 'b',
        modifiers: ['alt'],
        description: 'Download backup',
        category: 'general',
        action: () => {
          window.location.href = '/api/backup';
        },
      },
      {
        id: 'toggle-theme',
        key: 't',
        modifiers: ['alt'],
        description: 'Toggle theme (light/dark)',
        category: 'general',
        action: () => {
          // Toggle theme by checking current and switching
          const html = document.documentElement;
          const current = html.classList.contains('dark') ? 'dark' : 'light';
          const next = current === 'dark' ? 'light' : 'dark';
          html.classList.remove('dark', 'light');
          html.classList.add(next);
          // Also update localStorage for next-themes
          localStorage.setItem('theme', next);
        },
      },
    ],
    [router]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Detect if user is inside a CodeMirror editor
      const isInCodeMirror = target.closest('.cm-editor') !== null;

      const isCtrl = event.metaKey || event.ctrlKey;
      const isShift = event.shiftKey;
      const isAlt = event.altKey;

      for (const shortcut of shortcuts) {
        const requiresCtrl = shortcut.modifiers.includes('ctrl');
        const requiresShift = shortcut.modifiers.includes('shift');
        const requiresAlt = shortcut.modifiers.includes('alt');

        const ctrlMatch = requiresCtrl ? isCtrl : !isCtrl;
        const shiftMatch = requiresShift ? isShift : !isShift;
        const altMatch = requiresAlt ? isAlt : !isAlt;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          // Skip shortcuts inside CodeMirror that conflict with editor keybindings
          // Editor shortcuts like Ctrl+/, Ctrl+D, etc. should not be intercepted
          if (isInCodeMirror && shortcut.id !== 'open-palette') {
            return; // Let CodeMirror handle it
          }
          // Allow palette shortcut even in inputs (but CodeMirror check above still applies)
          if (shortcut.id === 'open-palette' || !isInput) {
            event.preventDefault();
            shortcut.action();
            return;
          }
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    if (!mounted) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mounted, handleKeyDown]);

  const getDisplayKey = useCallback(
    (shortcut: ShortcutDefinition): string => {
      const parts: string[] = [];

      if (shortcut.modifiers.includes('ctrl')) {
        parts.push(isMac ? '⌘' : 'Ctrl');
      }
      if (shortcut.modifiers.includes('shift')) {
        parts.push(isMac ? '⇧' : 'Shift');
      }
      if (shortcut.modifiers.includes('alt')) {
        parts.push(isMac ? '⌥' : 'Alt');
      }

      // Display key in uppercase for letters
      const displayKey = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
      parts.push(displayKey);

      return parts.join(isMac ? '' : ' + ');
    },
    [isMac]
  );

  const value: ShortcutsContextValue = {
    shortcuts,
    paletteOpen,
    setPaletteOpen,
    isMac,
    getDisplayKey,
  };

  return <ShortcutsContext.Provider value={value}>{children}</ShortcutsContext.Provider>;
}
