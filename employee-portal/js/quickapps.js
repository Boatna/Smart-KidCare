document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("quickAppsGrid");
  if (!grid) return;

  const MAX_ITEMS = 8;

  const SVG = (inner) =>
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';

  function iconFor(key) {
    const k = String(key || "").toLowerCase();
    if (k.includes("calendar") || k.includes("leave"))
      return SVG('<rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>');
    if (k.includes("user") || k.includes("meeting"))
      return SVG('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>');
    if (k.includes("shield") || k.includes("visitor"))
      return SVG('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>');
    if (k.includes("check") || k.includes("quality"))
      return SVG('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>');
    if (k.includes("chart") || k.includes("dashboard"))
      return SVG('<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>');
    if (k.includes("database") || k.includes("sap") || k.includes("erp") || k.includes("finance"))
      return SVG('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>');
    if (k.includes("cog") || k.includes("mes") || k.includes("production"))
      return SVG('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/>');
    if (k.includes("file") || k.includes("form"))
      return SVG('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>');
    return SVG('<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>');
  }

  function showEmpty(html) {
    grid.innerHTML = '<div class="quick-apps-empty">' + html + '</div>';
  }

  function render(list) {
    if (!list.length) {
      showEmpty("<p>ยังไม่มีระบบงานที่เปิดใช้งาน</p>");
      return;
    }
    grid.innerHTML = list.slice(0, MAX_ITEMS).map((app) => {
      const isExternal = app.type === "External" || (app.url && /^https?:/i.test(app.url));
      const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
      return (
        '<a class="quick-app" href="' + Utils.escapeHtml(Utils.safeUrl(app.url)) + '"' + target +
        ' title="' + Utils.escapeHtml(app.description || app.appName) + '">' +
          '<span class="quick-app-icon">' + iconFor(app.icon || app.category) + '</span>' +
          '<span class="quick-app-name">' + Utils.escapeHtml(app.appName) + '</span>' +
        '</a>'
      );
    }).join("");
  }

  async function load() {
    if (!Auth.isLoggedIn()) {
      showEmpty('<p>เข้าสู่ระบบเพื่อใช้ทางลัดไปยังระบบงานของคุณ</p><a class="btn btn-primary btn-sm" href="login.html">เข้าสู่ระบบ</a>');
      return;
    }

    grid.innerHTML = '<div class="skeleton quick-app-skeleton"></div>'.repeat(4);

    try {
      const res = await API.get("getApps");
      if (res && res.success && Array.isArray(res.data)) {
        render(res.data);
      } else {
        showEmpty("<p>" + Utils.escapeHtml((res && res.message) || "ไม่สามารถโหลดระบบงานได้") + "</p>");
      }
    } catch (e) {
      showEmpty("<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>");
    }
  }

  load();
});