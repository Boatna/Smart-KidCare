document.addEventListener("DOMContentLoaded", () => {
  if (!Auth.requireAuth("login.html")) {
    return;
  }

  Utils.setupNavbar();

  let appsList = [];
  let currentCategory = "ALL";
  let searchQuery = "";

  const appsGrid = document.getElementById("appsGrid");
  const searchInput = document.getElementById("searchApps");
  const categoryFilters = document.querySelectorAll(".filter-btn");

  async function loadApps() {
    appsGrid.innerHTML = Utils.renderAppsSkeletons(8);

    try {
      const res = await API.get("getApps");

      if (res.success && Array.isArray(res.data)) {
        appsList = res.data;
        renderApps();
      } else {
        showError(res.message || "ไม่สามารถดึงข้อมูลแอปพลิเคชันได้");
      }
    } catch (e) {
      showError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    }
  }

  function renderApps() {
    let filtered = appsList.filter(app => {
      const matchesCat = currentCategory === "ALL" || (app.category && app.category.trim().toUpperCase() === currentCategory.trim().toUpperCase());
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (app.appName && app.appName.toLowerCase().includes(q)) ||
        (app.description && app.description.toLowerCase().includes(q));

      return matchesCat && matchesSearch;
    });

    if (filtered.length === 0) {
      appsGrid.innerHTML = `
        <div class="empty-state animate-fade-in" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">📱</div>
          <h3>ไม่พบแอปพลิเคชัน</h3>
          <p class="empty-state-text">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น</p>
        </div>
      `;
      return;
    }

    appsGrid.innerHTML = filtered.map((app, index) => {
      const isExternal = app.type === "External" || (app.url && app.url.startsWith("http"));
      const targetAttr = isExternal ? 'target="_blank" rel="noopener noreferrer"' : '';
      const catBadge = getCategoryBadgeClass(app.category);
      const iconSvg = getAppIconSvg(app.icon || app.category);
      const delay = Math.min(index * 0.05, 0.4);

      return `
        <a href="${Utils.escapeHtml(Utils.safeUrl(app.url))}" ${targetAttr} class="app-card animate-slide-up" style="animation-delay: ${delay}s;">
          <div class="app-card-top">
            <div class="app-icon-box">
              ${iconSvg}
            </div>
            <span class="badge ${catBadge}">${Utils.escapeHtml(app.category || 'App')}</span>
          </div>
          <h3 class="app-card-title">${Utils.escapeHtml(app.appName)}</h3>
          <p class="app-card-desc">${Utils.escapeHtml(app.description)}</p>
          <div class="app-card-footer">
            <span class="app-type-tag">
              ${isExternal ? '🔗 ลิงก์ภายนอก' : '🏢 ระบบภายใน'}
            </span>
            <span class="app-link-btn">
              เปิดใช้งาน ${Utils.getIcon('externalLink')}
            </span>
          </div>
        </a>
      `;
    }).join("");
  }

  function getCategoryBadgeClass(cat) {
    switch (String(cat).toUpperCase()) {
      case "HR": return "badge-primary";
      case "PRODUCTION": return "badge-warning";
      case "FINANCE": return "badge-success";
      case "QUALITY": return "badge-primary";
      case "DASHBOARD": return "badge-warning";
      case "EXTERNAL LINK": return "badge-secondary";
      default: return "badge-secondary";
    }
  }

  function getAppIconSvg(iconKey) {
    const k = String(iconKey).toLowerCase();
    if (k.includes("calendar") || k.includes("leave")) {
      return '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
    }
    if (k.includes("user") || k.includes("meeting")) {
      return '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>';
    }
    if (k.includes("shield") || k.includes("visitor")) {
      return '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
    }
    if (k.includes("check") || k.includes("quality")) {
      return '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';
    }
    if (k.includes("chart") || k.includes("dashboard")) {
      return '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>';
    }
    if (k.includes("database") || k.includes("sap") || k.includes("erp") || k.includes("finance")) {
      return '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>';
    }
    if (k.includes("cog") || k.includes("mes") || k.includes("production")) {
      return '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/></svg>';
    }
    return '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>';
  }

  function showError(msg) {
    appsGrid.innerHTML = `
      <div class="empty-state animate-fade-in" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">⚠️</div>
        <h3>เกิดข้อผิดพลาด</h3>
        <p class="empty-state-text">${Utils.escapeHtml(msg)}</p>
        <button class="btn btn-secondary btn-sm" onclick="location.reload()" style="margin-top: 1rem;">ลองใหม่อีกครั้ง</button>
      </div>
    `;
  }

  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchQuery = e.target.value;
        renderApps();
      }, 150);
    });
  }

  categoryFilters.forEach(btn => {
    btn.addEventListener("click", () => {
      categoryFilters.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.getAttribute("data-category") || "ALL";
      renderApps();
    });
  });

  loadApps();
});