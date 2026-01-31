'use client';

import { useEffect, useState, useRef } from 'react';
import { useDiagramStore } from '@/lib/store';

interface KittyState {
    x: number;
    direction: 'left' | 'right';
    isVisible: boolean;
    isWalking: boolean;
    isResting: boolean;
}

// Cute orange kitty with connected legs and smooth walking
function CuteKitty({ walkPhase, isResting }: { walkPhase: number; isResting: boolean }) {
    // Smooth sine-wave based leg animation
    const legOffset1 = Math.sin(walkPhase) * 3;
    const legOffset2 = Math.sin(walkPhase + Math.PI) * 3;

    // Slight body bob while walking
    const bodyBob = isResting ? 0 : Math.abs(Math.sin(walkPhase * 2)) * 1;

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
            {/* Tail - wagging slightly */}
            <path
                d={`M44 22 Q${52 + (isResting ? 0 : Math.sin(walkPhase * 1.5) * 2)} 16 ${48 + (isResting ? 0 : Math.sin(walkPhase) * 3)} 8`}
                stroke="#F97316"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
            />

            {/* Back legs (attached to body) */}
            <ellipse
                cx="38"
                cy={32 + legOffset2}
                rx="4"
                ry="5"
                fill="#EA580C"
            />
            <ellipse
                cx="42"
                cy={32 + legOffset1}
                rx="4"
                ry="5"
                fill="#F97316"
            />

            {/* Body - overlaps legs to connect them */}
            <ellipse cx="30" cy="24" rx="16" ry="10" fill="#F97316" />

            {/* Body stripe/belly highlight */}
            <ellipse cx="30" cy="26" rx="10" ry="5" fill="#FDBA74" opacity="0.4" />

            {/* Front legs (attached to body) */}
            <ellipse
                cx="14"
                cy={32 + legOffset1}
                rx="4"
                ry="5"
                fill="#EA580C"
            />
            <ellipse
                cx="18"
                cy={32 + legOffset2}
                rx="4"
                ry="5"
                fill="#F97316"
            />

            {/* Paw details */}
            <ellipse cx="14" cy={35 + legOffset1} rx="3" ry="2" fill="#FDBA74" />
            <ellipse cx="18" cy={35 + legOffset2} rx="3" ry="2" fill="#FDBA74" />
            <ellipse cx="38" cy={35 + legOffset2} rx="3" ry="2" fill="#FDBA74" />
            <ellipse cx="42" cy={35 + legOffset1} rx="3" ry="2" fill="#FDBA74" />

            {/* Head */}
            <circle cx="14" cy="14" r="11" fill="#F97316" />

            {/* Ears */}
            <path d="M5 7 L2 -1 L9 5 Z" fill="#F97316" />
            <path d="M6 6 L4 1 L8 5 Z" fill="#FDBA74" />
            <path d="M23 7 L26 -1 L19 5 Z" fill="#F97316" />
            <path d="M22 6 L24 1 L20 5 Z" fill="#FDBA74" />

            {/* Face - cream colored muzzle */}
            <ellipse cx="14" cy="16" rx="6" ry="4.5" fill="#FDBA74" />

            {/* Eyes - cute and big */}
            <ellipse cx="10" cy="12" rx="2.5" ry="3" fill="#1F2937" />
            <ellipse cx="18" cy="12" rx="2.5" ry="3" fill="#1F2937" />
            {/* Eye highlights */}
            <circle cx="11" cy="11" r="1" fill="white" />
            <circle cx="19" cy="11" r="1" fill="white" />

            {/* Nose - triangle */}
            <path d="M14 14.5 L12.5 17 L15.5 17 Z" fill="#FB7185" />

            {/* Mouth - cute W shape */}
            <path d="M11 18 Q14 20 17 18" stroke="#374151" strokeWidth="0.7" fill="none" strokeLinecap="round" />
            <line x1="14" y1="17" x2="14" y2="18.5" stroke="#374151" strokeWidth="0.7" strokeLinecap="round" />

            {/* Cheek blush */}
            <ellipse cx="6" cy="15" rx="2.5" ry="1.5" fill="#FCA5A5" opacity="0.5" />
            <ellipse cx="22" cy="15" rx="2.5" ry="1.5" fill="#FCA5A5" opacity="0.5" />

            {/* Whiskers */}
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
            const timer = setTimeout(() => {
                setKitty((prev) => ({ ...prev, isVisible: false }));
            }, 0);
            return () => clearTimeout(timer);
        }

        const startDelay = Math.random() * 2000 + 500;
        const startTimer = setTimeout(() => {
            setKitty((prev) => ({ ...prev, isVisible: true, isWalking: true }));
        }, startDelay);

        return () => clearTimeout(startTimer);
    }, [settings.kittyMode]);

    useEffect(() => {
        if (!kitty.isVisible) return;

        const maxX = window.innerWidth + 60;
        const speed = 1.2;
        let lastTime = performance.now();

        const animate = (currentTime: number) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            // Update walk phase for smooth animation
            if (kitty.isWalking) {
                setWalkPhase((prev) => prev + deltaTime * 0.008);
            }

            setKitty((prev) => {
                if (!prev.isWalking) return prev;

                let newX = prev.x;
                const newDirection = prev.direction;
                let newIsVisible: boolean = prev.isVisible;
                let newIsWalking: boolean = prev.isWalking;
                let newIsResting: boolean = prev.isResting;

                if (prev.direction === 'right') {
                    newX = prev.x + speed;
                    if (newX > maxX) {
                        newIsVisible = false;
                        newIsWalking = false;
                        setTimeout(() => {
                            setKitty((p) => ({
                                ...p,
                                isVisible: true,
                                isWalking: true,
                                x: -60,
                                direction: Math.random() > 0.3 ? 'right' : 'left',
                            }));
                        }, Math.random() * 8000 + 4000);
                    }
                } else {
                    newX = prev.x - speed;
                    if (newX < -60) {
                        newIsVisible = false;
                        newIsWalking = false;
                        setTimeout(() => {
                            setKitty((p) => ({
                                ...p,
                                isVisible: true,
                                isWalking: true,
                                x: maxX,
                                direction: 'left',
                            }));
                        }, Math.random() * 8000 + 4000);
                    }
                }

                // Random chance to stop and rest (sit down)
                if (newIsWalking && Math.random() < 0.0005) {
                    newIsResting = true;
                    newIsWalking = false;
                    setTimeout(() => {
                        setKitty((p) => ({ ...p, isResting: false, isWalking: true }));
                    }, Math.random() * 2500 + 1500);
                }

                return {
                    x: newX,
                    direction: newDirection,
                    isVisible: newIsVisible,
                    isWalking: newIsWalking,
                    isResting: newIsResting,
                };
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [kitty.isVisible, kitty.isWalking]);

    if (!settings.kittyMode || !kitty.isVisible) {
        return null;
    }

    return (
        <div
            className="fixed top-11 z-[100] pointer-events-none select-none"
            style={{
                left: kitty.x,
                transform: kitty.direction === 'right' ? 'scaleX(-1)' : 'scaleX(1)',
            }}
        >
            <CuteKitty walkPhase={walkPhase} isResting={kitty.isResting} />
        </div>
    );
}
