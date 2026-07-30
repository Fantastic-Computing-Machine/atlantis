'use client';

import { useEffect, useRef, useState } from 'react';

import { useDiagramStore } from '@/lib/store';

type KittyState = {
  x: number;
  direction: 'left' | 'right';
  isVisible: boolean;
  isWalking: boolean;
  isResting: boolean;
};

function CuteKitty({ walkPhase, isResting }: { walkPhase: number; isResting: boolean }) {
  const stride = isResting ? 0 : Math.sin(walkPhase);
  const bodyBob = Math.abs(stride) * 1.2;
  const bodyY = 24 - bodyBob;
  const frontStep = stride * 4;
  const backStep = -frontStep;

  return (
    <svg
      width="52"
      height="40"
      viewBox="0 0 52 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.15))',
        transform: `translateY(${-bodyBob}px)`,
      }}
    >
      <path
        d={`M44 ${bodyY - 2} Q${52 + stride * 2} 16 ${48 + stride * 3} 8`}
        stroke="#F97316"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <g fill="none" strokeLinecap="round" strokeWidth="4">
        <path d={`M18 ${bodyY + 5} Q${13 - frontStep / 2} 30 ${14 + frontStep} 35`} stroke="#EA580C" />
        <path d={`M22 ${bodyY + 5} Q${21 - backStep / 2} 31 ${19 + backStep} 35`} stroke="#F97316" />
        <path d={`M38 ${bodyY + 5} Q${42 - backStep / 2} 30 ${43 + backStep} 35`} stroke="#EA580C" />
        <path d={`M34 ${bodyY + 5} Q${36 - frontStep / 2} 31 ${38 + frontStep} 35`} stroke="#F97316" />
      </g>
      <ellipse cx={14 + frontStep} cy="35" rx="3" ry="2" fill="#FDBA74" />
      <ellipse cx={19 + backStep} cy="35" rx="3" ry="2" fill="#FDBA74" />
      <ellipse cx={43 + backStep} cy="35" rx="3" ry="2" fill="#FDBA74" />
      <ellipse cx={38 + frontStep} cy="35" rx="3" ry="2" fill="#FDBA74" />
      <ellipse cx="30" cy={bodyY} rx="16" ry="10" fill="#F97316" />
      <ellipse cx="30" cy={bodyY + 2} rx="10" ry="5" fill="#FDBA74" opacity="0.4" />
      <circle cx="14" cy="14" r="11" fill="#F97316" />
      <path d="M5 7 L2 -1 L9 5 Z" fill="#F97316" />
      <path d="M6 6 L4 1 L8 5 Z" fill="#FDBA74" />
      <path d="M23 7 L26 -1 L19 5 Z" fill="#F97316" />
      <path d="M22 6 L24 1 L20 5 Z" fill="#FDBA74" />
      <ellipse cx="14" cy="16" rx="6" ry="4.5" fill="#FDBA74" />
      <ellipse cx="10" cy="12" rx="2.5" ry="3" fill="#1F2937" />
      <ellipse cx="18" cy="12" rx="2.5" ry="3" fill="#1F2937" />
      <circle cx="11" cy="11" r="1" fill="white" />
      <circle cx="19" cy="11" r="1" fill="white" />
      <path d="M14 14.5 L12.5 17 L15.5 17 Z" fill="#FB7185" />
      <path
        d="M11 18 Q14 20 17 18"
        stroke="#374151"
        strokeWidth="0.7"
        strokeLinecap="round"
        fill="none"
      />
      <line x1="14" y1="17" x2="14" y2="18.5" stroke="#374151" strokeWidth="0.7" strokeLinecap="round" />
      <ellipse cx="6" cy="15" rx="2.5" ry="1.5" fill="#FCA5A5" opacity="0.5" />
      <ellipse cx="22" cy="15" rx="2.5" ry="1.5" fill="#FCA5A5" opacity="0.5" />
      <g stroke="#6B7280" strokeWidth="0.5" opacity="0.6">
        <line x1="4" y1="14" x2="-2" y2="12" />
        <line x1="4" y1="16" x2="-2" y2="16" />
        <line x1="4" y1="18" x2="-2" y2="20" />
        <line x1="24" y1="14" x2="30" y2="12" />
        <line x1="24" y1="16" x2="30" y2="16" />
        <line x1="24" y1="18" x2="30" y2="20" />
      </g>
    </svg>
  );
}

export function KittyMode() {
  const { settings } = useDiagramStore();
  const [kitty, setKitty] = useState<KittyState>({
    x: -60,
    direction: 'right',
    isVisible: false,
    isWalking: false,
    isResting: false,
  });
  const [walkPhase, setWalkPhase] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!settings.kittyMode) {
      const timer = setTimeout(() => setKitty((prev) => ({ ...prev, isVisible: false })), 0);
      return () => clearTimeout(timer);
    }

    const startTimer = setTimeout(() => {
      setKitty((prev) => ({ ...prev, isVisible: true, isWalking: true }));
    }, Math.random() * 2000 + 500);
    return () => clearTimeout(startTimer);
  }, [settings.kittyMode]);

  useEffect(() => {
    if (!kitty.isVisible || !kitty.isWalking) return;

    const maxX = window.innerWidth + 60;
    const speed = 72;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      setWalkPhase((prev) => prev + deltaTime * 0.008);

      setKitty((prev) => {
        if (!prev.isWalking) return prev;
        const movingRight = prev.direction === 'right';
        const distance = (speed * deltaTime) / 1000;
        const x = movingRight ? prev.x + distance : prev.x - distance;

        if (movingRight ? x > maxX : x < -60) {
          setTimeout(() => {
            setKitty((next) => ({
              ...next,
              isVisible: true,
              isWalking: true,
              x: movingRight ? -60 : maxX,
              direction: movingRight && Math.random() > 0.3 ? 'right' : 'left',
            }));
          }, Math.random() * 8000 + 4000);
          return { ...prev, isVisible: false, isWalking: false };
        }

        if (Math.random() < deltaTime * 0.00003) {
          setTimeout(
            () => setKitty((next) => ({ ...next, isResting: false, isWalking: true })),
            Math.random() * 2500 + 1500
          );
          return { ...prev, x, isResting: true, isWalking: false };
        }

        return { ...prev, x };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [kitty]);

  if (!settings.kittyMode || !kitty.isVisible) return null;

  return (
    <div
      className="pointer-events-none fixed top-11 z-[100] select-none"
      style={{
        left: kitty.x,
        transform: kitty.direction === 'right' ? 'scaleX(-1)' : 'scaleX(1)',
      }}
    >
      <CuteKitty walkPhase={walkPhase} isResting={kitty.isResting} />
    </div>
  );
}
