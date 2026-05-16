/*
 * LifeGuard Service Worker
 * Provides offline caching, background sync for SOS signals,
 * and graceful degradation during emergencies.
 */

// Import Firebase SDKs for background messaging
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

// Initialize Firebase in the Service Worker
// (Hardcoded config to ensure background messaging works independently)
firebase.initializeApp({
  apiKey: "AIzaSyBtWqoJgOOB9yGJzmPI1WR3dbIkNjB3UtE",
  projectId: "floodguard-a024c",
  messagingSenderId: "913368784119",
  appId: "1:913368784119:web:9b7d93b64986ff5d6407f2"
});

const messaging = firebase.messaging();

const CACHE_NAME = 'lifeguard-v2';

const OFFLINE_URL = '/offline.html';

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/flood.html',
  '/quake.html',
  '/fire.html',
  '/rescue.html',
  '/map.html',
  '/offline.html',
  '/manifest.json',
  '/assets/css/style.css',
  '/assets/js/config.js',
  '/assets/js/app.js',
  '/assets/js/firebase.js',
  '/assets/js/i18n.js',
  '/assets/js/bg-effects.js',
  '/assets/js/ui-effects.js',
  '/assets/js/dashboard.js',
  '/assets/js/quake.js',
  '/assets/js/fire.js',
  '/assets/img/logo.png',
  '/assets/img/og-preview.png'
];

// ─── INSTALL: Pre-cache all critical assets ───
self.addEventListener('install', event => {
  console.log('[SW] Installing LifeGuard Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching critical assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// ─── ACTIVATE: Clean old caches ───
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('[SW] Removing old cache:', key);
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// ─── FETCH: Network-first with cache fallback ───
self.addEventListener('fetch', event => {
  const { request } = event;

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET') return;

  // For navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the latest version of the page
          if (request.url.startsWith('http')) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline: serve from cache, or fallback to offline page
          return caches.match(request).then(cached => {
            return cached || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // For static assets: Cache-first strategy
  if (request.url.match(/\.(css|js|png|jpg|jpeg|svg|woff2?|ico)$/)) {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request).then(response => {
          if (request.url.startsWith('http')) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // For API calls: Network-only (don't cache API responses)
  event.respondWith(
    fetch(request).catch(() => {
      return new Response(JSON.stringify({ error: 'offline', cached: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    })
  );
});

// ─── BACKGROUND SYNC: Retry queued SOS signals ───
self.addEventListener('sync', event => {
  if (event.tag === 'sync-sos') {
    console.log('[SW] Background sync: sending queued SOS signals');
    event.waitUntil(syncQueuedSOS());
  }
});

async function syncQueuedSOS() {
  // This will be called when connectivity is restored
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_SOS' });
  });
}

// ─── PUSH NOTIFICATIONS (FCM) ───
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);
  
  const notificationTitle = payload.notification.title || '🚨 LifeGuard Alert';
  const notificationOptions = {
    body: payload.notification.body || 'Emergency alert received.',
    icon: '/assets/img/logo.png',
    badge: '/assets/img/logo.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'lifeguard-alert',
    data: payload.data, // Preserve custom data
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'Open Dashboard' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});


self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(clients.openWindow('/'));
  }
});
