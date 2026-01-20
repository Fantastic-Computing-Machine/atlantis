import { getNoteById } from '@/lib/notes-data';
import { NoteWorkspace } from '@/components/notes/NoteWorkspace';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface NotePageProps {
    params: Promise<{ id: string }>;
}

export default async function NotePage({ params }: NotePageProps) {
    const { id } = await params;
    const note = await getNoteById(id);

    if (!note) {
        notFound();
    }

    return <NoteWorkspace initialNote={note} />;
}
