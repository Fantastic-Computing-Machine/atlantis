'use client';

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

export function Greeting() {
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        let text = '';

        if (hour >= 5 && hour < 9) {
            text = 'Rise and shine!';
        } else if (hour >= 9 && hour < 12) {
            text = 'Good morning!';
        } else if (hour >= 12 && hour < 14) {
            text = 'Hope you having a great day!';
        } else if (hour >= 14 && hour < 18) {
            text = 'Good afternoon!';
        } else if (hour >= 18 && hour < 22) {
            text = 'Good evening!';
        } else if (hour >= 22 || hour < 2) {
            text = 'Burning the midnight oil?';
        } else {
            text = 'You really enjoy coding, don\'t you?';
        }
        setGreeting(text);
    }, []);

    return (
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
            {greeting}
            <Sparkles className="h-6 w-6 text-amber-500 animate-pulse" />
        </h2>
    );
}
