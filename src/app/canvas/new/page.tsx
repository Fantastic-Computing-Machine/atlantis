import { redirect } from 'next/navigation';
import { createCanvas } from '@/lib/canvas-data';

export default async function Page() {
    const canvas = await createCanvas({
        title: 'Untitled Canvas',
    });
    redirect(`/canvas/${canvas.id}`);
}
