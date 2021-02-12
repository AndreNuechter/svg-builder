/* eslint-disable no-restricted-globals */

const appName = 'svg-builder';
const appVersion = '0.1';
const cacheName = `${appName}-v${appVersion}`;

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await self.caches.keys();
            return Promise.all(keys.map((key) => {
                if (key.includes(appName) && key !== cacheName) {
                    return self.caches.delete(key);
                }
                return true;
            }));
        })()
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        (async () => {
            let response = await self.caches.match(event.request);
            if (response) return response;
            response = await fetch(event.request);
            const cache = await self.caches.open(cacheName);
            cache.put(event.request, response.clone());
            return response;
        })()
    );
});