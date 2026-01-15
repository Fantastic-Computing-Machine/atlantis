import { DiagramGrid } from '@/components/DiagramGrid';
import { getDiagrams } from '@/lib/data';

export const revalidate = 30;

export default async function Page() {
  const diagrams = await getDiagrams();
  return <DiagramGrid initialDiagrams={diagrams} />;
}
