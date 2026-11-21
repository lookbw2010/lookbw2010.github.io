/* 품스 생활 도구 — Service Worker
 * HTML(문서)은 network-first: 항상 최신 허브를 먼저 받아오고, 오프라인일 때만 캐시를 씁니다.
 * 아이콘·매니페스트 등 정적 파일은 cache-first로 빠르게 제공합니다.
 * 배포 후 구버전이 캐시에 갇히지 않도록 VERSION만 올리면 이전 캐시는 모두 삭제됩니다.
 */
const VERSION = 'v2';
const CACHE = `pumss-static-${VERSION}`;
const PRECACHE = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(pathname) {
  return pathname === '/manifest.json' ||
    /\.(png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf)$/i.test(pathname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isDocument = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  // 문서: network-first (캐시는 오프라인 폴백)
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
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/')))
    );
    return;
  }

  // 정적 파일: cache-first
  if (isStaticAsset(url.pathname)) {
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

  // 그 밖의 요청: 네트워크 우선, 실패 시 캐시
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
