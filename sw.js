// Service Worker for Vex PWA
const CACHE_NAME = 'vex-v1.0.2';
const STATIC_CACHE_NAME = 'vex-static-v1.0.2';
const DYNAMIC_CACHE_NAME = 'vex-dynamic-v1.0.2';

// Check if service worker should be enabled
let SERVICE_WORKER_ENABLED = true;

// Fetch config on startup
async function checkServiceWorkerEnabled() {
  try {
    const response = await fetch('/vex/sw-config.js', { cache: 'no-store' });
    const script = await response.text();
    // Extract the value from the script
    const match = script.match(/SERVICE_WORKER_ENABLED\s*=\s*(true|false)/);
    if (match) {
      SERVICE_WORKER_ENABLED = match[1] === 'true';
    }
  } catch (error) {
    console.error('Failed to fetch service worker config:', error);
    // Default to enabled if config can't be loaded
    SERVICE_WORKER_ENABLED = true;
  }
}

// Check config immediately
checkServiceWorkerEnabled();

// Files to cache immediately
const STATIC_ASSETS = [
  // '/vex/',
  // '/vex/manifest.json',
  // '/vex/vertex/static/test.html',
  // '/vex/vertex/static/app.js',
  // '/vex/vertex/static/vexcomponent.js',
  // '/vex/vertex/static/vexlist.js',
  // '/vex/vertex/static/vexthread.js',
  // '/vex/vertex/static/vex-sliding-threads.js',
  // '/vex/vertex/static/socketmanager.js',
  // '/vex/utils/reactive.js',
  // '/vex/utils/reactivestateelement.js',
  // '/vex/utils/livemodelelement/livemodelelement.js',
  // '/vex/user/static/authform.js',
  // '/vex/user/static/userstatus.js',
  // '/vex/user/static/locationpickerdialog.js',
  // '/vex/administrative/static/leafletlocationpicker.js',
  // '/vex/reactions/static/reactionbuttons.js',
  // // PWA Icons
  // '/vex/icons/android/android-launchericon-48-48.png',
  // '/vex/icons/android/android-launchericon-72-72.png',
  // '/vex/icons/android/android-launchericon-96-96.png',
  // '/vex/icons/android/android-launchericon-144-144.png',
  // '/vex/icons/android/android-launchericon-192-192.png',
  // '/vex/icons/android/android-launchericon-512-512.png',
  // '/vex/icons/ios/32.png',
  // '/vex/icons/ios/152.png',
  // '/vex/icons/ios/167.png',
  // '/vex/icons/ios/180.png',
  // '/vex/icons/ios/256.png',
  // // External CDN resources
  // 'https://cdn.socket.io/4.8.1/socket.io.min.js',
  // 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  // 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  // 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  // /^\/vex\/vertex\/initial$/,
  // /^\/vex\/user\/me$/,
  // /^\/vex\/vertex\/\w+$/
];

// Install event - cache static assets
self.addEventListener('install', async (event) => {
  // Check if service worker is enabled
  await checkServiceWorkerEnabled();
  
  if (!SERVICE_WORKER_ENABLED) {
    console.log('Service Worker is disabled. Skipping installation...');
    // Skip waiting and activate immediately to unregister
    self.skipWaiting();
    // Clear all caches
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(cacheNames.map(name => caches.delete(name)));
      })
    );
    return;
  }
  
  // eslint-disable-next-line no-console
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        // eslint-disable-next-line no-console
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { credentials: 'same-origin' })));
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Error caching static assets:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', async (event) => {
  // Check if service worker is enabled
  await checkServiceWorkerEnabled();
  
  if (!SERVICE_WORKER_ENABLED) {
    console.log('Service Worker is disabled. Unregistering and clearing caches...');
    // Clear all caches
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    // Unregister this service worker
    if (self.registration) {
      self.registration.unregister();
    }
    return;
  }
  
  // eslint-disable-next-line no-console
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            // eslint-disable-next-line no-console
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', async (event) => {
  // Re-check config periodically (every 10 requests or so)
  if (Math.random() < 0.1) {
    await checkServiceWorkerEnabled();
  }
  
  // If service worker is disabled, pass through all requests without caching
  if (!SERVICE_WORKER_ENABLED) {
    // Don't intercept - let requests go directly to network
    return;
  }
  
  console.log('fetch intercepted by service worker for', event.request.url);
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (request.method === 'GET') {
    event.respondWith(handleGetRequest(request, url));
  } else {
    // For non-GET requests, try network first
    event.respondWith(
      fetch(request).catch(() => {
        // Could implement offline queue here for POST/PUT/DELETE
        return new Response(JSON.stringify({ error: 'Offline - request queued' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  }
});

async function handleGetRequest (request, url) {
  // For API calls that should be cached
  // if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
  //   return cacheFirst(request, DYNAMIC_CACHE_NAME);
  // }

  // // For static assets
  // if (STATIC_ASSETS.some(asset => url.pathname === asset || url.href === asset)) {
  //   return cacheFirst(request, STATIC_CACHE_NAME);
  // }

  // // For Socket.io and other external resources
  // if (url.origin !== location.origin) {
  //   return networkFirst(request, DYNAMIC_CACHE_NAME);
  // }

  // For everything else, try network first
  return networkFirst(request, DYNAMIC_CACHE_NAME);
}

// Cache first strategy
async function cacheFirst (request, cacheName) {
  // If disabled, don't use cache, just fetch
  if (!SERVICE_WORKER_ENABLED) {
    return fetch(request);
  }
  
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Cache first error:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network first strategy
async function networkFirst (request, cacheName) {
  // If disabled, don't cache, just fetch
  if (!SERVICE_WORKER_ENABLED) {
    return fetch(request);
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Network first error:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline', { status: 503 });
  }
}

// Background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle queued actions when back online
      // eslint-disable-next-line no-console
      console.log('Background sync triggered')
    );
  }
});

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/vex/icons/android/android-launchericon-192-192.png',
      badge: '/vex/icons/android/android-launchericon-72-72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      }
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});
