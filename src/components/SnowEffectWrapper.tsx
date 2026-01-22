'use client';

import { SnowEffect } from '@/components/SnowEffect';
import { useDiagramStore } from '@/lib/store';

export function SnowEffectWrapper() {
    const { settings } = useDiagramStore();
    return <SnowEffect enabled={settings.snowMode ?? false} />;
}
