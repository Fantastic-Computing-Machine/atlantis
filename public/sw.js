// Disabled service worker (no caching) to keep SSE/live sync reliable.
// If you re-enable, ensure /api and /api/sync/stream are always network-only.

self.addEventListener('install', () => {
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // No caching; allow network to proceed unmodified
});
