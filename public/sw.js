/**
 * Minimal Service Worker for client-side caching
 * 
 * Caching strategy:
 * - Static assets (_next/static): Cache-first with network fallback
 * - API responses: Network-first with cache fallback
 * - Pages: Network-first with offline fallback
 */

const CACHE_NAME = 'atlantis-v1';
const STATIC_CACHE_NAME = 'atlantis-static-v1';

// Assets to precache on install
const PRECACHE_ASSETS = [
    '/',
    '/manifest.json',
];

// Install event - precache essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    // Skip waiting to activate immediately
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    // Take control of all pages immediately
    self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Static assets: Cache-first strategy
    if (url.pathname.startsWith('/_next/static/') ||
        /\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp)$/.test(url.pathname)) {
        event.respondWith(
            caches.open(STATIC_CACHE_NAME).then((cache) => {
                return cache.match(request).then((response) => {
                    if (response) {
                        return response;
                    }
                    return fetch(request).then((networkResponse) => {
                        // Only cache successful responses
                        if (networkResponse.ok) {
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // API requests: Network-first with cache fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache successful GET responses
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request);
                })
        );
        return;
    }

    // Pages: Network-first with offline fallback
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Cache successful page responses
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(request).then((response) => {
                    // Return cached response or fall back to homepage
                    return response || caches.match('/');
                });
            })
    );
});
