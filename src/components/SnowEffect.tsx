'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTheme } from 'next-themes';

type SnowEffectProps = {
    enabled: boolean;
};

type SnowflakeData = {
    id: number;
    size: number;
    left: number;
    delay: number;
    duration: number;
    opacity: number;
};

// Simple seeded random for consistent but random-looking values
function seededRandom(seed: number): number {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
}

// Generate stable snowflake data once with more natural distribution
function generateSnowflakes(count: number): SnowflakeData[] {
    const flakes: SnowflakeData[] = [];
    for (let i = 0; i < count; i++) {
        const r1 = seededRandom(i * 1.1);
        const r2 = seededRandom(i * 2.3);
        const r3 = seededRandom(i * 3.7);
        const r4 = seededRandom(i * 5.9);
        const r5 = seededRandom(i * 7.1);

        flakes.push({
            id: i,
            size: r1 * 4 + 2, // 2-6px
            left: r2 * 100,
            delay: r3 * 5, // 0-5s
            duration: r4 * 5 + 8, // 8-13s
            opacity: r5 * 0.5 + 0.5, // 0.5-1
        });
    }
    return flakes;
}

const SNOWFLAKES = generateSnowflakes(100);

export function SnowEffect({ enabled }: SnowEffectProps) {
    const [mounted, setMounted] = useState(false);
    const { resolvedTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !enabled) return null;

    const isDark = resolvedTheme === 'dark';
    const snowColor = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(135, 206, 235, 0.8)';

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            {SNOWFLAKES.map((flake) => (
                <div
                    key={flake.id}
                    className="absolute rounded-full animate-snow"
                    style={{
                        width: flake.size,
                        height: flake.size,
                        left: `${flake.left}%`,
                        top: -20,
                        backgroundColor: snowColor,
                        opacity: flake.opacity,
                        animationDelay: `${flake.delay}s`,
                        animationDuration: `${flake.duration}s`,
                    }}
                />
            ))}
        </div>
    );
}
