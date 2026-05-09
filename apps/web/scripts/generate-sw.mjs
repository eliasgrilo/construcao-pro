import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const distDir = path.join(appRoot, 'dist')
const outputFile = path.join(distDir, 'sw.js')

const PRECACHE_NAMES = new Set([
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon-180x180.png',
  '/pwa-64x64.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/maskable-icon-512x512.png',
])

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) return walk(fullPath)
      return [fullPath]
    }),
  )
  return files.flat()
}

function toPublicPath(file) {
  return `/${path.relative(distDir, file).split(path.sep).join('/')}`
}

function shouldPrecache(file) {
  const publicPath = toPublicPath(file)
  if (publicPath === '/sw.js' || publicPath.endsWith('.map')) return false
  if (PRECACHE_NAMES.has(publicPath)) return true
  return publicPath.startsWith('/assets/')
}

async function buildPrecacheList() {
  const files = await walk(distDir)
  const precache = files.filter((file) => shouldPrecache(file)).map(toPublicPath)
  return [...new Set(precache)].sort()
}

async function buildVersion(precache) {
  const hash = createHash('sha256')
  for (const file of precache) {
    hash.update(file)
    hash.update(await fs.readFile(path.join(distDir, file.slice(1))))
  }
  return hash.digest('hex').slice(0, 12)
}

function buildServiceWorkerSource({ precache, version }) {
  return `const CACHE_NAME = 'construcao-pro-${version}';
const DOCUMENTOS_CACHE = 'construcao-pro-docs';
const PRECACHE_URLS = ${JSON.stringify(precache, null, 2)};
const STATIC_DESTINATIONS = new Set(['style', 'script', 'worker', 'font', 'image']);

// Hashed assets are immutable — their URL changes when content changes.
// Match filenames like: chunk-AbCdEfGh.js or index-AbCdEfGh.css (8+ hex chars before extension).
const IMMUTABLE_RE = /\\/assets\\/.*-[0-9a-f]{8,}\\.(js|css|woff2?|png|svg|ico)$/;

// ── Install: resilient precaching ───────────────────────────────────────────
// addAll() fails entirely if any single asset returns non-200.
// Instead, we prefetch each URL individually and skip failures.
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.allSettled(
        PRECACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (response.ok) await cache.put(url, response);
          } catch {
            // Network unavailable — asset will be fetched on demand later.
          }
        }),
      );
      self.skipWaiting();
    })(),
  );
});

// ── Activate: delete stale caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== DOCUMENTOS_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim()),
  );
});

// ── Messages ─────────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // App → SW: cache a signed document URL under a stable key (storage path).
  // This allows offline playback of previously viewed documents even after
  // the signed URL expires (Supabase Storage signed URLs last 1 hour).
  if (event.data?.type === 'CACHE_DOCUMENTO') {
    const { signedUrl, storagePath } = event.data;
    if (!signedUrl || !storagePath) return;
    event.waitUntil(
      (async () => {
        try {
          const cache = await caches.open(DOCUMENTOS_CACHE);
          // Use stable key (storagePath) so we can retrieve offline
          // regardless of signed URL expiry. The signed URL is used only
          // for the initial fetch while online.
          const existing = await cache.match(storagePath);
          if (existing) return; // already cached — skip re-fetch
          const response = await fetch(signedUrl);
          if (response.ok) {
            // Store under stable storage path key (not the signed URL)
            await cache.put(storagePath, response);
          }
        } catch {
          // Network failure — will be fetched again next time online.
        }
      })(),
    );
    return;
  }

  // App → SW: pre-cache a batch of documents in background.
  if (event.data?.type === 'PREFETCH_DOCUMENTOS') {
    const items = event.data.items; // Array<{ signedUrl: string; storagePath: string }>
    if (!Array.isArray(items)) return;
    event.waitUntil(
      (async () => {
        const cache = await caches.open(DOCUMENTOS_CACHE);
        await Promise.allSettled(
          items.map(async ({ signedUrl, storagePath }) => {
            try {
              const existing = await cache.match(storagePath);
              if (existing) return;
              const response = await fetch(signedUrl);
              if (response.ok) await cache.put(storagePath, response);
            } catch {
              // Ignored — best-effort prefetch.
            }
          }),
        );
      })(),
    );
    return;
  }

  // App → SW: remove a deleted document from the offline cache.
  if (event.data?.type === 'EVICT_DOCUMENTO') {
    const { storagePath } = event.data;
    if (!storagePath) return;
    event.waitUntil(
      caches.open(DOCUMENTOS_CACHE).then((cache) => cache.delete(storagePath)),
    );
  }
});

// ── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Document files: serve from DOCUMENTOS_CACHE when offline.
  // Supabase Storage signed URLs look like:
  //   https://<project>.supabase.co/storage/v1/object/sign/documentos/<path>
  // We match on the stable storage path extracted from the URL.
  if (url.hostname.endsWith('.supabase.co') && url.pathname.includes('/storage/v1/object/sign/documentos/')) {
    event.respondWith(handleDocumentoFetch(request, url));
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (STATIC_DESTINATIONS.has(request.destination) || url.pathname.startsWith('/assets/')) {
    // Immutable hashed assets: cache-first, no background revalidation.
    if (IMMUTABLE_RE.test(url.pathname)) {
      event.respondWith(handleImmutable(request));
    } else {
      // Mutable assets (manifest, icons): stale-while-revalidate.
      const { response, revalidate } = handleStale(request);
      event.respondWith(response);
      event.waitUntil(revalidate);
    }
  }
});

// Network-first for navigation; fall back to cached index.html when offline.
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    return (await caches.match('/index.html')) || Response.error();
  }
}

// Cache-first for immutable hashed assets.
async function handleImmutable(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return Response.error();
  }
}

// Stale-while-revalidate for mutable assets.
function handleStale(request) {
  const revalidate = (async () => {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  })();

  const response = (async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      return await revalidate;
    } catch {
      return Response.error();
    }
  })();

  return {
    response,
    revalidate: revalidate.catch(() => undefined),
  };
}

// Document file: network-first, fall back to DOCUMENTOS_CACHE by storage path.
// The stable cache key is the storage path segment after "/sign/documentos/",
// stripping the query string (token, expiry params).
async function handleDocumentoFetch(request, url) {
  // Extract stable storage path: everything after "/sign/documentos/"
  const match = url.pathname.match(/\\/storage\\/v1\\/object\\/sign\\/documentos\\/(.+)$/);
  const storagePath = match ? match[1] : null;

  try {
    const response = await fetch(request);
    if (response.ok && storagePath) {
      // Update cache with fresh response — fire and forget.
      caches.open(DOCUMENTOS_CACHE).then((cache) => cache.put(storagePath, response.clone()));
    }
    return response;
  } catch {
    // Offline — try stable-key cache.
    if (storagePath) {
      const cache = await caches.open(DOCUMENTOS_CACHE);
      const cached = await cache.match(storagePath);
      if (cached) return cached;
    }
    return Response.error();
  }
}
`
}


const precache = await buildPrecacheList()
const version = await buildVersion(precache)
const source = buildServiceWorkerSource({ precache, version })

await fs.writeFile(outputFile, source)
console.log(`Generated service worker with ${precache.length} assets`)
