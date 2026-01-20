import { getNotePage } from '@/lib/notes-data';
import { NotesLayoutClient } from '@/components/notes/NotesLayoutClient';

export const dynamic = 'force-dynamic';

export default async function NotesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const page = await getNotePage({ limit: 100, offset: 0 });

    return (
        <NotesLayoutClient initialNotes={page.items}>
            {children}
        </NotesLayoutClient>
    );
}
