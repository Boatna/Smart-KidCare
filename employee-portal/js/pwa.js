const PWA = (function () {
  "use strict";
  const ua = navigator.userAgent || "";
  const isIOS = (/iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) && !window.MSStream;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  const isInAppBrowser = /\bLine\/|FBAN|FBAV|FB_IAB|Instagram|MicroMessenger|; wv\)/i.test(ua);
  const isLoginPage = /login\.html$/i.test(window.location.pathname);

  const KEYS = {
    install: "pwa_install_prompt_v2",
    notif: "pwa_notif_prompt_v2",
    seenNews: "emp_seen_news_ids",
    sessionShown: "pwa_prompt_shown_session"
  };
  const DAY = 24 * 60 * 60 * 1000;
  const INSTALL_SNOOZE_DAYS = [7, 30, 90];
  const NOTIF_SNOOZE_DAYS = [3, 14, 60];
  const NEWS_POLL_MS = 5 * 60 * 1000;

  let deferredPrompt = null;
  let activePrompt = null;
  let evalTimer = null;

  function toast(message, type, duration) {
    if (typeof Utils !== "undefined" && Utils.showToast) {
      Utils.showToast(message, type || "info", duration || 4000);
    }
  }

  function readState(key) {
    try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch (e) { return {}; }
  }

  function writeState(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  function isSnoozed(key) {
    return Number(readState(key).until || 0) > Date.now();
  }

  function snooze(key, schedule) {
    const count = Number(readState(key).count || 0) + 1;
    const days = schedule[Math.min(count - 1, schedule.length - 1)];
    writeState(key, { count: count, until: Date.now() + days * DAY });
  }

  function neverAskAgain(key) {
    writeState(key, { count: 99, until: Date.now() + 3650 * DAY });
  }

  function shownThisSession() {
    try { return sessionStorage.getItem(KEYS.sessionShown) === "1"; } catch (e) { return false; }
  }

  function markShownThisSession() {
    try { sessionStorage.setItem(KEYS.sessionShown, "1"); } catch (e) {}
  }

  function isLoggedIn() {
    return typeof Auth === "undefined" ? true : Auth.isLoggedIn();
  }

  function init() {
    registerServiceWorker();
    setupInstallListeners();
    injectInstallMenuItem();
    setupNotificationButton();
    updateInstallEntryPoints();
    scheduleEvaluate();
    startNewsWatcher();

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") scheduleEvaluate();
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    const doRegister = () => {
      navigator.serviceWorker.register("./sw.js")
        .then((reg) => console.log("ServiceWorker registered with scope:", reg.scope))
        .catch((err) => console.warn("ServiceWorker registration failed:", err));
    };
    if (document.readyState === "complete") doRegister();
    else window.addEventListener("load", doRegister);
  }

  function hidePrompt() {
    const el = document.getElementById("pwaPrompt");
    if (el) el.remove();
    document.body.classList.remove("has-pwa-prompt");
    activePrompt = null;
  }

  function showPrompt(cfg) {
    hidePrompt();

    const el = document.createElement("div");
    el.id = "pwaPrompt";
    el.className = "pwa-prompt";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", cfg.title);
    el.innerHTML = `
      <button type="button" class="pwa-prompt-close" aria-label="ปิด">&times;</button>
      <div class="pwa-prompt-head">
        <img src="assets/icons/app-icon.png" alt="" class="pwa-prompt-icon">
        <div class="pwa-prompt-body">
          <div class="pwa-prompt-title">${cfg.title}</div>
          <div class="pwa-prompt-text">${cfg.text}</div>
        </div>
      </div>
      <div class="pwa-prompt-actions">
        <button type="button" class="btn btn-secondary btn-sm" data-act="later">ไว้ทีหลัง</button>
        <button type="button" class="btn btn-primary btn-sm" data-act="primary">${cfg.primaryLabel}</button>
      </div>
    `;

    document.body.appendChild(el);
    document.body.classList.add("has-pwa-prompt");
    activePrompt = cfg.type;
    markShownThisSession();

    const later = () => {
      snooze(cfg.key, cfg.schedule);
      hidePrompt();
    };
    el.querySelector(".pwa-prompt-close").addEventListener("click", later);
    el.querySelector('[data-act="later"]').addEventListener("click", later);
    el.querySelector('[data-act="primary"]').addEventListener("click", () => {
      hidePrompt();
      cfg.onPrimary();
    });
  }

  function scheduleEvaluate() {
    // ปิดป๊อปอัพอัตโนมัติ: ผู้ใช้กดติดตั้งจากเมนู Sidebar และกดแจ้งเตือนจากปุ่มกระดิ่งบน Header แทน
    return;
  }

  function evaluatePrompts() {
    if (activePrompt || isLoginPage) return;
    if (document.visibilityState !== "visible") return;
    if (document.querySelector(".modal-backdrop.show")) return;
    if (shownThisSession()) return;
    if (!isStandalone && !isSnoozed(KEYS.install)) {
      if (deferredPrompt) return showInstallPrompt();
      if (isInAppBrowser) return showInAppBrowserPrompt();
      if (isIOS) return showIOSPrompt();
    }

    if (canPromptNotifications()) showNotificationPrompt();
  }

  function setupInstallListeners() {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      updateInstallEntryPoints();
      scheduleEvaluate();
    });

    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      neverAskAgain(KEYS.install);
      hidePrompt();
      updateInstallEntryPoints();
      toast("🎉 ติดตั้งเรียบร้อย เปิดจากหน้าจอหลักได้เลย", "success", 5000);
    });
  }

  function showInstallPrompt() {
    showPrompt({
      type: "install",
      key: KEYS.install,
      schedule: INSTALL_SNOOZE_DAYS,
      title: "ติดตั้ง Employee Portal",
      text: "เปิดใช้ได้เร็วจากหน้าจอหลัก เหมือนแอปทั่วไป",
      primaryLabel: "ติดตั้ง",
      onPrimary: promptInstall
    });
  }

  function showIOSPrompt() {
    showPrompt({
      type: "ios",
      key: KEYS.install,
      schedule: INSTALL_SNOOZE_DAYS,
      title: "เพิ่มลงหน้าจอโฮม",
      text: "ใช้งานได้สะดวกเหมือนแอป และเปิดรับแจ้งเตือนข่าวได้",
      primaryLabel: "ดูวิธี",
      onPrimary: () => {
        snooze(KEYS.install, INSTALL_SNOOZE_DAYS);
        openGuide("ios");
      }
    });
  }

  function showInAppBrowserPrompt() {
    showPrompt({
      type: "inapp",
      key: KEYS.install,
      schedule: INSTALL_SNOOZE_DAYS,
      title: "เปิดด้วย Safari หรือ Chrome",
      text: "เบราว์เซอร์ในแอป LINE/Facebook ติดตั้งแอปไม่ได้",
      primaryLabel: "ดูวิธี",
      onPrimary: () => {
        snooze(KEYS.install, INSTALL_SNOOZE_DAYS);
        openGuide("inapp");
      }
    });
  }

  async function promptInstall() {
    if (isStandalone) {
      toast("แอปนี้ติดตั้งไว้บนเครื่องแล้ว", "info");
      return;
    }

    if (deferredPrompt) {
      const promptEvent = deferredPrompt;
      deferredPrompt = null;
      updateInstallEntryPoints();
      try {
        promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome !== "accepted") {
          snooze(KEYS.install, INSTALL_SNOOZE_DAYS);
        }
      } catch (err) {
        console.warn("Install prompt failed:", err);
      }
      return;
    }

    if (isInAppBrowser) return openGuide("inapp");
    if (isIOS) return openGuide("ios");

    toast("ติดตั้งได้จากเมนูของเบราว์เซอร์ (⋮ แล้วเลือก ติดตั้งแอป / เพิ่มลงหน้าจอหลัก)", "info", 6000);
  }

  function injectInstallMenuItem() {
    const navLinks = document.getElementById("navLinks");
    if (!navLinks || document.getElementById("navInstallItem") || isStandalone) return;

    const li = document.createElement("li");
    li.id = "navInstallItem";
    li.className = "nav-install-item";
    li.innerHTML = '<a href="#" class="nav-link">📲 ติดตั้งแอปบนเครื่อง</a>';
    navLinks.appendChild(li);

    li.querySelector("a").addEventListener("click", (e) => {
      e.preventDefault();
      navLinks.classList.remove("show");
      promptInstall();
    });
  }

  function updateInstallEntryPoints() {
    const navBtn = document.getElementById("navBtnInstallPWA");
    if (navBtn) navBtn.style.display = (!isStandalone && deferredPrompt) ? "inline-flex" : "none";

    const item = document.getElementById("navInstallItem");
    if (item) {
      const available = !isStandalone && (Boolean(deferredPrompt) || isIOS || isInAppBrowser);
      item.classList.toggle("is-available", available);
    }
  }

  function closeGuide() {
    const modal = document.getElementById("pwaGuideModal");
    if (!modal) return;
    modal.classList.remove("show");
    document.body.style.overflow = "";
    setTimeout(() => modal.remove(), 250);
  }

  function openGuide(kind) {
    const old = document.getElementById("pwaGuideModal");
    if (old) old.remove();

    const isInApp = kind === "inapp";
    const title = isInApp ? "เปิดด้วยเบราว์เซอร์เพื่อติดตั้ง" : "ติดตั้งบน iPhone / iPad";
    const intro = isInApp
      ? "เบราว์เซอร์ในแอป LINE / Facebook ติดตั้งแอปไม่ได้ ให้เปิดหน้านี้ด้วย Safari หรือ Chrome ก่อน"
      : "ทำตามขั้นตอนนี้ใน Safari เพื่อเพิ่ม Employee Portal ลงหน้าจอโฮม";
    const steps = isInApp
      ? [
          "แตะปุ่ม <strong>⋯</strong> หรือ <strong>⋮</strong> ที่มุมจอ",
          "เลือก <strong>เปิดในเบราว์เซอร์</strong> (Open in browser)",
          "ในเบราว์เซอร์ที่เปิดขึ้น ให้ติดตั้งตามข้อความที่แสดง"
        ]
      : [
          "แตะปุ่ม <strong>แชร์</strong> 📤 (ด้านล่างของ Safari หรือมุมบนขวาบน iPad)",
          "เลื่อนลงแล้วเลือก <strong>เพิ่มไปยังหน้าจอโฮม</strong>",
          "กด <strong>เพิ่ม</strong> แล้วเปิดแอปจากหน้าจอโฮม จะเปิดรับแจ้งเตือนข่าวได้ (iOS 16.4 ขึ้นไป)"
        ];

    const modal = document.createElement("div");
    modal.id = "pwaGuideModal";
    modal.className = "modal-backdrop";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 440px;">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button type="button" class="modal-close" data-act="close" aria-label="ปิด">✕</button>
        </div>
        <div class="modal-body">
          <p class="pwa-guide-intro">${intro}</p>
          <ol class="pwa-steps">
            ${steps.map((s, i) => `<li><span class="pwa-step-num">${i + 1}</span><span>${s}</span></li>`).join("")}
          </ol>
        </div>
        <div class="modal-footer">
          ${isInApp ? '<button type="button" class="btn btn-secondary" data-act="copy">คัดลอกลิงก์</button>' : ""}
          <button type="button" class="btn btn-primary" data-act="close">เข้าใจแล้ว</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => modal.classList.add("show"));

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeGuide();
    });
    modal.querySelectorAll('[data-act="close"]').forEach((btn) => btn.addEventListener("click", closeGuide));

    const copyBtn = modal.querySelector('[data-act="copy"]');
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const link = window.location.href.split("#")[0];
        try {
          await navigator.clipboard.writeText(link);
          toast("คัดลอกลิงก์แล้ว นำไปเปิดใน Safari หรือ Chrome ได้เลย", "success");
        } catch (err) {
          toast("คัดลอกอัตโนมัติไม่ได้ กรุณากดค้างที่แถบที่อยู่เพื่อคัดลอก", "warning", 5000);
        }
      });
    }

    const onKey = (e) => {
      if (e.key === "Escape") {
        closeGuide();
        document.removeEventListener("keydown", onKey);
      }
    };
    document.addEventListener("keydown", onKey);
  }

  function isNotificationSupported() {
    return ("Notification" in window) && ("serviceWorker" in navigator);
  }

  function getNotificationPermission() {
    return isNotificationSupported() ? Notification.permission : "unsupported";
  }

  function canPromptNotifications() {
    if (!isNotificationSupported()) return false;
    if (Notification.permission !== "default") return false;
    if (!isStandalone) return false;
    if (!isLoggedIn()) return false;
    return !isSnoozed(KEYS.notif);
  }

  function showNotificationPrompt() {
    showPrompt({
      type: "notif",
      key: KEYS.notif,
      schedule: NOTIF_SNOOZE_DAYS,
      title: "รับแจ้งเตือนข่าวใหม่",
      text: "รู้ทันทีเมื่อมีประกาศสำคัญจากบริษัท",
      primaryLabel: "เปิดการแจ้งเตือน",
      onPrimary: requestNotificationPermission
    });
  }

  async function requestNotificationPermission() {
    if (!isNotificationSupported()) {
      toast("อุปกรณ์นี้ไม่รองรับการแจ้งเตือน (บน iPhone ต้องติดตั้งแอปลงหน้าจอโฮมก่อน)", "warning", 5000);
      return "unsupported";
    }

    try {
      const permission = await Notification.requestPermission();
      updateNotificationButtonUI(permission);

      if (permission === "granted") {
        toast("🔔 เปิดการแจ้งเตือนข่าวใหม่แล้ว", "success", 3500);
        checkNewNewsAndNotify();
        subscribeUserToPush();
      } else if (permission === "denied") {
        toast("การแจ้งเตือนถูกปิดไว้ เปิดใหม่ได้ในการตั้งค่าของเบราว์เซอร์/ระบบ", "warning", 5000);
      } else {
        snooze(KEYS.notif, NOTIF_SNOOZE_DAYS);
      }
      return permission;
    } catch (err) {
      console.warn("Failed to request notification permission:", err);
      return "denied";
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
    return output;
  }

  async function subscribeUserToPush() {
    if (!("serviceWorker" in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      let subscription = null;

      if ("pushManager" in reg) {
        subscription = await reg.pushManager.getSubscription();
        const vapidKey = (typeof CONFIG !== "undefined" && CONFIG.VAPID_PUBLIC_KEY) || null;
        if (!subscription && vapidKey) {
          try {
            subscription = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidKey)
            });
          } catch (subErr) {
            console.log("[PWA] PushManager subscribe note:", subErr.message);
          }
        }
      }

      if (typeof API !== "undefined" && API.savePushToken) {
        const user = (typeof Auth !== "undefined" && Auth.getUser()) || {};
        API.savePushToken({
          empId: user.employeeId || "GUEST",
          name: user.name || "Anonymous",
          subscription: subscription ? JSON.stringify(subscription) : "DEVICE_ALLOWED",
          userAgent: navigator.userAgent
        });
      }
    } catch (err) {
      console.log("[PWA] Push subscription info logged:", err.message);
    }
  }

  async function showSystemNotification(title, body, url, tag) {
    if (!isNotificationSupported() || Notification.permission !== "granted") return;

    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body: body || "",
        icon: "./assets/icons/icon-192.png",
        badge: "./assets/icons/favicon-32.png",
        tag: tag || "emp-portal-news",
        vibrate: [100, 50, 100],
        data: { url: url || "./index.html" }
      });
    } catch (err) {
      console.warn("Could not show notification:", err);
    }
  }

  function setupNotificationButton() {
    if (!isNotificationSupported()) return;

    const navUser = document.getElementById("navUser");
    if (!navUser || document.getElementById("btnNotificationNav")) return;

    const btn = document.createElement("button");
    btn.id = "btnNotificationNav";
    btn.className = "btn-notification-nav";
    btn.type = "button";
    btn.setAttribute("aria-label", "การแจ้งเตือนข่าวสาร");
    navUser.parentNode.insertBefore(btn, navUser);
    updateNotificationButtonUI(Notification.permission);

    btn.addEventListener("click", async () => {
      const perm = Notification.permission;
      if (perm === "granted") {
        toast("🔔 เปิดรับแจ้งเตือนอยู่แล้ว จะแจ้งเมื่อมีข่าวใหม่", "info", 3500);
      } else if (perm === "denied") {
        toast("การแจ้งเตือนถูกปิดไว้ กรุณาเปิดในการตั้งค่าของเบราว์เซอร์/แอปบนเครื่อง", "warning", 5000);
      } else {
        await requestNotificationPermission();
      }
    });
  }

  function updateNotificationButtonUI(permission) {
    const btn = document.getElementById("btnNotificationNav");
    if (!btn) return;

    if (permission === "granted") {
      btn.innerHTML = '<span>🔔</span><span class="notification-status-dot active"></span>';
      btn.title = "เปิดรับแจ้งเตือนข่าวใหม่อยู่";
    } else {
      btn.innerHTML = '<span>🔕</span><span class="notification-status-dot"></span>';
      btn.title = permission === "denied"
        ? "การแจ้งเตือนถูกปิดไว้ในตั้งค่าเครื่อง"
        : "กดเพื่อเปิดรับแจ้งเตือนข่าวใหม่";
    }
  }

  function announceNews(fresh) {
    const single = fresh.length === 1;
    const title = single ? "📢 ข่าวใหม่" : "📢 มีข่าวใหม่ " + fresh.length + " รายการ";
    const body = single
      ? fresh[0].title
      : fresh.slice(0, 3).map((n) => "• " + n.title).join("\n");
    const url = single ? "./index.html?newsId=" + encodeURIComponent(fresh[0].id) : "./index.html";

    if (document.visibilityState === "visible") {
      toast(single ? "📢 ข่าวใหม่: " + fresh[0].title : title, "info", 6000);
    } else {
      showSystemNotification(title, body, url, "emp-portal-news");
    }
  }

  async function checkNewNewsAndNotify() {
    if (!isNotificationSupported() || Notification.permission !== "granted") return;
    if (typeof API === "undefined") return;

    try {
      const res = await API.get("getNews");
      if (!res || !res.success || !Array.isArray(res.data)) return;

      const ids = res.data.map((n) => String(n.id));
      let seen = null;
      try { seen = JSON.parse(localStorage.getItem(KEYS.seenNews) || "null"); } catch (e) {}
      if (!Array.isArray(seen)) {
        try { localStorage.setItem(KEYS.seenNews, JSON.stringify(ids.slice(0, 200))); } catch (e) {}
        return;
      }

      const fresh = res.data.filter((n) => seen.indexOf(String(n.id)) === -1);
      const merged = ids.concat(seen).filter((v, i, a) => a.indexOf(v) === i).slice(0, 200);
      try { localStorage.setItem(KEYS.seenNews, JSON.stringify(merged)); } catch (e) {}

      if (fresh.length > 0) announceNews(fresh);
    } catch (e) {
    }
  }

  function startNewsWatcher() {
    checkNewNewsAndNotify();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkNewNewsAndNotify();
    });
    setInterval(checkNewNewsAndNotify, NEWS_POLL_MS);
  }

  return {
    init,
    promptInstall,
    isStandalone: () => isStandalone,
    isNotificationSupported,
    getNotificationPermission,
    requestNotificationPermission,
    sendLocalTestNotification: (title, body, url) => showSystemNotification(title, body, url),
    checkNewNewsAndNotify
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  PWA.init();
});