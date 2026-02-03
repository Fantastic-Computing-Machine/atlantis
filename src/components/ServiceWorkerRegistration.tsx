'use client';

import { useEffect } from 'react';

/**
 * Service Worker Registration Component
 *
 * Registers the service worker for:
 * - Offline caching of static assets
 * - PWA install prompt capability
 * - Faster returning user load times
 */
export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            // Register service worker
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('[SW] Service Worker registered:', registration.scope);

                    // Check for updates periodically (every hour)
                    setInterval(() => {
                        registration.update();
                    }, 60 * 60 * 1000);
                })
                .catch((error) => {
                    console.warn('[SW] Service Worker registration failed:', error);
                });
        }
    }, []);

    return null;
}

