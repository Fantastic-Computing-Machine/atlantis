import { DiagramGrid } from '@/components/DiagramGrid';
import { getDiagramPage } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const page = await getDiagramPage({ limit: 24, offset: 0 });
  const enableApiAccess = process.env.ENABLE_API_ACCESS === 'true';
  return (
    <DiagramGrid
      initialDiagrams={page.items}
      initialHasMore={page.hasMore}
      initialNextOffset={page.nextOffset}
      initialTotal={page.total}
      enableApiAccess={enableApiAccess}
    />
  );
}
