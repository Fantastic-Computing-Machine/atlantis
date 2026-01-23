'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

export function Greeting() {
    const [greeting] = useState(() => {
        const hour = new Date().getHours();

        if (hour >= 5 && hour < 9) {
            return 'Rise and shine!';
        } else if (hour >= 9 && hour < 12) {
            return 'Good morning!';
        } else if (hour >= 12 && hour < 14) {
            return 'Hope you having a great day!';
        } else if (hour >= 14 && hour < 18) {
            return 'Good afternoon!';
        } else if (hour >= 18 && hour < 22) {
            return 'Good evening!';
        } else if (hour >= 22 || hour < 2) {
            return 'Burning the midnight oil?';
        } else {
            return 'You really enjoy coding, don\'t you?';
        }
    });

    return (
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
            {greeting}
            <Sparkles className="h-6 w-6 text-amber-500 animate-pulse" />
        </h2>
    );
}
