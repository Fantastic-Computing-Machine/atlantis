import { DiagramGrid } from '@/components/DiagramGrid';
import { getDiagrams } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const diagrams = await getDiagrams();
  const enableApiAccess = process.env.ENABLE_API_ACCESS === 'true';
  return <DiagramGrid initialDiagrams={diagrams} enableApiAccess={enableApiAccess} />;
}
