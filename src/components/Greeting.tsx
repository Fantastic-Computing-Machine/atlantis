'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

export function Greeting() {
    const [greeting, setGreeting] = useState('Welcome back');

    useEffect(() => {
        const hour = new Date().getHours();

        if (hour >= 5 && hour < 9) {
            setGreeting('Rise and shine!');
        } else if (hour >= 9 && hour < 12) {
            setGreeting('Good morning!');
        } else if (hour >= 12 && hour < 14) {
            setGreeting('Hope you having a great day!');
        } else if (hour >= 14 && hour < 18) {
            setGreeting('Good afternoon!');
        } else if (hour >= 18 && hour < 22) {
            setGreeting('Good evening!');
        } else if (hour >= 22 || hour < 2) {
            setGreeting('Burning the midnight oil?');
        } else {
            setGreeting('You really enjoy coding, don\'t you?');
        }
    }, []);

    return (
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
            {greeting}
            <Sparkles className="h-6 w-6 text-amber-500 animate-pulse" />
        </h2>
    );
}
