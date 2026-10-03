const CACHE_VERSION = 'tattoogo-mk-v2';
const SHELL_CACHE = CACHE_VERSION + '-shell';
const DATA_CACHE = CACHE_VERSION + '-data';
const IMAGE_CACHE = CACHE_VERSION + '-images';

const APP_SHELL = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

const DATA_PATHS = ['/api/catalogo/feed', '/api/catalogo/artistas', '/api/catalogo/cidades'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key.indexOf(CACHE_VERSION) !== 0;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  var bypassAuthAndApi =
    url.pathname.indexOf('/login') === 0 ||
    url.pathname.indexOf('/register') === 0 ||
    url.pathname.indexOf('/sign-in') === 0 ||
    url.pathname.indexOf('/sign-up') === 0 ||
    url.pathname.indexOf('/api/') === 0 ||
    url.hostname.indexOf('clerk.accounts.dev') !== -1 ||
    url.hostname.indexOf('clerk.services') !== -1 ||
    url.hostname.indexOf('clerk.com') !== -1;

  if (bypassAuthAndApi) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL_CACHE, '/offline.html'));
    return;
  }

  if (DATA_PATHS.some(function (path) { return url.pathname.indexOf(path) === 0; })) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (request.destination === 'image' || /\.(png|jpg|jpeg|webp|avif|svg)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
});

self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/**
 * A response is only safe to persist when it is a complete, successful body.
 * `response.ok` is true for 206 Partial Content, which would poison the cache
 * with truncated range bodies, so we require an exact status 200 and a GET.
 */
function canCache(request, response) {
  return (
    request.method === 'GET' &&
    !!response &&
    response.status === 200
  );
}

function networkFirst(request, cacheName, fallbackUrl) {
  return caches.open(cacheName).then(function (cache) {
    return fetch(request).then(function (response) {
      if (canCache(request, response)) cache.put(request, response.clone());
      return response;
    }).catch(function () {
      return cache.match(request).then(function (cached) {
        if (cached) return cached;
        if (fallbackUrl) {
          return caches.match(fallbackUrl).then(function (fallback) {
            return fallback || new Response('Offline', { status: 503, statusText: 'Offline' });
          });
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    });
  });
}

function cacheFirst(request, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (canCache(request, response)) cache.put(request, response.clone());
        return response || new Response('Offline', { status: 503, statusText: 'Offline' });
      }).catch(function () {
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    });
  });
}

function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (cached) {
      var network = fetch(request).then(function (response) {
        if (canCache(request, response)) cache.put(request, response.clone());
        return response || cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      }).catch(function () {
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      });
      return cached || network;
    });
  });
}
