import type { ReactNode } from 'react';

import { NotesLayoutClient } from '@/components/notes/NotesLayoutClient';
import { getNotePage } from '@/lib/notes-data';

export const dynamic = 'force-dynamic';

type NotesLayoutProps = {
  children: ReactNode;
};

export default async function NotesLayout({ children }: NotesLayoutProps) {
  const page = await getNotePage({ limit: 100, offset: 0 });

  return <NotesLayoutClient initialNotes={page.items}>{children}</NotesLayoutClient>;
}
