
import { DiagramEditor } from '@/components/DiagramEditor';
import { getDiagramById } from '@/lib/data';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps) {
    const { id } = await params;
    const diagram = await getDiagramById(id);
    if (!diagram) {
        return {
            title: 'Diagram Not Found // Atlantis',
        };
    }
    return {
        title: 'atlantis // diagram',
        description: diagram.title,
        openGraph: {
            title: 'atlantis // diagram',
            description: diagram.title,
        },
        twitter: {
            title: 'atlantis // diagram',
            description: diagram.title,
        },
    };
}

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function DiagramPage({ params }: PageProps) {
    const { id } = await params;
    const diagram = await getDiagramById(id);

    if (!diagram) {
        notFound();
    }

    return <DiagramEditor initialDiagram={diagram} />;
}
