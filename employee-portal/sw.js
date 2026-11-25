const CACHE_NAME = "emp-portal-v2.8";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./login.html",
  "./apps.html",
  "./contact.html",
  "./admin.html",
  "./css/styles.css",
  "./css/responsive.css",
  "./js/config.js",
  "./js/utils.js",
  "./js/auth.js",
  "./js/api.js",
  "./js/theme-seasonal.js",
  "./js/news.js",
  "./js/quickapps.js",
  "./js/apps.js",
  "./js/contact.js",
  "./js/admin.js",
  "./js/pwa.js",
  "./js/shell.js",
  "./manifest.json",
  "./assets/icons/app-icon.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon-32.png",
  "./assets/icons/favicon-16.png",
  "./favicon.ico"
];

// Install Event - Safe caching that does not break if single asset fails
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`[SW] Could not pre-cache asset: ${asset}`, err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up previous version caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log(`[SW] Deleting old cache: ${key}`);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

function isGasRequest(url) {
  return url.hostname === "script.google.com" || url.hostname.endsWith("script.googleusercontent.com");
}

function putInCache(request, response) {
  if (response && response.status === 200 && response.type === "basic") {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  }
}

// Fetch Event
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Ignore non-GET requests (e.g. POST to GAS API)
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // GAS API: ห้ามแคช (มี Token/ข้อมูลส่วนตัว) ถ้าออฟไลน์ให้ตอบ JSON
  if (isGasRequest(url)) {
    event.respondWith(
      fetch(request).catch(() => new Response(JSON.stringify({
        success: false,
        offline: true,
        message: "ขณะนี้อยู่ในโหมดออฟไลน์ (Offline Mode)"
      }), {
        headers: { "Content-Type": "application/json" }
      }))
    );
    return;
  }

  // ไฟล์จากโดเมนอื่น (รูปข่าว, YouTube, ipify, Google Fonts) ปล่อยให้เบราว์เซอร์จัดการเอง
  if (url.origin !== self.location.origin) {
    return;
  }

  const isCode = request.mode === "navigate" ||
    request.destination === "script" ||
    request.destination === "style";

  // HTML / JS / CSS: Network First
  if (isCode) {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        putInCache(request, networkResponse);
        return networkResponse;
      } catch (err) {
        const cached = await caches.match(request, { ignoreSearch: request.mode === "navigate" });
        if (cached) return cached;
        if (request.mode === "navigate") {
          const fallback = await caches.match("./index.html");
          if (fallback) return fallback;
        }
        return Response.error();
      }
    })());
    return;
  }

  // อื่นๆ (รูป/ไอคอน/manifest): Stale-While-Revalidate
  event.respondWith((async () => {
    const cached = await caches.match(request);
    const fetching = fetch(request).then((networkResponse) => {
      putInCache(request, networkResponse);
      return networkResponse;
    }).catch(() => cached || Response.error());
    return cached || fetching;
  })());
});

// ==============================================================================
// PUSH NOTIFICATION EVENTS
// ==============================================================================

self.addEventListener("push", (event) => {
  let data = {
    title: "📢 ข่าวสารใหม่ | Employee Portal",
    body: "มีประกาศหรือข่าวสารใหม่สำหรับพนักงาน กรุณากดเพื่อเปิดอ่าน",
    url: "./index.html",
    icon: "./assets/icons/icon-192.png",
    badge: "./assets/icons/favicon-32.png"
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = Object.assign(data, payload);
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon || "./assets/icons/icon-192.png",
    badge: data.badge || "./assets/icons/favicon-32.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "./index.html",
      timestamp: Date.now()
    },
    actions: [
      { action: "open", title: "เปิดอ่านข่าว" },
      { action: "close", title: "ปิด" }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") {
    return;
  }

  const targetUrl = new URL(
    (event.notification.data && event.notification.data.url) || "./index.html",
    self.registration.scope
  ).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.focus().then(() => client.navigate(targetUrl)).catch(() => client.focus());
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});