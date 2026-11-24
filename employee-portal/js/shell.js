/**
 * ==============================================================================
 * APP SHELL (Responsive Navigation) — Employee Portal
 * - สร้าง Sidebar จากเมนูเดิม: Desktop = เต็ม, Tablet = ไอคอนขยายได้, Mobile = Drawer
 * - สร้าง Bottom Navigation สำหรับมือถือ
 * - ใส่ data-label ให้ตาราง .data-table เพื่อแปลงเป็น Card List บนมือถือ
 * โหลดเป็นสคริปต์ "ตัวสุดท้าย" ของแต่ละหน้า (index, apps, contact, admin)
 * ==============================================================================
 */
(function () {
  "use strict";

  /* ---------- ตั้งค่าเมนู ---------- */
  const NAV_ITEMS = [
    { href: "index.html",   label: "ข่าวสารและประกาศ",        short: "หน้าหลัก",  icon: "home" },
    { href: "apps.html",    label: "ระบบและแอปพลิเคชัน",      short: "ระบบงาน",  icon: "grid" },
    { href: "contact.html", label: "ติดต่อสอบถาม/แจ้งปัญหา", short: "แจ้งปัญหา", icon: "chat" }
  ];
  const ADMIN_ITEM = { href: "admin.html", label: "แผงควบคุมแอดมิน", short: "แอดมิน", icon: "settings" };

  // เมนูลัดเพิ่มเติม (แสดงใน Sidebar/Drawer) เช่น ลงเวลา / ลางาน / สลิปเงินเดือน
  // ตัวอย่าง: { href: "modules/leave/index.html", label: "ลางาน", icon: "calendar" }
  // icon ที่ใช้ได้: home grid chat settings calendar clock file wallet
  const EXTRA_ITEMS = [];

  const svg = (p) => '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + "</svg>";
  const ICONS = {
    home: svg('<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>'),
    grid: svg('<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>'),
    chat: svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
    settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
    calendar: svg('<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
    clock: svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
    file: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>'),
    wallet: svg('<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>'),
    menu: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    install: svg('<path d="M12 3v12m0 0-4-4m4 4 4-4"/><path d="M5 21h14"/>'),
    logout: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>')
  };
  const icon = (k) => ICONS[k] || ICONS.grid;
  const esc = (s) => (window.Utils && Utils.escapeHtml) ? Utils.escapeHtml(s) : String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const mqMobile = window.matchMedia("(max-width: 767px)");
  const mqTablet = window.matchMedia("(min-width: 768px) and (max-width: 1024px)");
  const COLLAPSE_KEY = "emp_sidebar_collapsed";

  function init() {
    const navbar = document.querySelector(".navbar");
    if (!navbar || document.body.classList.contains("has-shell")) return;

    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const user = (window.Auth && Auth.getUser && Auth.getUser()) || null;
    const isAdmin = Boolean(window.Auth && Auth.isAdmin && Auth.isAdmin());
    const items = NAV_ITEMS.concat(isAdmin ? [ADMIN_ITEM] : []);
    const isActive = (it) => String(it.href).toLowerCase() === page;
    const current = items.find(isActive);

    document.body.classList.add("has-shell");

    /* ----- ชื่อหน้าใน Top Header (แท็บเล็ต/คอมพิวเตอร์) ----- */
    const container = navbar.querySelector(".nav-container");
    const brand = navbar.querySelector(".brand");
    if (container && brand) {
      const title = document.createElement("div");
      title.className = "header-title";
      title.textContent = current ? current.label : "Employee Portal";
      brand.after(title);
    }

    /* ----- Sidebar ----- */
    const linkHtml = (it) =>
      '<li><a class="sb-link' + (isActive(it) ? " active" : "") + '" href="' + esc(it.href) + '" title="' + esc(it.label) + '"' +
      (isActive(it) ? ' aria-current="page"' : "") + (it.external ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" +
      icon(it.icon) + '<span class="sb-label">' + esc(it.label) + "</span></a></li>";

    const showInstall = !(window.PWA && PWA.isStandalone && PWA.isStandalone());
    const userHtml = user
      ? '<div class="sb-user"><div class="avatar">' + esc((user.name || "U").charAt(0).toUpperCase()) + "</div>" +
        '<div class="sb-user-info"><span class="sb-user-name">' + esc(user.name) + "</span>" +
        '<span class="sb-user-role">' + esc(user.position || user.role || "Employee") + (user.department ? " · " + esc(user.department) : "") + "</span></div></div>" +
        '<button type="button" class="sb-link" data-act="logout" title="ออกจากระบบ">' + icon("logout") + '<span class="sb-label">ออกจากระบบ</span></button>'
      : '<a class="sb-link" href="login.html" title="เข้าสู่ระบบ">' + icon("logout") + '<span class="sb-label">เข้าสู่ระบบ</span></a>';

    const aside = document.createElement("aside");
    aside.className = "app-sidebar";
    aside.id = "appSidebar";
    aside.setAttribute("aria-label", "เมนูหลัก");
    aside.innerHTML =
      '<a class="sb-brand" href="index.html"><img src="assets/icons/app-icon.png" alt=""><span class="sb-brand-text">Employee Portal</span></a>' +
      '<ul class="sb-nav">' + items.map(linkHtml).join("") + EXTRA_ITEMS.map(linkHtml).join("") +
      (showInstall ? '<li><button type="button" class="sb-link" data-act="install" title="ติดตั้งแอปบนเครื่อง">' + icon("install") + '<span class="sb-label">ติดตั้งแอปบนเครื่อง</span></button></li>' : "") +
      "</ul>" +
      '<div class="sb-foot">' + userHtml + "</div>";

    const scrim = document.createElement("div");
    scrim.className = "app-scrim";

    /* ----- Bottom Navigation (มือถือ) ----- */
    const bottom = document.createElement("nav");
    bottom.className = "bottom-nav";
    bottom.setAttribute("aria-label", "เมนูด่วน");
    bottom.innerHTML =
      items.map((it) =>
        '<a class="bn-item' + (isActive(it) ? " active" : "") + '" href="' + esc(it.href) + '"' + (isActive(it) ? ' aria-current="page"' : "") + ">" +
        icon(it.icon) + "<span>" + esc(it.short) + "</span></a>").join("") +
      '<button type="button" class="bn-item" data-act="menu" aria-controls="appSidebar" aria-expanded="false">' + icon("menu") + "<span>เมนู</span></button>";

    document.body.append(aside, scrim, bottom);

    /* ----- เปิด/ปิดเมนู ----- */
    const toggleBtn = document.getElementById("mobileToggle");
    if (toggleBtn) { toggleBtn.setAttribute("aria-controls", "appSidebar"); toggleBtn.setAttribute("aria-expanded", "false"); }

    // Desktop: ย่อ/ขยาย Sidebar และจำค่าไว้
    function setCollapsed(on, save) {
      document.body.classList.toggle("sb-collapsed", on);
      if (toggleBtn) toggleBtn.setAttribute("aria-expanded", String(!on));
      if (save) { try { localStorage.setItem(COLLAPSE_KEY, on ? "1" : "0"); } catch (e) {} }
    }
    try { if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true, false); } catch (e) {}

    function setOpen(open) {
      const cls = mqMobile.matches ? "open" : (mqTablet.matches ? "expanded" : null);
      aside.classList.remove("open", "expanded");
      if (cls && open) aside.classList.add(cls);
      const active = Boolean(cls && open);
      scrim.classList.toggle("show", active);
      document.body.style.overflow = (active && mqMobile.matches) ? "hidden" : "";
      [toggleBtn, bottom.querySelector('[data-act="menu"]')].forEach((b) => b && b.setAttribute("aria-expanded", String(active)));
    }
    const isOpen = () => aside.classList.contains("open") || aside.classList.contains("expanded");
    const toggle = () => {
      if (!mqMobile.matches && !mqTablet.matches) { setCollapsed(!document.body.classList.contains("sb-collapsed"), true); return; }
      setOpen(!isOpen());
    };

    if (toggleBtn) toggleBtn.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
    bottom.querySelector('[data-act="menu"]').addEventListener("click", toggle);
    scrim.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
    [mqMobile, mqTablet].forEach((mq) => (mq.addEventListener ? mq.addEventListener("change", () => setOpen(false)) : mq.addListener(() => setOpen(false))));

    aside.addEventListener("click", (e) => {
      const link = e.target.closest("a.sb-link");
      if (link) { setOpen(false); return; }
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      setOpen(false);
      if (btn.dataset.act === "logout" && window.Auth) Auth.logout();
      if (btn.dataset.act === "install" && window.PWA) PWA.promptInstall();
    });

    labelTables();
  }

  /* ---------- ตาราง → Card List บนมือถือ ---------- */
  function labelTables() {
    document.querySelectorAll("table.data-table").forEach((table) => {
      const body = table.tBodies[0];
      if (!body) return;
      const heads = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent.trim());
      const apply = () => {
        body.querySelectorAll(":scope > tr").forEach((tr) => {
          if (tr.children.length !== heads.length) return;      // แถว empty-state (colspan) ไม่ใส่ label
          Array.from(tr.children).forEach((td, i) => td.setAttribute("data-label", heads[i]));
        });
      };
      apply();
      new MutationObserver(apply).observe(body, { childList: true });   // แถวที่ถูกเรนเดอร์ใหม่ภายหลัง
    });
  }

  /* ปีลิขสิทธิ์ใน Footer ให้เป็นปีปัจจุบันอัตโนมัติ (เดิมเขียนตายตัวเป็น 2027) */
  function setFooterYear() {
    const y = new Date().getFullYear();
    document.querySelectorAll(".footer p").forEach((p) => {
      p.textContent = p.textContent.replace(/\u00A9\s*\d{4}/, "\u00A9 " + y);
    });
  }

  function boot() { init(); setFooterYear(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();