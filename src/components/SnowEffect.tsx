'use client';

import { useEffect, useState } from 'react';
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

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

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
      size: r1 * 4 + 2,
      left: r2 * 100,
      delay: r3 * 5,
      duration: r4 * 5 + 8,
      opacity: r5 * 0.5 + 0.5,
    });
  }
  return flakes;
}

const SNOWFLAKES = generateSnowflakes(100);

export function SnowEffect({ enabled }: SnowEffectProps) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  if (!mounted || !enabled) return null;

  const snowColor = resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(135, 206, 235, 0.8)';

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {SNOWFLAKES.map((flake) => (
        <div
          key={flake.id}
          className="animate-snow absolute rounded-full"
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
