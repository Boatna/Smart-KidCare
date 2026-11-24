document.addEventListener("DOMContentLoaded", () => {

  if (!Auth.requireAdmin("index.html")) {
    return;
  }

  Utils.setupNavbar();
  Utils.initModals();

  const currentAdmin = Auth.getUser();
  const adminId = currentAdmin ? currentAdmin.employeeId : "Admin";

  function toDateInputValue(value) {
    if (value) {
      const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    }
    const now = new Date();
    const y = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }

  const navItems = document.querySelectorAll(".admin-nav-item");
  const tabPanes = document.querySelectorAll(".admin-tab-pane");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetTab = item.getAttribute("data-tab");
      navItems.forEach(i => i.classList.remove("active"));
      tabPanes.forEach(p => {
        p.classList.remove("active");
        p.classList.remove("animate-fade-in");
      });

      item.classList.add("active");
      const activePane = document.getElementById(targetTab);
      if (activePane) {
        activePane.classList.add("active");
        activePane.classList.add("animate-fade-in");
      }

      handleTabChange(targetTab);
    });
  });

  function handleTabChange(tab) {
    switch (tab) {
      case "tab-dashboard": loadDashboardStats(); break;
      case "tab-news": loadAdminNews(); break;
      case "tab-videos": loadAdminVideos(); break;
      case "tab-apps": loadAdminApps(); break;
      case "tab-users": loadAdminUsers(); break;
      case "tab-contacts": loadAdminContacts(); break;
      case "tab-loginlogs": loadLoginLogs(); break;
      case "tab-adminlogs": loadAdminLogs(); break;
    }
  }

  async function loadDashboardStats() {
    try {
      const res = await API.get("getDashboardStats");

      if (res.success && res.stats) {
        Utils.animateCounter(document.getElementById("statUsers"), res.stats.users || 0, 700);
        Utils.animateCounter(document.getElementById("statNews"), res.stats.news || 0, 700);
        Utils.animateCounter(document.getElementById("statApps"), res.stats.apps || 0, 700);
        Utils.animateCounter(document.getElementById("statContacts"), res.stats.contacts || 0, 700);
      } else {
        ["statUsers", "statNews", "statApps", "statContacts"].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.innerText = "-";
        });
        console.warn("Dashboard stats failed:", res.message);
      }
    } catch (e) {
      console.error("Failed to load dashboard stats", e);
    }
  }

  let adminNewsList = [];
  const newsTableBody = document.getElementById("newsTableBody");
  const searchAdminNews = document.getElementById("searchAdminNews");

  async function loadAdminNews() {
    newsTableBody.innerHTML = Utils.renderTableSkeletons(5, 6);

    try {
      const res = await API.get("getNews", { all: "true" });

      if (res.success && Array.isArray(res.data)) {
        adminNewsList = res.data;
        renderAdminNews();
      } else {
        newsTableBody.innerHTML = `<tr><td colspan="6" class="empty-state animate-fade-in">${Utils.escapeHtml(res.message || "ไม่สามารถโหลดข้อมูลข่าวสารได้")}</td></tr>`;
      }
    } catch (e) {
      newsTableBody.innerHTML = `<tr><td colspan="6" class="empty-state">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
    }
  }

  function renderAdminNews() {
    const q = (searchAdminNews ? searchAdminNews.value : "").toLowerCase().trim();
    const filtered = adminNewsList.filter(n =>
      !q || (n.title && n.title.toLowerCase().includes(q)) ||
      (n.category && n.category.toLowerCase().includes(q)) ||
      (n.detail && n.detail.toLowerCase().includes(q))
    );

    if (filtered.length === 0) {
      newsTableBody.innerHTML = `<tr><td colspan="6" class="empty-state animate-fade-in">ไม่พบข้อมูลข่าวสาร</td></tr>`;
      return;
    }

    newsTableBody.innerHTML = filtered.map((item, idx) => {
      const isActive = (item.status || "Active").toLowerCase() === "active";
      const statusBadge = isActive ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>';
      const delay = Math.min(idx * 0.04, 0.3);

      return `
        <tr class="animate-fade-in" style="animation-delay: ${delay}s;">
          <td><strong>${Utils.escapeHtml(item.id)}</strong></td>
          <td style="max-width: 250px;">
            <div style="font-weight: 600;">${Utils.escapeHtml(item.title)}</div>
            <small style="color: var(--text-secondary); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; line-clamp: 1; overflow: hidden;">${Utils.escapeHtml(item.detail)}</small>
          </td>
          <td><span class="badge badge-primary">${Utils.escapeHtml(item.category || 'General')}</span></td>
          <td>${Utils.formatDate(item.publishDate)}</td>
          <td>${statusBadge}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-secondary btn-sm" data-id="${Utils.escapeHtml(item.id)}" onclick="editNews(this.dataset.id)" title="แก้ไข">
                ${Utils.getIcon('edit')}
              </button>
              <button class="btn btn-${isActive ? 'warning' : 'success'} btn-sm" data-id="${Utils.escapeHtml(item.id)}" data-status="${isActive ? 'Inactive' : 'Active'}" onclick="toggleNewsStatus(this.dataset.id, this.dataset.status)" title="${isActive ? 'ปิดการมองเห็น' : 'เปิดการมองเห็น'}">
                ${Utils.getIcon('power')}
              </button>
              <button class="btn btn-danger btn-sm" data-id="${Utils.escapeHtml(item.id)}" onclick="deleteNews(this.dataset.id)" title="ลบ">
                ${Utils.getIcon('trash')}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  if (searchAdminNews) {
    let timeout;
    searchAdminNews.addEventListener("input", () => {
      clearTimeout(timeout);
      timeout = setTimeout(renderAdminNews, 150);
    });
  }

  let selectedNewsImageFile = null;
  const newsImageDropzone = document.getElementById("newsImageDropzone");
  const newsImageFileInput = document.getElementById("newsImageFileInput");
  const dropzonePrompt = document.getElementById("dropzonePrompt");
  const dropzonePreview = document.getElementById("dropzonePreview");
  const newsPreviewImg = document.getElementById("newsPreviewImg");
  const previewFileName = document.getElementById("previewFileName");
  const previewFileSize = document.getElementById("previewFileSize");
  const previewUploadStatus = document.getElementById("previewUploadStatus");
  const btnRemoveNewsImage = document.getElementById("btnRemoveNewsImage");
  const toggleImageUrlInput = document.getElementById("toggleImageUrlInput");
  const imageUrlWrapper = document.getElementById("imageUrlWrapper");
  const newsImageUrlInput = document.getElementById("newsImageUrl");

  function resetNewsImageDropzone() {
    selectedNewsImageFile = null;
    if (newsImageFileInput) newsImageFileInput.value = "";
    if (dropzonePrompt) dropzonePrompt.style.display = "flex";
    if (dropzonePreview) dropzonePreview.style.display = "none";
    if (newsPreviewImg) newsPreviewImg.src = "";
    if (newsImageDropzone) newsImageDropzone.classList.remove("dragover");
  }

  async function showNewsImagePreview(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      Utils.showToast("กรุณาเลือกไฟล์รูปภาพเท่านั้น (PNG, JPG, JPEG, WEBP)", "warning");
      return;
    }

    try {
      if (dropzonePrompt) dropzonePrompt.style.display = "none";
      if (dropzonePreview) dropzonePreview.style.display = "flex";
      if (previewFileName) previewFileName.innerText = file.name;
      if (previewFileSize) previewFileSize.innerText = "กำลังปรับขนาดและบีบอัดรูปภาพ...";

      const compressed = await Utils.compressImage(file, 1400, 0.82);
      selectedNewsImageFile = compressed;

      if (newsPreviewImg) newsPreviewImg.src = compressed.dataUrl;
      if (previewFileName) previewFileName.innerText = compressed.fileName;
      if (previewFileSize) {
        const kb = (compressed.size / 1024).toFixed(1);
        const origKb = (file.size / 1024).toFixed(1);
        previewFileSize.innerText = `${kb} KB (ปรับขนาดจาก ${origKb} KB)`;
      }
      if (previewUploadStatus) {
        previewUploadStatus.className = "preview-status badge badge-primary";
        previewUploadStatus.innerText = "พร้อมบันทึกลง Google Drive";
      }
    } catch (err) {
      Utils.showToast("เกิดข้อผิดพลาดในการประมวลผลรูปภาพ: " + (err.message || err), "danger");
      resetNewsImageDropzone();
    }
  }

  if (newsImageDropzone) {
    newsImageDropzone.addEventListener("click", (e) => {
      if (e.target.closest("#btnRemoveNewsImage")) return;
      if (newsImageFileInput) newsImageFileInput.click();
    });

    newsImageDropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      newsImageDropzone.classList.add("dragover");
    });

    newsImageDropzone.addEventListener("dragleave", () => {
      newsImageDropzone.classList.remove("dragover");
    });

    newsImageDropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      newsImageDropzone.classList.remove("dragover");
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        showNewsImagePreview(e.dataTransfer.files[0]);
      }
    });
  }

  if (newsImageFileInput) {
    newsImageFileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        showNewsImagePreview(e.target.files[0]);
      }
    });
  }

  if (btnRemoveNewsImage) {
    btnRemoveNewsImage.addEventListener("click", (e) => {
      e.stopPropagation();
      resetNewsImageDropzone();
      if (newsImageUrlInput) newsImageUrlInput.value = "";
    });
  }

  if (toggleImageUrlInput && imageUrlWrapper) {
    toggleImageUrlInput.addEventListener("click", () => {
      const isHidden = imageUrlWrapper.style.display === "none";
      imageUrlWrapper.style.display = isHidden ? "block" : "none";
      toggleImageUrlInput.innerText = isHidden ? "▲ ซ่อนการระบุ URL รูปภาพ" : "🔗 หรือระบุ URL รูปภาพโดยตรง";
    });
  }

  if (newsImageUrlInput) {
    newsImageUrlInput.addEventListener("blur", (e) => {
      const val = e.target.value.trim();
      if (!val) return;
      const normalized = Utils.formatDriveImageUrl(val);
      if (normalized !== val) {
        e.target.value = normalized;
        Utils.showToast("แปลงลิงก์ Google Drive เป็น Direct Web Image เรียบร้อยแล้ว", "info");
      }
    });
  }

  const newsForm = document.getElementById("newsForm");
  window.openCreateNewsModal = function() {
    newsForm.reset();
    resetNewsImageDropzone();
    if (newsImageUrlInput) newsImageUrlInput.value = "";
    if (imageUrlWrapper) imageUrlWrapper.style.display = "none";
    if (toggleImageUrlInput) toggleImageUrlInput.innerText = "🔗 หรือระบุ URL รูปภาพโดยตรง";
    document.getElementById("newsModalTitle").innerText = "เพิ่มข่าวสารองค์กร";
    document.getElementById("newsId").value = "";
    document.getElementById("newsPublishDate").value = toDateInputValue();
    document.getElementById("newsStatus").value = "Active";
    Utils.openModal("newsModal");
  };

  window.editNews = function(id) {
    const item = adminNewsList.find(n => String(n.id) === String(id));
    if (!item) return;

    resetNewsImageDropzone();
    if (imageUrlWrapper) imageUrlWrapper.style.display = "none";
    if (toggleImageUrlInput) toggleImageUrlInput.innerText = "🔗 หรือระบุ URL รูปภาพโดยตรง";

    document.getElementById("newsModalTitle").innerText = "แก้ไขข่าวสารองค์กร";
    document.getElementById("newsId").value = item.id;
    document.getElementById("newsTitle").value = item.title;
    document.getElementById("newsCategory").value = item.category || "Announcement";
    document.getElementById("newsImageUrl").value = item.imageUrl || "";
    document.getElementById("newsUrl").value = item.url || "";
    document.getElementById("newsPublishDate").value = toDateInputValue(item.publishDate);
    document.getElementById("newsStatus").value = item.status || "Active";
    document.getElementById("newsDetail").value = item.detail;

    if (item.imageUrl && item.imageUrl.trim() !== "") {
      const displayUrl = Utils.formatDriveImageUrl(item.imageUrl);
      if (newsPreviewImg) {
        newsPreviewImg.dataset.triedThumbnail = "";
        newsPreviewImg.onerror = () => Utils.handleImageError(newsPreviewImg, item.imageUrl);
        newsPreviewImg.src = displayUrl;
      }
      if (previewFileName) previewFileName.innerText = "รูปภาพปัจจุบัน";
      if (previewFileSize) previewFileSize.innerText = item.imageUrl.includes("drive.google.com") || item.imageUrl.includes("googleusercontent.com") ? "Google Drive Image" : "Image URL";
      if (previewUploadStatus) {
        previewUploadStatus.className = "preview-status badge badge-success";
        previewUploadStatus.innerText = "รูปที่กำลังใช้งาน";
      }
      if (dropzonePrompt) dropzonePrompt.style.display = "none";
      if (dropzonePreview) dropzonePreview.style.display = "flex";
    }

    Utils.openModal("newsModal");
  };

  if (newsForm) {
    newsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = newsForm.querySelector("button[type='submit']");
      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : "บันทึกข้อมูล";

      const id = document.getElementById("newsId").value;
      let finalImageUrl = (newsImageUrlInput ? newsImageUrlInput.value : "").trim();

      if (selectedNewsImageFile && selectedNewsImageFile.dataUrl) {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<span class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></span> กำลังบันทึกรูปลง Google Drive...`;
        }

        try {
          const uploadRes = await API.post("uploadNewsImage", {
            fileData: selectedNewsImageFile.dataUrl,
            fileName: selectedNewsImageFile.fileName,
            mimeType: selectedNewsImageFile.mimeType,
            adminId: adminId
          });

          if (uploadRes && uploadRes.success && uploadRes.imageUrl) {
            finalImageUrl = uploadRes.imageUrl;
          } else {
            Utils.showToast(uploadRes ? uploadRes.message : "อัปโหลดรูปลง Google Drive ไม่สำเร็จ", "danger");
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = originalBtnHtml;
            }
            return;
          }
        } catch (uploadErr) {
          Utils.showToast("เกิดข้อผิดพลาดในการเชื่อมต่อเพื่ออัปโหลดรูปภาพ", "danger");
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
          }
          return;
        }
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></span> กำลังบันทึกข้อมูล...`;
      }

      const payload = {
        id: id,
        title: document.getElementById("newsTitle").value.trim(),
        category: document.getElementById("newsCategory").value,
        imageUrl: finalImageUrl,
        url: document.getElementById("newsUrl").value.trim(),
        publishDate: document.getElementById("newsPublishDate").value,
        status: document.getElementById("newsStatus").value,
        detail: document.getElementById("newsDetail").value.trim(),
        adminId: adminId
      };

      const action = id ? "updateNews" : "addNews";
      try {
        const res = await API.post(action, payload);
        if (res.success) {
          Utils.showToast(res.message || "บันทึกข้อมูลเรียบร้อยแล้ว", "success");
          Utils.closeModal("newsModal");
          resetNewsImageDropzone();
          loadAdminNews();
          loadDashboardStats();
        } else {
          Utils.showToast(res.message || "บันทึกล้มเหลว", "danger");
        }
      } catch (err) {
        Utils.showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "danger");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      }
    });
  }

  window.deleteNews = async function(id) {
    const item = adminNewsList.find(n => String(n.id) === String(id));
    const title = item ? item.title : id;
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข่าว "${title}"?`)) return;
    try {
      const res = await API.post("deleteNews", { id, adminId });
      if (res.success) {
        Utils.showToast("ลบข่าวเรียบร้อยแล้ว", "success");
        loadAdminNews();
        loadDashboardStats();
      } else {
        Utils.showToast(res.message || "ลบไม่สำเร็จ", "danger");
      }
    } catch (e) {
      Utils.showToast("เกิดข้อผิดพลาด", "danger");
    }
  };

  window.toggleNewsStatus = async function(id, status) {
    try {
      const res = await API.post("toggleNewsStatus", { id, status, adminId });
      if (res.success) {
        Utils.showToast(res.message, "success");
        loadAdminNews();
      } else {
        Utils.showToast(res.message || "เปลี่ยนสถานะไม่สำเร็จ", "danger");
      }
    } catch (e) {
      Utils.showToast("เกิดข้อผิดพลาด", "danger");
    }
  };

  let adminAppsList = [];
  const appsTableBody = document.getElementById("appsTableBody");
  const searchAdminApps = document.getElementById("searchAdminApps");

  async function loadAdminApps() {
    appsTableBody.innerHTML = Utils.renderTableSkeletons(5, 7);
    try {
      const res = await API.get("getApps", { all: "true" });

      if (res.success && Array.isArray(res.data)) {
        adminAppsList = res.data;
        renderAdminApps();
      } else {
        appsTableBody.innerHTML = `<tr><td colspan="7" class="empty-state animate-fade-in">${Utils.escapeHtml(res.message || "ไม่สามารถโหลดข้อมูลแอปพลิเคชันได้")}</td></tr>`;
      }
    } catch (e) {
      appsTableBody.innerHTML = `<tr><td colspan="7" class="empty-state">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
    }
  }

  function renderAdminApps() {
    const q = (searchAdminApps ? searchAdminApps.value : "").toLowerCase().trim();
    const filtered = adminAppsList.filter(a =>
      !q || (a.appName && a.appName.toLowerCase().includes(q)) || (a.category && a.category.toLowerCase().includes(q))
    );

    if (filtered.length === 0) {
      appsTableBody.innerHTML = `<tr><td colspan="7" class="empty-state animate-fade-in">ไม่พบรายการแอปพลิเคชัน</td></tr>`;
      return;
    }

    appsTableBody.innerHTML = filtered.map((app, idx) => {
      const isActive = (app.status || "Active").toLowerCase() === "active";
      const statusBadge = isActive ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>';
      const delay = Math.min(idx * 0.04, 0.3);

      return `
        <tr class="animate-fade-in" style="animation-delay: ${delay}s;">
          <td><strong>${Utils.escapeHtml(app.id)}</strong></td>
          <td>
            <div style="font-weight: 600;">${Utils.escapeHtml(app.appName)}</div>
            <small style="color: var(--text-secondary);">${Utils.escapeHtml(app.description || '')}</small>
          </td>
          <td><span class="badge badge-primary">${Utils.escapeHtml(app.category)}</span></td>
          <td><span class="badge badge-secondary">${Utils.escapeHtml(app.type)}</span></td>
          <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><a href="${Utils.escapeHtml(Utils.safeUrl(app.url))}" target="_blank" rel="noopener noreferrer">${Utils.escapeHtml(app.url)}</a></td>
          <td>${statusBadge}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-secondary btn-sm" data-id="${Utils.escapeHtml(app.id)}" onclick="editApp(this.dataset.id)" title="แก้ไข">
                ${Utils.getIcon('edit')}
              </button>
              <button class="btn btn-${isActive ? 'warning' : 'success'} btn-sm" data-id="${Utils.escapeHtml(app.id)}" data-status="${isActive ? 'Inactive' : 'Active'}" onclick="toggleAppStatus(this.dataset.id, this.dataset.status)" title="${isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}">
                ${Utils.getIcon('power')}
              </button>
              <button class="btn btn-danger btn-sm" data-id="${Utils.escapeHtml(app.id)}" onclick="deleteApp(this.dataset.id)" title="ลบ">
                ${Utils.getIcon('trash')}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  if (searchAdminApps) {
    let timeout;
    searchAdminApps.addEventListener("input", () => {
      clearTimeout(timeout);
      timeout = setTimeout(renderAdminApps, 150);
    });
  }

  const appForm = document.getElementById("appForm");
  window.openCreateAppModal = function() {
    appForm.reset();
    document.getElementById("appModalTitle").innerText = "เพิ่มแอปพลิเคชันใหม่";
    document.getElementById("appId").value = "";
    document.getElementById("appCategory").value = "HR";
    document.getElementById("appType").value = "Internal";
    document.getElementById("appStatus").value = "Active";
    Utils.openModal("appModal");
  };

  window.editApp = function(id) {
    const item = adminAppsList.find(a => String(a.id) === String(id));
    if (!item) return;

    document.getElementById("appModalTitle").innerText = "แก้ไขข้อมูลแอปพลิเคชัน";
    document.getElementById("appId").value = item.id;
    document.getElementById("appName").value = item.appName;
    document.getElementById("appDescription").value = item.description || "";
    document.getElementById("appUrl").value = item.url;
    document.getElementById("appIcon").value = item.icon || "layout-grid";
    document.getElementById("appCategory").value = item.category || "HR";
    document.getElementById("appType").value = item.type || "Internal";
    document.getElementById("appStatus").value = item.status || "Active";

    Utils.openModal("appModal");
  };

  if (appForm) {
    appForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("appId").value;
      const payload = {
        id: id,
        appName: document.getElementById("appName").value.trim(),
        description: document.getElementById("appDescription").value.trim(),
        url: document.getElementById("appUrl").value.trim(),
        icon: document.getElementById("appIcon").value.trim(),
        category: document.getElementById("appCategory").value,
        type: document.getElementById("appType").value,
        status: document.getElementById("appStatus").value,
        adminId: adminId
      };

      const action = id ? "updateApp" : "addApp";
      try {
        const res = await API.post(action, payload);
        if (res.success) {
          Utils.showToast(res.message || "บันทึกเรียบร้อยแล้ว", "success");
          Utils.closeModal("appModal");
          loadAdminApps();
          loadDashboardStats();
        } else {
          Utils.showToast(res.message || "บันทึกล้มเหลว", "danger");
        }
      } catch (err) {
        Utils.showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "danger");
      }
    });
  }

  window.deleteApp = async function(id) {
    const item = adminAppsList.find(a => String(a.id) === String(id));
    const name = item ? item.appName : id;
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบแอป "${name}"?`)) return;
    try {
      const res = await API.post("deleteApp", { id, adminId });
      if (res.success) {
        Utils.showToast("ลบแอปเรียบร้อยแล้ว", "success");
        loadAdminApps();
        loadDashboardStats();
      } else {
        Utils.showToast(res.message, "danger");
      }
    } catch (e) {
      Utils.showToast("เกิดข้อผิดพลาด", "danger");
    }
  };

  window.toggleAppStatus = async function(id, status) {
    try {
      const res = await API.post("toggleAppStatus", { id, status, adminId });
      if (res.success) {
        Utils.showToast(res.message, "success");
        loadAdminApps();
      } else {
        Utils.showToast(res.message || "เปลี่ยนสถานะไม่สำเร็จ", "danger");
      }
    } catch (e) {
      Utils.showToast("เกิดข้อผิดพลาด", "danger");
    }
  };

  let adminUsersList = [];
  const usersTableBody = document.getElementById("usersTableBody");
  const searchAdminUsers = document.getElementById("searchAdminUsers");

  async function loadAdminUsers() {
    usersTableBody.innerHTML = Utils.renderTableSkeletons(5, 8);
    try {
      const res = await API.get("getUsers");

      if (res.success && Array.isArray(res.data)) {
        adminUsersList = res.data;
        renderAdminUsers();
      } else {
        usersTableBody.innerHTML = `<tr><td colspan="8" class="empty-state animate-fade-in">${Utils.escapeHtml(res.message || "ไม่สามารถโหลดข้อมูลผู้ใช้ได้")}</td></tr>`;
      }
    } catch (e) {
      usersTableBody.innerHTML = `<tr><td colspan="8" class="empty-state">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
    }
  }

  function renderAdminUsers() {
    const q = (searchAdminUsers ? searchAdminUsers.value : "").toLowerCase().trim();
    const filtered = adminUsersList.filter(u =>
      !q || (u.employeeId && u.employeeId.toLowerCase().includes(q)) ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q)) ||
      (u.position && u.position.toLowerCase().includes(q)) ||
      (u.plant && u.plant.toLowerCase().includes(q))
    );

    if (filtered.length === 0) {
      usersTableBody.innerHTML = `<tr><td colspan="8" class="empty-state animate-fade-in">ไม่พบข้อมูลพนักงาน</td></tr>`;
      return;
    }

    usersTableBody.innerHTML = filtered.map((user, idx) => {
      const isActive = (user.status || "Active").toLowerCase() === "active";
      const statusBadge = isActive ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>';
      const isAdminBadge = user.isAdmin ? ' <span class="badge badge-warning" style="font-size: 0.72rem; vertical-align: middle;">👑 Admin</span>' : '';
      const delay = Math.min(idx * 0.04, 0.3);

      return `
        <tr class="animate-fade-in" style="animation-delay: ${delay}s;">
          <td><strong>${Utils.escapeHtml(user.employeeId)}</strong></td>
          <td>${Utils.escapeHtml(user.name)}${isAdminBadge}</td>
          <td><span class="badge badge-secondary">${Utils.escapeHtml(user.department || '-')}</span></td>
          <td>${Utils.escapeHtml(user.position || '-')}</td>
          <td><span class="badge badge-info" style="font-size: 0.8rem;">${Utils.escapeHtml(user.plant || '-')}</span></td>
          <td><code>••••</code></td>
          <td>${statusBadge}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-secondary btn-sm" data-empid="${Utils.escapeHtml(user.employeeId)}" onclick="editUser(this.dataset.empid)" title="แก้ไข">
                ${Utils.getIcon('edit')}
              </button>
              <button class="btn btn-secondary btn-sm" data-empid="${Utils.escapeHtml(user.employeeId)}" onclick="openChangePinModal(this.dataset.empid)" title="เปลี่ยน PIN">
                ${Utils.getIcon('key')}
              </button>
              <button class="btn btn-secondary btn-sm" data-empid="${Utils.escapeHtml(user.employeeId)}" onclick="unlockUser(this.dataset.empid)" title="ปลดล็อกการ Login (กรณีใส่ PIN ผิดเกินกำหนด)">
                🔓
              </button>
              <button class="btn btn-${isActive ? 'warning' : 'success'} btn-sm" data-empid="${Utils.escapeHtml(user.employeeId)}" data-status="${isActive ? 'Inactive' : 'Active'}" onclick="toggleUserStatus(this.dataset.empid, this.dataset.status)" title="${isActive ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}">
                ${Utils.getIcon('power')}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  if (searchAdminUsers) {
    let timeout;
    searchAdminUsers.addEventListener("input", () => {
      clearTimeout(timeout);
      timeout = setTimeout(renderAdminUsers, 150);
    });
  }

  const userForm = document.getElementById("userForm");
  window.openCreateUserModal = function() {
    userForm.reset();
    document.getElementById("userModalTitle").innerText = "เพิ่มพนักงานใหม่";
    document.getElementById("userEmpId").readOnly = false;
    document.getElementById("userPosition").value = "";
    document.getElementById("userPlant").value = "Tasaki";
    document.getElementById("userPin").required = true;
    document.getElementById("pinFieldGroup").style.display = "block";
    document.getElementById("userStatus").value = "Active";
    const adminCheck = document.getElementById("userIsAdmin");
    if (adminCheck) adminCheck.checked = false;
    Utils.openModal("userModal");
  };

  window.editUser = function(empId) {
    const user = adminUsersList.find(u => String(u.employeeId) === String(empId));
    if (!user) return;

    document.getElementById("userModalTitle").innerText = "แก้ไขข้อมูลพนักงาน";
    document.getElementById("userEmpId").value = user.employeeId;
    document.getElementById("userEmpId").readOnly = true;
    document.getElementById("userName").value = user.name;
    document.getElementById("userDepartment").value = user.department || "";
    document.getElementById("userPosition").value = user.position || "";
    document.getElementById("userPlant").value = user.plant || "";
    document.getElementById("userStatus").value = user.status || "Active";
    document.getElementById("pinFieldGroup").style.display = "none";
    document.getElementById("userPin").required = false;
    const adminCheck = document.getElementById("userIsAdmin");
    if (adminCheck) adminCheck.checked = Boolean(user.isAdmin);

    Utils.openModal("userModal");
  };

  if (userForm) {
    userForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const empId = document.getElementById("userEmpId").value.trim();
      const isCreate = !document.getElementById("userEmpId").readOnly;
      const isAdminRole = document.getElementById("userIsAdmin") ? document.getElementById("userIsAdmin").checked : false;

      const payload = {
        employeeId: empId,
        name: document.getElementById("userName").value.trim(),
        department: document.getElementById("userDepartment").value.trim(),
        position: document.getElementById("userPosition").value.trim(),
        plant: document.getElementById("userPlant").value.trim(),
        status: document.getElementById("userStatus").value,
        isAdmin: isAdminRole,
        adminId: adminId
      };

      if (isCreate) {
        payload.pin = document.getElementById("userPin").value.trim();
        if (payload.pin.length !== 4) {
          Utils.showToast("PIN ต้องมีความยาว 4 หลัก", "warning");
          return;
        }
      }

      const action = isCreate ? "addUser" : "updateUser";
      try {
        const res = await API.post(action, payload);
        if (res.success) {
          Utils.showToast(res.message, "success");
          Utils.closeModal("userModal");
          loadAdminUsers();
          loadDashboardStats();
        } else {
          Utils.showToast(res.message, "danger");
        }
      } catch (err) {
        Utils.showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "danger");
      }
    });
  }

  window.openChangePinModal = function(empId, name) {
    const user = adminUsersList.find(u => String(u.employeeId) === String(empId));
    const displayName = user ? user.name : (name || empId);
    document.getElementById("pinTargetEmpId").value = empId;
    document.getElementById("pinTargetName").innerText = `${empId} - ${displayName}`;
    document.getElementById("newPinInput").value = "";
    Utils.openModal("changePinModal");
  };

  const changePinForm = document.getElementById("changePinForm");
  if (changePinForm) {
    changePinForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const empId = document.getElementById("pinTargetEmpId").value;
      const newPin = document.getElementById("newPinInput").value.trim();

      if (!/^\d{4}$/.test(newPin)) {
        Utils.showToast("PIN ต้องเป็นตัวเลข 4 หลักเท่านั้น", "warning");
        return;
      }

      try {
        const res = await API.post("changePin", { employeeId: empId, newPin, adminId });
        if (res.success) {
          Utils.showToast(res.message, "success");
          Utils.closeModal("changePinModal");
          loadAdminUsers();
        } else {
          Utils.showToast(res.message, "danger");
        }
      } catch (err) {
        Utils.showToast("เกิดข้อผิดพลาด", "danger");
      }
    });
  }

  window.toggleUserStatus = async function(empId, status) {
    try {
      const res = await API.post("toggleUserStatus", { employeeId: empId, status, adminId });
      if (res.success) {
        Utils.showToast(res.message, "success");
        loadAdminUsers();
      } else {
        Utils.showToast(res.message || "เปลี่ยนสถานะไม่สำเร็จ", "danger");
        loadAdminUsers();
      }
    } catch (e) {
      Utils.showToast("เกิดข้อผิดพลาด", "danger");
    }
  };

  window.unlockUser = async function(empId) {
    if (!confirm(`ปลดล็อกการเข้าสู่ระบบของรหัสพนักงาน ${empId} ใช่หรือไม่?`)) return;
    try {
      const res = await API.post("unlockUser", { employeeId: empId, adminId });
      if (res.success) {
        Utils.showToast(res.message || "ปลดล็อกสำเร็จ", "success");
      } else {
        Utils.showToast(res.message || "ปลดล็อกไม่สำเร็จ", "danger");
      }
    } catch (e) {
      Utils.showToast("เกิดข้อผิดพลาด", "danger");
    }
  };

  let adminContactsList = [];
  const contactsTableBody = document.getElementById("contactsTableBody");

  async function loadAdminContacts() {
    contactsTableBody.innerHTML = Utils.renderTableSkeletons(5, 7);
    try {
      const res = await API.get("getContactRequests");

      if (res.success && Array.isArray(res.data)) {
        adminContactsList = res.data;
        renderAdminContacts();
      } else {
        contactsTableBody.innerHTML = `<tr><td colspan="7" class="empty-state animate-fade-in">${Utils.escapeHtml(res.message || "ไม่สามารถโหลดรายการแจ้งปัญหาได้")}</td></tr>`;
      }
    } catch (e) {
      contactsTableBody.innerHTML = `<tr><td colspan="7" class="empty-state">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
    }
  }

  window.loadAdminContacts = loadAdminContacts;

  function renderAdminContacts() {
    if (adminContactsList.length === 0) {
      contactsTableBody.innerHTML = `<tr><td colspan="7" class="empty-state animate-fade-in">ไม่มีรายการแจ้งปัญหา</td></tr>`;
      return;
    }

    contactsTableBody.innerHTML = adminContactsList.map((req, idx) => {
      let statusBadge = '<span class="badge badge-warning">Open</span>';
      if (req.status === "In Progress") statusBadge = '<span class="badge badge-primary">In Progress</span>';
      if (req.status === "Closed") statusBadge = '<span class="badge badge-success">Closed</span>';
      const delay = Math.min(idx * 0.04, 0.3);

      return `
        <tr class="animate-fade-in" style="animation-delay: ${delay}s;">
          <td><strong>${Utils.escapeHtml(req.id)}</strong></td>
          <td>${Utils.escapeHtml(req.employeeId)}<br><small>${Utils.escapeHtml(req.name)}</small></td>
          <td><strong>${Utils.escapeHtml(req.topic)}</strong></td>
          <td style="max-width: 250px;"><small>${Utils.escapeHtml(req.detail)}</small></td>
          <td>${Utils.formatDateTime(req.createdDate)}</td>
          <td>${statusBadge}</td>
          <td>
            <select class="form-control" style="padding: 0.3rem 0.5rem; font-size: 0.8rem;" data-id="${Utils.escapeHtml(req.id)}" onchange="updateContactStatus(this.dataset.id, this.value)">
              <option value="Open" ${req.status === 'Open' ? 'selected' : ''}>Open</option>
              <option value="In Progress" ${req.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option value="Closed" ${req.status === 'Closed' ? 'selected' : ''}>Closed</option>
            </select>
          </td>
        </tr>
      `;
    }).join("");
  }

  window.updateContactStatus = async function(id, status) {
    try {
      const res = await API.post("updateContactStatus", { id, status, adminId });
      if (res.success) {
        Utils.showToast(res.message, "success");
      } else {
        Utils.showToast(res.message || "อัปเดตสถานะไม่สำเร็จ", "danger");
      }
      loadAdminContacts();
    } catch (e) {
      Utils.showToast("เกิดข้อผิดพลาด", "danger");
    }
  };

  let loginLogsRaw = [];
  let loginLogsCurrentPage = 1;
  const LOGS_PER_PAGE = 8;
  const loginLogsTableBody = document.getElementById("loginLogsTableBody");
  const searchLoginLogs = document.getElementById("searchLoginLogs");
  const filterLoginStatus = document.getElementById("filterLoginStatus");
  const sortLoginLogs = document.getElementById("sortLoginLogs");

  async function loadLoginLogs() {
    loginLogsTableBody.innerHTML = Utils.renderTableSkeletons(6, 5);
    try {
      const res = await API.get("getLoginLogs");

      if (res.success && Array.isArray(res.data)) {
        loginLogsRaw = res.data;
        renderLoginLogs();
      } else {
        loginLogsTableBody.innerHTML = `<tr><td colspan="5" class="empty-state animate-fade-in">${Utils.escapeHtml(res.message || "ไม่สามารถโหลดประวัติการ Login ได้")}</td></tr>`;
      }
    } catch (e) {
      loginLogsTableBody.innerHTML = `<tr><td colspan="5" class="empty-state">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
    }
  }

  function renderLoginLogs() {
    const q = (searchLoginLogs ? searchLoginLogs.value : "").toLowerCase().trim();
    const statusFilter = (filterLoginStatus ? filterLoginStatus.value : "ALL").toUpperCase();
    const sortOrder = (sortLoginLogs ? sortLoginLogs.value : "desc");

    let filtered = loginLogsRaw.filter(log => {
      const matchesSearch = !q ||
        (log.employeeId && log.employeeId.toLowerCase().includes(q)) ||
        (log.name && log.name.toLowerCase().includes(q)) ||
        (log.ip && log.ip.toLowerCase().includes(q));

      const isSuccess = log.status && log.status.toLowerCase().includes("success");
      const matchesStatus = statusFilter === "ALL" ||
        (statusFilter === "SUCCESS" && isSuccess) ||
        (statusFilter === "FAILED" && !isSuccess);

      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      const dateA = Utils.parseDate(a.dateTime);
      const dateB = Utils.parseDate(b.dateTime);
      const timeA = dateA ? dateA.getTime() : 0;
      const timeB = dateB ? dateB.getTime() : 0;
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    });

    const totalPages = Math.ceil(filtered.length / LOGS_PER_PAGE) || 1;
    if (loginLogsCurrentPage > totalPages) loginLogsCurrentPage = totalPages;
    if (loginLogsCurrentPage < 1) loginLogsCurrentPage = 1;

    const startIdx = (loginLogsCurrentPage - 1) * LOGS_PER_PAGE;
    const pageItems = filtered.slice(startIdx, startIdx + LOGS_PER_PAGE);

    if (pageItems.length === 0) {
      loginLogsTableBody.innerHTML = `<tr><td colspan="5" class="empty-state animate-fade-in">ไม่พบบันทึกการเข้าใช้งาน</td></tr>`;
      renderPaginationControls("loginLogsPagination", 1, 1, (p) => {});
      return;
    }

    loginLogsTableBody.innerHTML = pageItems.map((item, idx) => {
      const isSuccess = item.status && item.status.toLowerCase().includes("success");
      const statusBadge = isSuccess ?
        `<span class="badge badge-success">Success</span>` :
        `<span class="badge badge-danger">${Utils.escapeHtml(item.status)}</span>`;
      const delay = Math.min(idx * 0.03, 0.25);

      return `
        <tr class="animate-fade-in" style="animation-delay: ${delay}s;">
          <td>${Utils.formatDateTime(item.dateTime)}</td>
          <td><strong>${Utils.escapeHtml(item.employeeId)}</strong></td>
          <td>${Utils.escapeHtml(item.name || '-')}</td>
          <td><code>${Utils.escapeHtml(item.ip || '127.0.0.1')}</code></td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join("");

    renderPaginationControls("loginLogsPagination", loginLogsCurrentPage, totalPages, (newPage) => {
      loginLogsCurrentPage = newPage;
      renderLoginLogs();
    });
  }

  if (searchLoginLogs) {
    let timeout;
    searchLoginLogs.addEventListener("input", () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        loginLogsCurrentPage = 1;
        renderLoginLogs();
      }, 150);
    });
  }
  if (filterLoginStatus) filterLoginStatus.addEventListener("change", () => { loginLogsCurrentPage = 1; renderLoginLogs(); });
  if (sortLoginLogs) sortLoginLogs.addEventListener("change", () => { renderLoginLogs(); });

  let adminLogsRaw = [];
  let adminLogsCurrentPage = 1;
  const adminLogsTableBody = document.getElementById("adminLogsTableBody");
  const searchAdminLogs = document.getElementById("searchAdminLogs");
  const filterAdminAction = document.getElementById("filterAdminAction");
  const sortAdminLogs = document.getElementById("sortAdminLogs");

  async function loadAdminLogs() {
    adminLogsTableBody.innerHTML = Utils.renderTableSkeletons(6, 4);
    try {
      const res = await API.get("getAdminLogs");

      if (res.success && Array.isArray(res.data)) {
        adminLogsRaw = res.data;
        renderAdminLogs();
      } else {
        adminLogsTableBody.innerHTML = `<tr><td colspan="4" class="empty-state animate-fade-in">${Utils.escapeHtml(res.message || "ไม่สามารถโหลดบันทึกกิจกรรมได้")}</td></tr>`;
      }
    } catch (e) {
      adminLogsTableBody.innerHTML = `<tr><td colspan="4" class="empty-state">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
    }
  }

  function renderAdminLogs() {
    const q = (searchAdminLogs ? searchAdminLogs.value : "").toLowerCase().trim();
    const actionFilter = (filterAdminAction ? filterAdminAction.value : "ALL").toUpperCase();
    const sortOrder = (sortAdminLogs ? sortAdminLogs.value : "desc");

    let filtered = adminLogsRaw.filter(log => {
      const matchesSearch = !q ||
        (log.adminId && log.adminId.toLowerCase().includes(q)) ||
        (log.detail && log.detail.toLowerCase().includes(q));

      const matchesAction = actionFilter === "ALL" ||
        (log.action && log.action.toUpperCase().includes(actionFilter));

      return matchesSearch && matchesAction;
    });

    filtered.sort((a, b) => {
      const dateA = Utils.parseDate(a.dateTime);
      const dateB = Utils.parseDate(b.dateTime);
      const timeA = dateA ? dateA.getTime() : 0;
      const timeB = dateB ? dateB.getTime() : 0;
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    });

    const totalPages = Math.ceil(filtered.length / LOGS_PER_PAGE) || 1;
    if (adminLogsCurrentPage > totalPages) adminLogsCurrentPage = totalPages;
    if (adminLogsCurrentPage < 1) adminLogsCurrentPage = 1;

    const startIdx = (adminLogsCurrentPage - 1) * LOGS_PER_PAGE;
    const pageItems = filtered.slice(startIdx, startIdx + LOGS_PER_PAGE);

    if (pageItems.length === 0) {
      adminLogsTableBody.innerHTML = `<tr><td colspan="4" class="empty-state animate-fade-in">ไม่พบบันทึกกิจกรรมของแอดมิน</td></tr>`;
      renderPaginationControls("adminLogsPagination", 1, 1, (p) => {});
      return;
    }

    adminLogsTableBody.innerHTML = pageItems.map((item, idx) => {
      const delay = Math.min(idx * 0.03, 0.25);
      return `
        <tr class="animate-fade-in" style="animation-delay: ${delay}s;">
          <td>${Utils.formatDateTime(item.dateTime)}</td>
          <td><strong>${Utils.escapeHtml(item.adminId)}</strong></td>
          <td><span class="badge badge-primary">${Utils.escapeHtml(item.action)}</span></td>
          <td>${Utils.escapeHtml(item.detail)}</td>
        </tr>
      `;
    }).join("");

    renderPaginationControls("adminLogsPagination", adminLogsCurrentPage, totalPages, (newPage) => {
      adminLogsCurrentPage = newPage;
      renderAdminLogs();
    });
  }

  if (searchAdminLogs) {
    let timeout;
    searchAdminLogs.addEventListener("input", () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        adminLogsCurrentPage = 1;
        renderAdminLogs();
      }, 150);
    });
  }
  if (filterAdminAction) filterAdminAction.addEventListener("change", () => { adminLogsCurrentPage = 1; renderAdminLogs(); });
  if (sortAdminLogs) sortAdminLogs.addEventListener("change", () => { renderAdminLogs(); });

  // Pagination Builder Helper
  function renderPaginationControls(containerId, currentPage, totalPages, onPageClick) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = `
      <span>หน้า ${currentPage} จาก ${totalPages}</span>
      <div class="pagination-controls">
        <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} id="${containerId}_prev">« ก่อนหน้า</button>
    `;

    for (let p = 1; p <= totalPages; p++) {
      if (totalPages > 6 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== totalPages) {
        if (p === 2 || p === totalPages - 1) html += `<span>...</span>`;
        continue;
      }
      html += `<button class="pagination-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }

    html += `
        <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} id="${containerId}_next">ถัดไป »</button>
      </div>
    `;

    container.innerHTML = html;

    const prevBtn = document.getElementById(`${containerId}_prev`);
    const nextBtn = document.getElementById(`${containerId}_next`);
    if (prevBtn) prevBtn.addEventListener("click", () => onPageClick(currentPage - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => onPageClick(currentPage + 1));

    container.querySelectorAll(".pagination-btn[data-page]").forEach(btn => {
      btn.addEventListener("click", () => {
        onPageClick(Number(btn.getAttribute("data-page")));
      });
    });
  }

  // ============================================================================
  // YOUTUBE VIDEOS MANAGEMENT (3 SLOTS)
  // ============================================================================
  let currentAdminVideos = [];

  async function loadAdminVideos() {
    try {
      const cached = localStorage.getItem("emp_portal_youtube_videos");
      if (cached) {
        currentAdminVideos = JSON.parse(cached);
      }
    } catch (e) {}

    if (!currentAdminVideos || currentAdminVideos.length === 0) {
      currentAdminVideos = CONFIG.YOUTUBE_VIDEOS || [];
    }

    try {
      const res = await API.get("getVideos");
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        currentAdminVideos = res.data;
        localStorage.setItem("emp_portal_youtube_videos", JSON.stringify(res.data));
      }
    } catch (e) {}

    const v1 = currentAdminVideos[0] || (CONFIG.YOUTUBE_VIDEOS && CONFIG.YOUTUBE_VIDEOS[0]) || {};
    const v2 = currentAdminVideos[1] || (CONFIG.YOUTUBE_VIDEOS && CONFIG.YOUTUBE_VIDEOS[1]) || {};
    const v3 = currentAdminVideos[2] || (CONFIG.YOUTUBE_VIDEOS && CONFIG.YOUTUBE_VIDEOS[2]) || {};

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };

    setVal("adminVidTitle1", v1.title || "");
    setVal("adminVidUrl1", v1.url || "");
    setVal("adminVidCat1", v1.category || "");
    setVal("adminVidDesc1", v1.description || "");

    setVal("adminVidTitle2", v2.title || "");
    setVal("adminVidUrl2", v2.url || "");
    setVal("adminVidCat2", v2.category || "");
    setVal("adminVidDesc2", v2.description || "");

    setVal("adminVidTitle3", v3.title || "");
    setVal("adminVidUrl3", v3.url || "");
    setVal("adminVidCat3", v3.category || "");
    setVal("adminVidDesc3", v3.description || "");
  }

  window.saveAdminVideos = async function() {
    const videosForm = document.getElementById("adminVideosForm");
    if (videosForm && !videosForm.reportValidity()) return; // ปุ่มเรียกผ่าน onclick จึงต้องตรวจฟอร์มเอง

    const newVideos = [
      {
        id: "yt-1",
        title: document.getElementById("adminVidTitle1")?.value.trim() || "วิดีโอช่องที่ 1",
        url: document.getElementById("adminVidUrl1")?.value.trim() || "",
        category: document.getElementById("adminVidCat1")?.value.trim() || "แนะนำองค์กร",
        description: document.getElementById("adminVidDesc1")?.value.trim() || "",
        order: 1,
        status: "Active"
      },
      {
        id: "yt-2",
        title: document.getElementById("adminVidTitle2")?.value.trim() || "วิดีโอช่องที่ 2",
        url: document.getElementById("adminVidUrl2")?.value.trim() || "",
        category: document.getElementById("adminVidCat2")?.value.trim() || "คู่มือการใช้งาน",
        description: document.getElementById("adminVidDesc2")?.value.trim() || "",
        order: 2,
        status: "Active"
      },
      {
        id: "yt-3",
        title: document.getElementById("adminVidTitle3")?.value.trim() || "วิดีโอช่องที่ 3",
        url: document.getElementById("adminVidUrl3")?.value.trim() || "",
        category: document.getElementById("adminVidCat3")?.value.trim() || "ความปลอดภัย",
        description: document.getElementById("adminVidDesc3")?.value.trim() || "",
        order: 3,
        status: "Active"
      }
    ];

    const badIdx = newVideos.findIndex(v => !Utils.extractYouTubeId(v.url));
    if (badIdx !== -1) {
      Utils.showToast(`ลิงก์ YouTube ช่องที่ ${badIdx + 1} ไม่ถูกต้อง`, "warning");
      return;
    }

    try {
      const user = Auth.getUser();
      const currentAdminId = user ? user.employeeId : adminId;
      const res = await API.post("updateVideos", {
        videos: newVideos,
        adminId: currentAdminId
      });

      if (res && res.success) {
        currentAdminVideos = newVideos;
        localStorage.setItem("emp_portal_youtube_videos", JSON.stringify(newVideos));
        Utils.showToast(res.message || "บันทึกการตั้งค่าวิดีโอ YouTube ทั้ง 3 ช่องสำเร็จ!", "success");
      } else {
        Utils.showToast((res && res.message) || "บันทึกล้มเหลว: สิทธิ์ไม่เพียงพอหรือเซิร์ฟเวอร์ขัดข้อง", "danger");
      }
    } catch (e) {
      Utils.showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ ยังไม่ได้บันทึกข้อมูล", "danger");
    }
  };

  // ============================================================================
  // DATABASE TOOLS (Ensure Sheets, Migrate Schema, Setup Seed Data)
  // ============================================================================
  window.runEnsureSheets = async function() {
    const btn = document.getElementById("btnEnsureSheets");
    if (btn) btn.disabled = true;
    Utils.showToast("กำลังตรวจสอบชีตทั้งหมดใน Google Sheets...", "info");
    try {
      const res = await API.post("ensureSheets", { adminId });
      if (res && res.success) {
        Utils.showToast(res.message || "ตรวจสอบชีตเรียบร้อยแล้ว", "success");
        loadDashboardStats();
      } else {
        Utils.showToast((res && res.message) || "เกิดข้อผิดพลาดในการตรวจสอบชีต", "danger");
      }
    } catch (e) {
      Utils.showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "danger");
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  window.runMigrateSchema = async function() {
    const btn = document.getElementById("btnMigrateSchema");
    if (btn) btn.disabled = true;
    Utils.showToast("กำลังตรวจสอบและอัปเดตโครงสร้างคอลัมน์...", "info");
    try {
      const res = await API.post("migrateSchema", { adminId });
      if (res && res.success) {
        Utils.showToast(res.message || "อัปเดตโครงสร้างคอลัมน์เรียบร้อย", "success");
      } else {
        Utils.showToast((res && res.message) || "เกิดข้อผิดพลาด", "danger");
      }
    } catch (e) {
      Utils.showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "danger");
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  window.runSetupDatabase = async function() {
    if (!confirm("คุณต้องการสร้างตารางฐานข้อมูลและใส่ข้อมูลเริ่มต้น (Seed Data) ใช่หรือไม่? (ฟังก์ชันนี้จะไม่ลบชีตที่มีอยู่แล้ว)")) {
      return;
    }
    const btn = document.getElementById("btnSetupDatabase");
    if (btn) btn.disabled = true;
    Utils.showToast("กำลังสร้างฐานข้อมูลเริ่มต้น...", "info");
    try {
      const res = await API.post("setupDatabase", { adminId });
      if (res && res.success) {
        Utils.showToast(res.message || "สร้างฐานข้อมูลเริ่มต้นเรียบร้อยแล้ว", "success");
        loadDashboardStats();
      } else {
        Utils.showToast((res && res.message) || "เกิดข้อผิดพลาด", "danger");
      }
    } catch (e) {
      Utils.showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "danger");
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  // Initial Load
  loadDashboardStats();
});