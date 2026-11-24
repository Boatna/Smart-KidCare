const Utils = (function() {
  const ICONS = {
    newspaper: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>',
    grid: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
    phone: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    shield: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    logOut: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>',
    search: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    calendar: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
    externalLink: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>',
    checkCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    alertCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
    close: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    users: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    edit: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
    trash: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
    key: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 2-2 2m-1.5 1.5L16 7l-1.5-1.5M7 17a5 5 0 1 1 7.07-7.07l6.43 6.43a2 2 0 0 1 0 2.83l-.59.59a2 2 0 0 1-2.83 0L15 17.75"/><circle cx="7.5" cy="16.5" r="1.5"/></svg>',
    power: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" x2="12" y1="2" y2="12"/></svg>',
    plus: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    arrowUp: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>',
    youtube: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#ef4444"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="white"/></svg>',
    play: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    chevronLeft: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    chevronRight: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>'
  };

  function getIcon(name) {
    return ICONS[name] || ICONS.grid;
  }

  function escapeHtml(str) {
    if (!str && str !== 0) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function parseDate(val) {
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    if (typeof val === "number") return new Date(val);

    const s = String(val || "").trim();
    if (!s) return null;
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
      return new Date(
        Number(m[1]), Number(m[2]) - 1, Number(m[3]),
        Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0)
      );
    }

    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function safeUrl(url) {
    const s = String(url || "").trim();
    if (!s) return "";
    const m = s.match(/^([a-z][a-z0-9+.\-]*):/i);
    if (m && ["http", "https"].indexOf(m[1].toLowerCase()) === -1) return "#";
    return s;
  }

  function formatDate(val) {
    if (!val) return "-";
    const d = parseDate(val);
    if (!d) return String(val);
    const day = String(d.getDate()).padStart(2, "0");
    const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const month = monthNames[d.getMonth()] || "";
    const year = d.getFullYear() + 543; // Thai Buddhist Era
    return `${day} ${month} ${year}`;
  }

  function formatDateTime(val) {
    if (!val) return "-";
    const d = parseDate(val);
    if (!d) return String(val);
    const day = String(d.getDate()).padStart(2, "0");
    const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const month = monthNames[d.getMonth()] || "";
    const year = d.getFullYear() + 543;
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year} ${hours}:${mins} น.`;
  }

  function isToday(val) {
    if (!val) return false;
    const d = parseDate(val);
    if (!d) return false;
    const today = new Date();
    return d.getFullYear() === today.getFullYear() &&
           d.getMonth() === today.getMonth() &&
           d.getDate() === today.getDate();
  }

  function extractYouTubeId(url) {
    if (!url) return "";
    const str = String(url).trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = str.match(regExp);
    return (match && match[1]) ? match[1] : "";
  }

  function getYouTubeEmbedUrl(url) {
    const id = extractYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?rel=0` : "";
  }

  function getYouTubeThumbnail(url, quality = "hqdefault") {
    const id = extractYouTubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/${quality}.jpg` : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80";
  }

  // ==============================================================================
  // GOOGLE DRIVE IMAGE UTILITIES & CLIENT-SIDE COMPRESSION
  // ==============================================================================
  /**
   * Normalizes any Google Drive link (sharing, preview, open, thumbnail)
   * into a high-performance direct web image CDN link (lh3.googleusercontent.com)
   * @param {string} url - Original URL from database or user input
   * @returns {string} Clean direct image URL
   */
  function formatDriveImageUrl(url) {
    if (!url || typeof url !== "string") return "";
    const trimmed = url.trim();
    if (!trimmed) return "";
    const driveMatch = trimmed.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=|thumbnail\?id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]{20,})/i);
    if (driveMatch && driveMatch[1]) {
      const fileId = driveMatch[1];
      return `https://lh3.googleusercontent.com/d/${fileId}=w1200`;
    }

    return trimmed;
  }

  /**
   * Two-tier image fallback handler:
   * 1. If high-res CDN fails, try Google Drive thumbnail service.
   * 2. If thumbnail fails, gracefully fall back to placeholder image.
   * @param {HTMLImageElement} imgEl - Target image DOM element
   * @param {string} originalUrl - Original image URL
   */
  function handleImageError(imgEl, originalUrl) {
    if (!imgEl) return;
    const fallbackDefault = "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80";

    const currentSrc = imgEl.src || "";
    const driveMatch = (originalUrl || currentSrc).match(/(?:lh3\.googleusercontent\.com\/d\/|drive\.google\.com.*id=)([a-zA-Z0-9_-]{20,})/i);
    if (driveMatch && driveMatch[1] && !imgEl.dataset.triedThumbnail) {
      imgEl.dataset.triedThumbnail = "true";
      imgEl.src = `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1200`;
      return;
    }

    imgEl.onerror = null;
    imgEl.src = fallbackDefault;
  }

  /**
   * Compresses and resizes an image file on the client-side before upload to Google Drive
   * Prevents large payloads from exceeding GAS Web App memory/payload limits.
   * @param {File} file - Original file from input
   * @param {number} maxWidth - Max width (default 1400px)
   * @param {number} quality - JPEG quality (default 0.82)
   * @returns {Promise<{ dataUrl: string, width: number, height: number, size: number, fileName: string, mimeType: string }>}
   */
  function compressImage(file, maxWidth = 1400, quality = 0.82) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        return reject(new Error("กรุณาเลือกไฟล์รูปภาพเท่านั้น"));
      }

      if (file.type === "image/gif" || file.type === "image/svg+xml") {
        const reader = new FileReader();
        reader.onload = () => resolve({
          dataUrl: reader.result,
          size: file.size,
          fileName: file.name,
          mimeType: file.type
        });
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const approxSize = Math.round((dataUrl.length * 3) / 4);

        resolve({
          dataUrl: dataUrl,
          width: width,
          height: height,
          size: approxSize,
          fileName: file.name.replace(/\.[^.]+$/, "") + ".jpg",
          mimeType: mimeType
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("ไม่สามารถเปิดอ่านไฟล์รูปภาพได้"));
      };

      img.src = objectUrl;
    });
  }

  function renderNewsSkeletons(count = 6) {
    let html = "";
    for (let i = 0; i < count; i++) {
      html += `
        <div class="skeleton-news-card animate-fade-in" style="animation-delay: ${i * 0.08}s">
          <div class="skeleton skeleton-news-img"></div>
          <div class="skeleton-news-body">
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
              <div class="skeleton" style="width: 70px; height: 18px; border-radius: var(--radius-full);"></div>
              <div class="skeleton" style="width: 80px; height: 18px;"></div>
            </div>
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text long"></div>
            <div class="skeleton skeleton-text medium"></div>
            <div class="skeleton skeleton-text short" style="margin-top: 0.75rem;"></div>
          </div>
        </div>
      `;
    }
    return html;
  }

  function renderAppsSkeletons(count = 6) {
    let html = "";
    for (let i = 0; i < count; i++) {
      html += `
        <div class="skeleton-app-card animate-fade-in" style="animation-delay: ${i * 0.08}s">
          <div class="skeleton-app-top">
            <div class="skeleton skeleton-app-icon"></div>
            <div class="skeleton skeleton-app-badge"></div>
          </div>
          <div class="skeleton skeleton-title" style="width: 70%; height: 1.25rem;"></div>
          <div class="skeleton skeleton-text long"></div>
          <div class="skeleton skeleton-text medium"></div>
          <div style="margin-top: auto; padding-top: 1rem; display: flex; justify-content: space-between;">
            <div class="skeleton" style="width: 70px; height: 16px;"></div>
            <div class="skeleton" style="width: 60px; height: 16px;"></div>
          </div>
        </div>
      `;
    }
    return html;
  }

  function renderStatsSkeletons(count = 4) {
    let html = "";
    for (let i = 0; i < count; i++) {
      html += `
        <div class="skeleton-stat-card animate-fade-in" style="animation-delay: ${i * 0.06}s">
          <div style="flex: 1;">
            <div class="skeleton" style="width: 100px; height: 14px; margin-bottom: 0.6rem;"></div>
            <div class="skeleton" style="width: 60px; height: 2rem;"></div>
          </div>
          <div class="skeleton" style="width: 48px; height: 48px; border-radius: var(--radius-md);"></div>
        </div>
      `;
    }
    return html;
  }

  function renderTableSkeletons(rows = 5, cols = 6) {
    let html = "";
    for (let r = 0; r < rows; r++) {
      html += `<tr class="animate-fade-in" style="animation-delay: ${r * 0.05}s">`;
      for (let c = 0; c < cols; c++) {
        const widthPercent = c === 1 ? '85%' : (c === 0 ? '40%' : '65%');
        html += `
          <td>
            <div class="skeleton skeleton-table-cell" style="width: ${widthPercent};"></div>
          </td>
        `;
      }
      html += `</tr>`;
    }
    return html;
  }

  function animateCounter(element, targetValue, duration = 800) {
    if (!element) return;
    const start = 0;
    const end = parseInt(targetValue, 10) || 0;
    if (end === 0) {
      element.innerText = "0";
      return;
    }

    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - (1 - progress) * (1 - progress);
      const current = Math.floor(start + (end - start) * easeProgress);

      element.innerText = current.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.innerText = end.toLocaleString();
      }
    }

    requestAnimationFrame(update);
  }

  function showToast(message, type = "info", duration = 3500) {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type} animate-slide-up`;

    let iconHtml = ICONS.alertCircle;
    if (type === "success") iconHtml = ICONS.checkCircle;
    if (type === "warning") iconHtml = ICONS.alertCircle;
    if (type === "danger") iconHtml = ICONS.alertCircle;

    toast.innerHTML = `
      <div class="toast-icon">${iconHtml}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
      <button class="toast-close" aria-label="Close">${ICONS.close}</button>
      <div class="toast-progress">
        <div class="toast-progress-bar" style="animation-duration: ${duration}ms;"></div>
      </div>
    `;

    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.addEventListener("click", () => {
      dismissToast(toast);
    });

    container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(toast);
      }, duration);
    }
  }

  function dismissToast(toast) {
    if (!toast || !toast.parentElement) return;
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%) scale(0.9)";
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 250);
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove("show");
    document.body.style.overflow = "";
  }

  function initModals() {
    document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) {
          closeModal(backdrop.id);
        }
      });
      const closeBtns = backdrop.querySelectorAll(".modal-close, [data-dismiss='modal']");
      closeBtns.forEach(btn => {
        btn.addEventListener("click", () => closeModal(backdrop.id));
      });
    });
  }

  function setupRippleEffect() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn");
      if (!btn) return;

      const rect = btn.getBoundingClientRect();
      const circle = document.createElement("span");
      const diameter = Math.max(rect.width, rect.height);
      const radius = diameter / 2;

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;
      circle.classList.add("ripple");

      const existingRipple = btn.querySelector(".ripple");
      if (existingRipple) existingRipple.remove();

      btn.appendChild(circle);
      setTimeout(() => circle.remove(), 600);
    });
  }

  function setupBackToTop() {
    let btn = document.getElementById("backToTopBtn");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "backToTopBtn";
      btn.className = "back-to-top";
      btn.title = "เลื่อนกลับขึ้นด้านบน";
      btn.setAttribute("aria-label", "Back to top");
      btn.innerHTML = ICONS.arrowUp;
      document.body.appendChild(btn);

      btn.addEventListener("click", () => {
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      });
    }

    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        btn.classList.add("show");
      } else {
        btn.classList.remove("show");
      }
    });
  }

  // Global Navbar Setup
  function setupNavbar() {
    const mobileToggle = document.getElementById("mobileToggle");
    const navLinks = document.getElementById("navLinks");
    if (mobileToggle && navLinks) {
      mobileToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        navLinks.classList.toggle("show");
      });

      // Auto close mobile menu when clicking outside or clicking any link
      document.addEventListener("click", (e) => {
        if (!navLinks.contains(e.target) && e.target !== mobileToggle) {
          navLinks.classList.remove("show");
        }
      });

      navLinks.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
          navLinks.classList.remove("show");
        });
      });

      // ปิดเมนูเมื่อหมุนจอ/ขยายหน้าต่างจนเป็นเมนูเต็ม หรือกด Esc
      window.addEventListener("resize", () => {
        if (window.innerWidth > 1280) navLinks.classList.remove("show");
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") navLinks.classList.remove("show");
      });
    }

    // Populate user profile info in navbar if logged in
    const user = Auth.getUser();
    const userContainer = document.getElementById("navUser");
    if (userContainer) {
      if (user) {
        userContainer.innerHTML = `
          <div class="user-badge animate-fade-in">
            <div class="avatar">${user.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
            <div class="user-info">
              <span class="user-name">
                <span class="pulse-indicator" title="Online"></span>
                ${escapeHtml(user.name)}
              </span>
              <span class="user-role">${escapeHtml(user.position || user.role || 'Employee')} · ${escapeHtml(user.department || '')}${user.plant ? ' (' + escapeHtml(user.plant) + ')' : ''}</span>
            </div>
          </div>
          <button id="btnLogout" class="btn-logout" title="ออกจากระบบ">
            ${ICONS.logOut}
          </button>
        `;
        document.getElementById("btnLogout").addEventListener("click", () => {
          Auth.logout();
        });
      } else {
        userContainer.innerHTML = `
          <a href="login.html" class="btn btn-primary btn-sm">เข้าสู่ระบบ</a>
        `;
      }
    }

    // Toggle Admin navigation item visibility
    const adminNavLink = document.getElementById("navAdminLink");
    if (adminNavLink) {
      if (user && user.isAdmin) {
        adminNavLink.style.display = "flex";
      } else {
        adminNavLink.style.display = "none";
      }
    }

    setupRippleEffect();
    setupBackToTop();
  }

  return {
    getIcon,
    escapeHtml,
    safeUrl,
    parseDate,
    formatDate,
    formatDateTime,
    isToday,
    extractYouTubeId,
    getYouTubeEmbedUrl,
    getYouTubeThumbnail,
    formatDriveImageUrl,
    handleImageError,
    compressImage,
    renderNewsSkeletons,
    renderAppsSkeletons,
    renderStatsSkeletons,
    renderTableSkeletons,
    animateCounter,
    showToast,
    openModal,
    closeModal,
    initModals,
    setupNavbar
  };
})();