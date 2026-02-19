import { CanvasGrid } from '@/components/CanvasGrid';
import { getCanvasPage } from '@/lib/canvas-data';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'atlantis // Canvases',
};

export default async function Page() {
    const page = await getCanvasPage({ limit: 24, offset: 0 });
    return (
        <CanvasGrid
            initialCanvases={page.items}
            initialHasMore={page.hasMore}
            initialNextOffset={page.nextOffset}
            initialTotal={page.total}
        />
    );
}
