/**
 * ==============================================================================
 * PROGRESSIVE WEB APP (PWA) INSTALL & NOTIFICATION CONTROLLER
 * ==============================================================================
 * - ลงทะเบียน Service Worker, ปุ่ม/แบนเนอร์ติดตั้งแอป, วิธีติดตั้งบน iOS
 * - ขอสิทธิ์แจ้งเตือนผ่านปุ่มที่ผู้ใช้กดเอง (user gesture) เฉพาะเมื่อเปิดจากแอปที่ติดตั้งแล้ว
 * - ตรวจข่าวใหม่ตอนเปิดแอป/กลับมาที่แอป/ทุก 5 นาที แล้วแจ้งเตือนในเครื่อง
 *   (ถ้าต้องการ push ตอนปิดแอป ต้องต่อ OneSignal/FCM เพิ่ม — ดูคำอธิบายในแชท)
 */

const PWA = (function() {
  let deferredPrompt = null;
  const isIOS = (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  const SEEN_NEWS_KEY = "emp_seen_news_ids";
  const PROMO_UNTIL_KEY = "notif_promo_until";
  const NEWS_POLL_MS = 5 * 60 * 1000;

  function init() {
    registerServiceWorker();
    setupInstallListeners();
    injectInstallUI();
    setupNotificationButton();
    setTimeout(showNotificationPromo, 1500);
    startNewsWatcher();
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      const doRegister = () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('ServiceWorker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('ServiceWorker registration failed:', err);
          });
      };

      if (document.readyState === 'complete') {
        doRegister();
      } else {
        window.addEventListener('load', doRegister);
      }
    }
  }

  function setupInstallListeners() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showInstallPromotion();
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      hideInstallPromotion();
      if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast("🎉 ติดตั้งแอปพลิเคชันลงบนเครื่องเรียบร้อยแล้ว! เปิดแอปจากหน้าจอหลักเพื่อเปิดรับการแจ้งเตือนข่าวใหม่", "success", 6000);
      }
      // หมายเหตุ: ไม่ขอสิทธิ์แจ้งเตือนอัตโนมัติที่นี่ เพราะ iOS/Chrome ต้องการให้ผู้ใช้กดปุ่มเอง
      // แบนเนอร์ขอสิทธิ์จะแสดงเมื่อผู้ใช้เปิดแอปที่ติดตั้งแล้ว (showNotificationPromo)
    });

    if (isIOS && !isStandalone) {
      setTimeout(() => {
        showIOSInstallPromotion();
      }, 2000);
    }
  }

  function injectInstallUI() {
    if (!document.getElementById('pwaInstallBanner') && !isStandalone) {
      const banner = document.createElement('div');
      banner.id = 'pwaInstallBanner';
      banner.className = 'pwa-install-banner animate-slide-up';
      banner.style.display = 'none';

      banner.innerHTML = `
        <div class="pwa-banner-content">
          <img src="assets/icons/app-icon.png" alt="BW App Icon" class="pwa-banner-icon">
          <div class="pwa-banner-text">
            <strong>ติดตั้ง Employee Portal</strong>
            <span>เข้าถึงได้รวดเร็วแบบแอปบนมือถือและ Desktop</span>
          </div>
        </div>
        <div class="pwa-banner-actions">
          <button id="pwaBtnDismiss" class="btn btn-secondary btn-sm" aria-label="Close">ไว้ทีหลัง</button>
          <button id="pwaBtnInstall" class="btn btn-primary btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ติดตั้งเลย
          </button>
        </div>
      `;

      document.body.appendChild(banner);

      document.getElementById('pwaBtnInstall').addEventListener('click', promptInstall);
      document.getElementById('pwaBtnDismiss').addEventListener('click', () => {
        banner.style.display = 'none';
        try { sessionStorage.setItem('pwa_prompt_dismissed', 'true'); } catch (e) {}
      });
    }

    if (!document.getElementById('iosInstallModal')) {
      const iosModal = document.createElement('div');
      iosModal.id = 'iosInstallModal';
      iosModal.className = 'modal-backdrop';
      iosModal.innerHTML = `
        <div class="modal-content" style="max-width: 440px; text-align: center;">
          <div class="modal-header">
            <h3 class="modal-title">วิธีติดตั้งบน iPhone / iPad</h3>
            <button class="modal-close" id="btnDismissIosModal">✕</button>
          </div>
          <div class="modal-body" style="padding: 1.5rem;">
            <img src="assets/icons/app-icon.png" alt="App Icon" style="width: 80px; height: 80px; border-radius: 18px; margin: 0 auto 1.25rem auto; box-shadow: 0 8px 16px rgba(0,102,204,0.25);">
            <p style="font-size: 1rem; color: var(--text-primary); margin-bottom: 1.25rem;">
              ติดตั้ง <strong>Employee Portal</strong> บนหน้าจอโฮมเพื่อการใช้งานที่สะดวกเหมือนแอปพลิเคชันทั่วไป:
            </p>
            <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; text-align: left; line-height: 1.8; font-size: 0.95rem;">
              1. แตะปุ่ม <strong>แชร์ (Share)</strong> <span style="font-size: 1.2rem;">📤</span> ด้านล่างของ Safari<br>
              2. เลื่อนลงแล้วเลือก <strong>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</strong> ➕<br>
              3. กด <strong>"เพิ่ม" (Add)</strong> มุมบนขวา<br>
              4. เปิดแอปจากหน้าจอโฮม แล้วกด <strong>"เปิดการแจ้งเตือน"</strong> เพื่อรับข่าวใหม่
            </div>
          </div>
          <div class="modal-footer" style="justify-content: center;">
            <button class="btn btn-primary" id="btnOkIosModal" style="width: 100%;">เข้าใจแล้ว</button>
          </div>
        </div>
      `;
      document.body.appendChild(iosModal);

      const closeIosModal = () => iosModal.classList.remove('show');
      document.getElementById('btnDismissIosModal').addEventListener('click', closeIosModal);
      document.getElementById('btnOkIosModal').addEventListener('click', closeIosModal);
    }
  }

  function showInstallPromotion() {
    if (sessionStorage.getItem('pwa_prompt_dismissed') === 'true') return;

    const banner = document.getElementById('pwaInstallBanner');
    if (banner) banner.style.display = 'flex';

    const navBtn = document.getElementById('navBtnInstallPWA');
    if (navBtn) navBtn.style.display = 'inline-flex';
  }

  function hideInstallPromotion() {
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) banner.style.display = 'none';

    const navBtn = document.getElementById('navBtnInstallPWA');
    if (navBtn) navBtn.style.display = 'none';
  }

  function showIOSInstallPromotion() {
    if (sessionStorage.getItem('pwa_prompt_dismissed') === 'true') return;
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) {
      banner.style.display = 'flex';
      const btn = document.getElementById('pwaBtnInstall');
      if (btn) {
        btn.innerHTML = `วิธีติดตั้ง ↗`;
        btn.onclick = () => {
          const modal = document.getElementById('iosInstallModal');
          if (modal) modal.classList.add('show');
        };
      }
    }
  }

  async function promptInstall() {
    if (!deferredPrompt) {
      if (isIOS) {
        const modal = document.getElementById('iosInstallModal');
        if (modal) modal.classList.add('show');
        return;
      }
      if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast("ระบบพร้อมใช้งานแล้วบนเบราว์เซอร์นี้ หรือคุณได้ติดตั้งแอปไว้แล้ว", "info");
      }
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    if (outcome === 'accepted') {
      deferredPrompt = null;
      hideInstallPromotion();
    }
  }

  // ==============================================================================
  // PUSH / LOCAL NOTIFICATION MANAGEMENT
  // ==============================================================================
  function isNotificationSupported() {
    return ("Notification" in window) && ("serviceWorker" in navigator);
  }

  function getNotificationPermission() {
    if (!isNotificationSupported()) return "unsupported";
    return Notification.permission; // "default", "granted", "denied"
  }

  /** ต้องเรียกจากการกดปุ่มของผู้ใช้เท่านั้น (iOS/Android ถึงจะแสดงหน้าต่างขอสิทธิ์) */
  async function requestNotificationPermission() {
    if (!isNotificationSupported()) {
      if (typeof Utils !== "undefined" && Utils.showToast) {
        Utils.showToast("อุปกรณ์นี้ไม่รองรับการแจ้งเตือน (บน iPhone ต้องติดตั้งแอปลงหน้าจอโฮมก่อน)", "warning", 5000);
      }
      return "unsupported";
    }

    try {
      const permission = await Notification.requestPermission();
      updateNotificationButtonUI(permission);

      if (permission === "granted") {
        if (typeof Utils !== "undefined" && Utils.showToast) {
          Utils.showToast("🔔 เปิดรับการแจ้งเตือนข่าวสารใหม่เรียบร้อยแล้ว!", "success", 4000);
        }

        sendLocalTestNotification(
          "🔔 เปิดการแจ้งเตือนสำเร็จ!",
          "คุณจะได้รับการแจ้งเตือนเมื่อมีข่าวสารและประกาศใหม่จาก Employee Portal"
        );

        // จำรายการข่าวปัจจุบันไว้ จะได้แจ้งเฉพาะข่าวที่ใหม่กว่านี้
        checkNewNewsAndNotify();
        subscribeUserToPush();
      } else if (permission === "denied") {
        if (typeof Utils !== "undefined" && Utils.showToast) {
          Utils.showToast("คุณได้ปฏิเสธการแจ้งเตือน (สามารถเปิดใหม่ได้ในการตั้งค่าเบราว์เซอร์/ระบบ)", "warning", 4500);
        }
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

        // ต้องมี VAPID Public Key ใน CONFIG.VAPID_PUBLIC_KEY จึงจะสมัคร Web Push ได้จริง
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

  async function sendLocalTestNotification(title, body, url) {
    if (!isNotificationSupported() || Notification.permission !== "granted") {
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title || "📢 ทดสอบการแจ้งเตือน", {
        body: body || "นี่คือตัวอย่างการแจ้งเตือนข่าวสารจาก Employee Portal",
        icon: "./assets/icons/icon-192.png",
        badge: "./assets/icons/favicon-32.png",
        vibrate: [100, 50, 100],
        data: {
          url: url || "./index.html"
        }
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
    btn.title = "ตั้งค่าการแจ้งเตือนข่าวสาร";

    const currentPerm = getNotificationPermission();
    btn.innerHTML = currentPerm === "granted"
      ? `<span>🔔</span><span class="notification-status-dot active"></span>`
      : `<span>🔕</span><span class="notification-status-dot"></span>`;

    btn.addEventListener("click", async () => {
      if (Notification.permission === "granted") {
        if (typeof Utils !== "undefined" && Utils.showToast) {
          Utils.showToast("🔔 การแจ้งเตือนเปิดใช้งานอยู่แล้วบนเครื่องนี้ (กำลังส่งการแจ้งเตือนทดสอบ...)", "info", 3500);
        }
        sendLocalTestNotification("🔔 ระบบแจ้งเตือนพร้อมใช้งาน!", "คุณจะได้รับการแจ้งเตือนเมื่อมีข่าวสารใหม่ในองค์กร");
      } else if (Notification.permission === "denied") {
        if (typeof Utils !== "undefined" && Utils.showToast) {
          Utils.showToast("การแจ้งเตือนถูกปิดไว้ กรุณาเปิดในการตั้งค่าของเบราว์เซอร์/แอปบนเครื่อง", "warning", 5000);
        }
      } else {
        await requestNotificationPermission();
      }
    });

    navUser.parentNode.insertBefore(btn, navUser);
  }

  function updateNotificationButtonUI(permission) {
    const btn = document.getElementById("btnNotificationNav");
    if (!btn) return;

    if (permission === "granted") {
      btn.innerHTML = `<span>🔔</span><span class="notification-status-dot active"></span>`;
      btn.title = "เปิดรับการแจ้งเตือนแล้ว (กดเพื่อทดสอบส่งแจ้งเตือน)";
    } else {
      btn.innerHTML = `<span>🔕</span><span class="notification-status-dot"></span>`;
      btn.title = "กดเพื่อเปิดรับการแจ้งเตือนข่าวสารใหม่";
    }
  }

  /**
   * แบนเนอร์ชวนเปิดแจ้งเตือน: แสดงเฉพาะเมื่อ
   *  - เปิดจากแอปที่ติดตั้งแล้ว (standalone)  - ล็อกอินแล้ว  - ยังไม่ได้ตอบสิทธิ์ (default)
   * ผู้ใช้ต้องกดปุ่มเอง (user gesture) จึงจะขอสิทธิ์ได้ทั้ง iOS และ Android
   */
  function showNotificationPromo() {
    if (!isNotificationSupported() || Notification.permission !== "default") return;
    if (!isStandalone) return;
    if (typeof Auth !== "undefined" && !Auth.isLoggedIn()) return;
    try {
      if (Number(localStorage.getItem(PROMO_UNTIL_KEY) || 0) > Date.now()) return;
    } catch (e) {}
    if (document.getElementById("notifPromoBanner")) return;

    const banner = document.createElement("div");
    banner.id = "notifPromoBanner";
    banner.className = "pwa-install-banner animate-slide-up";
    banner.innerHTML = `
      <div class="pwa-banner-content">
        <img src="assets/icons/app-icon.png" alt="" class="pwa-banner-icon">
        <div class="pwa-banner-text">
          <strong>เปิดรับแจ้งเตือนข่าวใหม่</strong>
          <span>รู้ทันทีเมื่อมีประกาศสำคัญจากบริษัท</span>
        </div>
      </div>
      <div class="pwa-banner-actions">
        <button type="button" class="btn btn-secondary btn-sm" id="notifPromoLater">ไว้ทีหลัง</button>
        <button type="button" class="btn btn-primary btn-sm" id="notifPromoAllow">🔔 เปิดการแจ้งเตือน</button>
      </div>
    `;
    document.body.appendChild(banner);

    document.getElementById("notifPromoAllow").addEventListener("click", async () => {
      banner.remove();
      await requestNotificationPermission();
    });
    document.getElementById("notifPromoLater").addEventListener("click", () => {
      banner.remove();
      try { localStorage.setItem(PROMO_UNTIL_KEY, String(Date.now() + 3 * 24 * 60 * 60 * 1000)); } catch (e) {}
    });
  }

  /** เช็กข่าวใหม่แล้วแจ้งเตือนในเครื่อง (ทำงานเมื่อแอปเปิดอยู่/กลับมาที่แอป) */
  async function checkNewNewsAndNotify() {
    if (!isNotificationSupported() || Notification.permission !== "granted") return;
    if (typeof API === "undefined") return;

    try {
      const res = await API.get("getNews");
      if (!res || !res.success || !Array.isArray(res.data)) return;

      const ids = res.data.map(n => String(n.id));
      let seen = null;
      try { seen = JSON.parse(localStorage.getItem(SEEN_NEWS_KEY) || "null"); } catch (e) {}

      // เปิดครั้งแรก: จดจำข่าวทั้งหมดไว้เฉยๆ ไม่ยิงแจ้งเตือนรัว
      if (!Array.isArray(seen)) {
        localStorage.setItem(SEEN_NEWS_KEY, JSON.stringify(ids.slice(0, 200)));
        return;
      }

      const fresh = res.data.filter(n => seen.indexOf(String(n.id)) === -1).slice(0, 3);
      const merged = ids.concat(seen).filter((v, i, a) => a.indexOf(v) === i).slice(0, 200);
      localStorage.setItem(SEEN_NEWS_KEY, JSON.stringify(merged));

      for (const n of fresh) {
        await sendLocalTestNotification(
          "📢 ข่าวใหม่: " + n.title,
          String(n.detail || "").slice(0, 100),
          "./index.html?newsId=" + encodeURIComponent(n.id)
        );
      }
    } catch (e) {
      // เงียบไว้ ไม่รบกวนผู้ใช้
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
    sendLocalTestNotification,
    checkNewNewsAndNotify
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  PWA.init();
});