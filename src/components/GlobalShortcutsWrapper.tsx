'use client';

import type { ReactNode } from 'react';
import { GlobalShortcutsProvider } from '@/lib/use-keyboard-shortcuts';
import { ShortcutPaletteDialog } from '@/components/ShortcutPaletteDialog';

type GlobalShortcutsWrapperProps = {
  children: ReactNode;
};

export function GlobalShortcutsWrapper({ children }: GlobalShortcutsWrapperProps) {
  return (
    <GlobalShortcutsProvider>
      {children}
      <ShortcutPaletteDialog />
    </GlobalShortcutsProvider>
  );
}
