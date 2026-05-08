const CACHE_NAME = 'p2p-messenger-v5';

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                const urlsToCache = [
                    './',
                    './index.html'
                ];
                return Promise.allSettled(
                    urlsToCache.map(url => 
                        cache.add(url).catch(err => {
                            console.warn(`Не удалось закешировать ${url}:`, err);
                        })
                    )
                );
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).catch(err => {
                    console.warn(`Ошибка загрузки ${event.request.url}:`, err);
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    throw err;
                });
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});