import { DiagramGrid } from '@/components/DiagramGrid';
import { getDiagrams } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const diagrams = await getDiagrams();
  return <DiagramGrid initialDiagrams={diagrams} />;
}
