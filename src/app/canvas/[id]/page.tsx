import { notFound } from 'next/navigation';
import { DrawingEditor } from '@/components/DrawingEditor';
import { getCanvasById, updateCanvasById } from '@/lib/canvas-data';
// DashboardHeader removed as it was unused
// Usually editor pages have a header or at least navigation.
// Let's assume we want the standard layout or full screen.
// For now, let's just render the editor.

interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
    const { id } = await params;
    const canvas = await getCanvasById(id);
    if (!canvas) {
        return {
            title: 'Canvas Not Found // Atlantis',
        };
    }
    return {
        title: `atlantis // ${canvas.title}`,
        description: 'Freeform drawing canvas',
    };
}

export default async function Page({ params }: PageProps) {
    const { id } = await params;
    const canvas = await getCanvasById(id);

    if (!canvas) {
        notFound();
    }

    async function saveCanvas(content: string, preview?: string) {
        'use server';
        // We only save content here if strictly needed by the editor's auto-save hook
        // but the editor will primarily use client-side API calls for granular updates
        await updateCanvasById(id, { content, preview });
    }

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden">
            <div className="flex-1 relative">
                <DrawingEditor
                    initialCanvas={canvas}
                    onSave={saveCanvas}
                />
            </div>
        </div>
    );
}
