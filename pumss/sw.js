/* 내 개인품 — 개인품 전용 PWA Service Worker
 * 등록 범위: scope "/pumss/" (허브 /sw.js 와 완전히 별개로 동작합니다)
 * - HTML(문서)은 network-first: 항상 최신 페이지를 먼저 받아오고, 오프라인일 때만 캐시를 씁니다.
 * - 아이콘·매니페스트는 cache-first로 빠르게 제공합니다.
 * - 캐시 이름이 'pumss-personal-' 로 시작하는 것만 정리하므로 허브('pumss-static-…') 캐시는 건드리지 않습니다.
 */
const VERSION = 'v1';
const CACHE = `pumss-personal-${VERSION}`;
const CACHE_PREFIX = 'pumss-personal-';
const SCOPE = '/pumss/';
const PRECACHE = [
  SCOPE,
  '/pumss/manifest.json',
  '/pumss/icons/icon-192.png',
  '/pumss/icons/icon-512.png',
  '/pumss/icons/icon-512-maskable.png',
  '/pumss/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(PRECACHE.map((url) =>
        cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // 이 서비스 워커는 개인품 페이지('/pumss/')만 담당합니다. 외부 도메인(pumss.co.kr 등)은 그대로 통과.
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(SCOPE)) return;

  const isDocument = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  // 문서: network-first (오프라인 폴백은 캐시 → '/pumss/')
  if (isDocument) {
    event.respondWith(
      fetch(new Request(req, { cache: 'no-store' }))
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match(SCOPE)))
    );
    return;
  }

  // 아이콘·매니페스트: cache-first
  const isStatic = url.pathname.startsWith('/pumss/icons/') ||
    url.pathname === '/pumss/manifest.json' ||
    /\.(png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf)$/i.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        });
      })
    );
    return;
  }

  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
