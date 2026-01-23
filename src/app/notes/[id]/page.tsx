import { getNoteById } from '@/lib/notes-data';
import { NoteWorkspace } from '@/components/notes/NoteWorkspace';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface NotePageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: NotePageProps) {
    const { id } = await params;
    const note = await getNoteById(id);
    if (!note) {
        return {
            title: 'Note Not Found // Atlantis',
        };
    }
    const description = note.private ? `[Pvt] ${note.title}` : note.title;
    return {
        title: 'atlantis // notes',
        description,
        openGraph: {
            title: 'atlantis // notes',
            description,
        },
        twitter: {
            title: 'atlantis // notes',
            description,
        },
    };
}

export default async function NotePage({ params }: NotePageProps) {
    const { id } = await params;
    const note = await getNoteById(id);

    if (!note) {
        notFound();
    }

    return <NoteWorkspace initialNote={note} />;
}
