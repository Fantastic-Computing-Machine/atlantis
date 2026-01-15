import { DiagramEditor } from '@/components/DiagramEditor';
import { getDiagrams } from '@/lib/data';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DiagramPage({ params }: PageProps) {
  const { id } = await params;
  const diagrams = await getDiagrams();
  const diagram = diagrams.find((d) => d.id === id);

  if (!diagram) {
    notFound();
  }

  return <DiagramEditor initialDiagram={diagram} allDiagrams={diagrams} />;
}
