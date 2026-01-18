import { DiagramEditor } from '@/components/DiagramEditor';
import { getDiagramById } from '@/lib/data';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

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
