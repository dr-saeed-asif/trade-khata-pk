const CACHE_NAME = 'qr-inventory-cache-v2'
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './favicon.ico', './favicon-32x32.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const requestUrl = new URL(request.url)

  if (request.method !== 'GET') return
  if (!['http:', 'https:'].includes(requestUrl.protocol)) return
  if (requestUrl.origin !== self.location.origin) return
  if (requestUrl.pathname.startsWith('/@vite') || requestUrl.pathname.startsWith('/@react-refresh')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html')),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((response) => {
          if (!response.ok || response.type === 'opaque') return response
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy).catch(() => undefined))
          return response
        })
        .catch(() => caches.match('./index.html'))
    }),
  )
})
