const CACHE_NAME = 'cheque-manager-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/auth.js',
    '/db.js',
    '/firebase-config.js',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// Install service worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate service worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch strategy: Cache first, then network
self.addEventListener('fetch', event => {
    // Skip Firebase URLs for real-time updates
    if (event.request.url.includes('firebase')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                
                return fetch(event.request).then(response => {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clone the response
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
            .catch(() => {
                // If offline and not in cache, show offline page
                if (event.request.url.endsWith('.html')) {
                    return caches.match('/index.html');
                }
            })
    );
});

// Background sync for offline data
self.addEventListener('sync', event => {
    if (event.tag === 'sync-cheques') {
        event.waitUntil(syncOfflineData());
    }
});

async function syncOfflineData() {
    // Get offline data from IndexedDB
    const offlineData = await getOfflineData();
    
    // Sync with Firebase
    for (const data of offlineData) {
        try {
            await syncWithFirebase(data);
            await removeFromOffline(data.id);
        } catch (error) {
            console.error('Sync failed:', error);
        }
    }
}