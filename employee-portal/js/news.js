document.addEventListener("DOMContentLoaded", () => {
  Utils.setupNavbar();
  Utils.initModals();

  let newsList = [];
  let currentCategory = "ALL";
  let searchQuery = "";

  const newsGrid = document.getElementById("newsGrid");
  const searchInput = document.getElementById("searchNews");
  const categoryFilters = document.querySelectorAll(".filter-btn");

  let youtubeVideos = [];
  let carouselIndex = 0;
  let carouselSlides = [];
  let carouselTimer = null;
  const carouselTrack = document.getElementById("carouselTrack");
  const carouselDots = document.getElementById("carouselDots");
  const carouselPrevBtn = document.getElementById("carouselPrevBtn");
  const carouselNextBtn = document.getElementById("carouselNextBtn");
  const carouselCounter = document.getElementById("carouselCounter");
  const carouselSection = document.getElementById("newsCarouselSection");

  function initCarousel(items) {
    if (!carouselTrack || !items || items.length === 0) {
      if (carouselSection) carouselSection.style.display = "none";
      return;
    }

    const todayNews = items.filter(n => Utils.isToday(n.publishDate));

    if (todayNews.length >= 2) {
      carouselSlides = todayNews.slice(0, 5);
    } else {
      const otherNews = items.filter(n => !Utils.isToday(n.publishDate));
      carouselSlides = [...todayNews, ...otherNews].slice(0, 5);
    }

    if (carouselSlides.length === 0) {
      if (carouselSection) carouselSection.style.display = "none";
      return;
    }

    if (carouselSection) carouselSection.style.display = "block";
    carouselIndex = 0;
    carouselTrack.innerHTML = carouselSlides.map((item, idx) => {
      const isTodayItem = Utils.isToday(item.publishDate);
      const rawImgUrl = item.imageUrl || "";
      const imgUrl = Utils.formatDriveImageUrl(rawImgUrl) || "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80";
      const catClass = getCategoryBadgeClass(item.category);

      return `
        <div class="carousel-slide ${idx === 0 ? 'active' : ''}" data-index="${idx}" data-id="${Utils.escapeHtml(item.id)}" onclick="openNewsDetail(this.dataset.id)">
          <div class="carousel-slide-content">
            <div class="carousel-slide-meta">
              <span class="badge ${catClass}">${Utils.escapeHtml(item.category || 'General')}</span>
              ${isTodayItem ? '<span class="badge badge-today">🔥 ข่าววันนี้</span>' : ''}
              <span class="carousel-date">
                ${Utils.getIcon('calendar')}
                <span>${Utils.formatDate(item.publishDate)}</span>
              </span>
            </div>
            <h2 class="carousel-slide-title">${Utils.escapeHtml(item.title)}</h2>
            <p class="carousel-slide-desc">${Utils.escapeHtml(item.detail)}</p>
            <div class="carousel-slide-action">
              <span class="btn btn-primary btn-carousel-read">
                <span>อ่านรายละเอียดข่าวนี้</span>
                <span>→</span>
              </span>
            </div>
          </div>
          <div class="carousel-slide-media">
            <img src="${Utils.escapeHtml(imgUrl)}" alt="${Utils.escapeHtml(item.title)}" class="carousel-slide-img" loading="lazy" data-raw="${Utils.escapeHtml(rawImgUrl)}" onerror="Utils.handleImageError(this, this.dataset.raw)">
            <div class="carousel-slide-media-overlay"></div>
          </div>
        </div>
      `;
    }).join("");

    // Render Dots
    if (carouselDots) {
      carouselDots.innerHTML = carouselSlides.map((_, idx) => `
        <button class="carousel-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}" aria-label="สไลด์ที่ ${idx + 1}"></button>
      `).join("");

      carouselDots.querySelectorAll(".carousel-dot").forEach(dot => {
        dot.addEventListener("click", (e) => {
          e.stopPropagation();
          const targetIdx = parseInt(dot.getAttribute("data-index"), 10);
          goToSlide(targetIdx);
          startCarouselAutoPlay();
        });
      });
    }

    updateSlidePosition();
    startCarouselAutoPlay();
    setupCarouselTouch();
  }

  function updateSlidePosition() {
    if (!carouselTrack || carouselSlides.length === 0) return;

    carouselTrack.style.transform = `translateX(-${carouselIndex * 100}%)`;

    // Update dots
    if (carouselDots) {
      const dots = carouselDots.querySelectorAll(".carousel-dot");
      dots.forEach((dot, idx) => {
        dot.classList.toggle("active", idx === carouselIndex);
      });
    }

    // Update Counter
    if (carouselCounter) {
      carouselCounter.innerText = `${carouselIndex + 1} / ${carouselSlides.length}`;
    }
  }

  function goToSlide(index) {
    if (carouselSlides.length <= 1) return;
    if (index < 0) {
      carouselIndex = carouselSlides.length - 1;
    } else if (index >= carouselSlides.length) {
      carouselIndex = 0;
    } else {
      carouselIndex = index;
    }
    updateSlidePosition();
  }

  function nextSlide() {
    goToSlide(carouselIndex + 1);
  }

  function prevSlide() {
    goToSlide(carouselIndex - 1);
  }

  function startCarouselAutoPlay() {
    stopCarouselAutoPlay();
    if (carouselSlides.length > 1) {
      carouselTimer = setInterval(nextSlide, 5000);
    }
  }

  function stopCarouselAutoPlay() {
    if (carouselTimer) {
      clearInterval(carouselTimer);
      carouselTimer = null;
    }
  }

  const carouselFloatPrev = document.getElementById("carouselFloatPrev");
  const carouselFloatNext = document.getElementById("carouselFloatNext");

  if (carouselPrevBtn) {
    carouselPrevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      prevSlide();
      startCarouselAutoPlay();
    });
  }

  if (carouselNextBtn) {
    carouselNextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      nextSlide();
      startCarouselAutoPlay();
    });
  }

  if (carouselFloatPrev) {
    carouselFloatPrev.addEventListener("click", (e) => {
      e.stopPropagation();
      prevSlide();
      startCarouselAutoPlay();
    });
  }

  if (carouselFloatNext) {
    carouselFloatNext.addEventListener("click", (e) => {
      e.stopPropagation();
      nextSlide();
      startCarouselAutoPlay();
    });
  }

  // Pause autoplay on mouse hover (เฉพาะอุปกรณ์ที่มีเมาส์จริง; บนมือถือ mouseleave ไม่ยิง ทำให้สไลด์หยุดค้าง)
  const canHover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (carouselSection && canHover) {
    carouselSection.addEventListener("mouseenter", stopCarouselAutoPlay);
    carouselSection.addEventListener("mouseleave", startCarouselAutoPlay);
  }

  // Touch Swipe Gesture for Mobile and Tablet (with vertical scroll intent detection)
  function setupCarouselTouch() {
    if (!carouselTrack) return;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    carouselTrack.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
      stopCarouselAutoPlay();
    }, { passive: true });

    carouselTrack.addEventListener("touchend", (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe();
      startCarouselAutoPlay();
    }, { passive: true });

    function handleSwipe() {
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      // Only trigger horizontal slide swipe when horizontal movement dominates vertical scroll
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
        if (deltaX < 0) {
          nextSlide(); // Swiped left -> show next
        } else {
          prevSlide(); // Swiped right -> show prev
        }
      }
    }
  }

  // Keyboard Navigation
  document.addEventListener("keydown", (e) => {
    if (document.activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
    if (document.querySelector(".modal-backdrop.show")) return;
    if (e.key === "ArrowLeft") prevSlide();
    if (e.key === "ArrowRight") nextSlide();
  });


  // ==============================================================================
  // 2. NEWS LIST & FILTERING
  // ==============================================================================
  // เปิดข่าวตามลิงก์จากการแจ้งเตือน เช่น index.html?newsId=N123456
  function openNewsFromQuery() {
    try {
      const params = new URLSearchParams(window.location.search);
      const newsId = params.get("newsId");
      if (!newsId) return;
      if (newsList.some(item => String(item.id) === String(newsId))) {
        window.openNewsDetail(newsId);
      }
      params.delete("newsId");
      const qs = params.toString();
      history.replaceState(null, "", window.location.pathname + (qs ? "?" + qs : "") + window.location.hash);
    } catch (e) {}
  }

  async function loadNews() {
    newsGrid.innerHTML = Utils.renderNewsSkeletons(6);

    try {
      const res = await API.get("getNews");

      if (res.success && Array.isArray(res.data)) {
        newsList = res.data;
        initCarousel(newsList);
        renderNews();
        openNewsFromQuery();
      } else {
        showError(res.message || "ไม่สามารถดึงข้อมูลข่าวสารได้");
      }
    } catch (e) {
      showError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    }
  }

  function renderNews() {
    let filtered = newsList.filter(item => {
      const matchesCat = currentCategory === "ALL" || (item.category && item.category.trim().toUpperCase() === currentCategory.trim().toUpperCase());
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.detail && item.detail.toLowerCase().includes(q));

      return matchesCat && matchesSearch;
    });

    if (filtered.length === 0) {
      newsGrid.innerHTML = `
        <div class="empty-state animate-fade-in" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">📰</div>
          <h3>ไม่พบข่าวสารที่ค้นหา</h3>
          <p class="empty-state-text">ลองเปลี่ยนคำค้นหาหรือตัวกรองหมวดหมู่อีกครั้ง</p>
        </div>
      `;
      return;
    }

    newsGrid.innerHTML = filtered.map((item, index) => {
      const rawImgUrl = item.imageUrl || "";
      const imgUrl = Utils.formatDriveImageUrl(rawImgUrl) || "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80";
      const catClass = getCategoryBadgeClass(item.category);
      const isTodayItem = Utils.isToday(item.publishDate);
      const delay = Math.min(index * 0.05, 0.4);

      return `
        <article class="news-card animate-slide-up" style="animation-delay: ${delay}s;" data-id="${Utils.escapeHtml(item.id)}" onclick="openNewsDetail(this.dataset.id)">
          <div class="news-card-img-wrapper">
            <span class="badge ${catClass} news-card-badge">${Utils.escapeHtml(item.category || 'General')}</span>
            ${isTodayItem ? '<span class="badge badge-today news-card-badge-today">🔥 วันนี้</span>' : ''}
            <img src="${Utils.escapeHtml(imgUrl)}" alt="${Utils.escapeHtml(item.title)}" class="news-card-img" loading="lazy" data-raw="${Utils.escapeHtml(rawImgUrl)}" onerror="Utils.handleImageError(this, this.dataset.raw)">
          </div>
          <div class="news-card-body">
            <div class="news-card-date">
              ${Utils.getIcon('calendar')}
              <span>${Utils.formatDate(item.publishDate)}</span>
            </div>
            <h3 class="news-card-title">${Utils.escapeHtml(item.title)}</h3>
            <p class="news-card-desc">${Utils.escapeHtml(item.detail)}</p>
            <div class="news-card-footer">
              <span>อ่านรายละเอียด</span>
              <span style="transition: transform 0.2s ease;">→</span>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function getCategoryBadgeClass(cat) {
    switch (String(cat).toUpperCase()) {
      case "ANNOUNCEMENT": return "badge-primary";
      case "ACTIVITY": return "badge-success";
      case "PRODUCTION": return "badge-warning";
      case "HR": return "badge-secondary";
      default: return "badge-primary";
    }
  }

  function showError(msg) {
    newsGrid.innerHTML = `
      <div class="empty-state animate-fade-in" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">⚠️</div>
        <h3>เกิดข้อผิดพลาด</h3>
        <p class="empty-state-text">${Utils.escapeHtml(msg)}</p>
        <button class="btn btn-secondary btn-sm" onclick="location.reload()" style="margin-top: 1rem;">ลองใหม่อีกครั้ง</button>
      </div>
    `;
  }

  // Search input with debounce
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchQuery = e.target.value;
        renderNews();
      }, 150);
    });
  }

  // Category Filter Events
  categoryFilters.forEach(btn => {
    btn.addEventListener("click", () => {
      categoryFilters.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.getAttribute("data-category") || "ALL";
      renderNews();
    });
  });

  // Popup Modal Handler
  window.openNewsDetail = function(id) {
    const item = newsList.find(n => String(n.id) === String(id));
    if (!item) return;

    const modalTitle = document.getElementById("modalNewsTitle");
    const modalImage = document.getElementById("modalNewsImage");
    const modalDate = document.getElementById("modalNewsDate");
    const modalCategory = document.getElementById("modalNewsCategory");
    const modalDetail = document.getElementById("modalNewsDetail");
    const modalLink = document.getElementById("modalNewsLink");

    if (modalTitle) modalTitle.innerText = item.title;
    if (modalImage) {
      const rawImgUrl = item.imageUrl || "";
      modalImage.dataset.triedThumbnail = "";
      modalImage.onerror = () => Utils.handleImageError(modalImage, rawImgUrl);
      modalImage.src = Utils.formatDriveImageUrl(rawImgUrl) || "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80";
      modalImage.alt = item.title;
    }
    if (modalDate) modalDate.innerText = Utils.formatDate(item.publishDate);
    if (modalCategory) {
      modalCategory.innerText = item.category || "General";
      modalCategory.className = `badge ${getCategoryBadgeClass(item.category)}`;
    }
    if (modalDetail) modalDetail.innerText = item.detail;

    if (modalLink) {
      const safeLink = Utils.safeUrl(item.url);
      if (safeLink && safeLink !== "#") {
        modalLink.href = safeLink;
        modalLink.rel = "noopener noreferrer";
        modalLink.style.display = "inline-flex";
      } else {
        modalLink.style.display = "none";
      }
    }

    Utils.openModal("newsDetailModal");
  };


  // ==============================================================================
  // 3. YOUTUBE VIDEO SECTION (แสดง 3 ช่อง)
  // ==============================================================================
  const youtubeGrid = document.getElementById("youtubeGrid");
  const youtubeAdminActions = document.getElementById("youtubeAdminActions");
  const editVideosForm = document.getElementById("editVideosForm");

  async function loadYouTubeVideos() {
    // 1. Try local storage cache first
    try {
      const cached = localStorage.getItem("emp_portal_youtube_videos");
      if (cached) {
        youtubeVideos = JSON.parse(cached);
      }
    } catch (e) {
      // Ignore cache parse error
    }

    // 2. Fallback to CONFIG default if no cache
    if (!youtubeVideos || youtubeVideos.length === 0) {
      youtubeVideos = CONFIG.YOUTUBE_VIDEOS || [];
    }

    renderYouTubeVideos();

    // 3. Check Admin status to show quick edit button (Admin only)
    const user = Auth.getUser();
    if (user && user.isAdmin && youtubeAdminActions) {
      youtubeAdminActions.style.display = "block";
    } else if (youtubeAdminActions) {
      youtubeAdminActions.style.display = "none";
    }

    // 4. Try fetching latest videos from Google Sheet / API in background
    try {
      const res = await API.get("getVideos");
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        youtubeVideos = res.data.slice(0, 3);
        localStorage.setItem("emp_portal_youtube_videos", JSON.stringify(youtubeVideos));
        renderYouTubeVideos();
      }
    } catch (e) {
      // Continue with current videos if offline
    }
  }

  function renderYouTubeVideos() {
    if (!youtubeGrid) return;

    // Ensure we always have exactly 3 slots
    const slots = [];
    for (let i = 0; i < 3; i++) {
      slots.push(youtubeVideos[i] || (CONFIG.YOUTUBE_VIDEOS && CONFIG.YOUTUBE_VIDEOS[i]) || {
        id: `yt-${i + 1}`,
        title: `วิดีโอประชาสัมพันธ์ ช่องที่ ${i + 1}`,
        url: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
        category: "ประชาสัมพันธ์",
        description: "ติดตามข่าวสารและวิดีโอแนะนำการปฏิบัติงานผ่านช่องทางนี้"
      });
    }

    youtubeGrid.innerHTML = slots.map((item, idx) => {
      const embedUrl = Utils.getYouTubeEmbedUrl(item.url);
      const videoId = Utils.extractYouTubeId(item.url);
      const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : (item.url || "https://www.youtube.com");
      const slotNum = idx + 1;

      return `
        <div class="youtube-card animate-slide-up" style="animation-delay: ${idx * 0.1}s;">
          <div class="youtube-player-wrapper">
            <span class="youtube-slot-badge">ช่องที่ ${slotNum}</span>
            ${embedUrl ? `
              <iframe 
                src="${embedUrl}" 
                title="${Utils.escapeHtml(item.title)}" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowfullscreen 
                loading="lazy">
              </iframe>
            ` : `
              <div class="youtube-placeholder">
                <p>ไม่พบคลิปวิดีโอ</p>
              </div>
            `}
          </div>
          <div class="youtube-card-body">
            <div class="youtube-card-meta">
              <span class="badge badge-secondary">${Utils.escapeHtml(item.category || 'วิดีโอ')}</span>
              <span class="youtube-channel-label">YouTube Slot ${slotNum}</span>
            </div>
            <h3 class="youtube-card-title">${Utils.escapeHtml(item.title)}</h3>
            <p class="youtube-card-desc">${Utils.escapeHtml(item.description || 'รับชมวิดีโอสาระน่ารู้และคู่มือการทำงาน')}</p>
            <div class="youtube-card-footer">
              <a href="${Utils.escapeHtml(watchUrl)}" target="_blank" rel="noopener noreferrer" class="youtube-link-btn">
                <span>เปิดดูบน YouTube</span>
                ${Utils.getIcon('externalLink')}
              </a>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // Admin Quick Video Edit Modal (Strict Admin Permission)
  window.openEditVideosModal = function() {
    if (!Auth.isAdmin()) {
      Utils.showToast("เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถแก้ไขวิดีโอได้", "warning");
      return;
    }

    const v1 = youtubeVideos[0] || (CONFIG.YOUTUBE_VIDEOS && CONFIG.YOUTUBE_VIDEOS[0]) || {};
    const v2 = youtubeVideos[1] || (CONFIG.YOUTUBE_VIDEOS && CONFIG.YOUTUBE_VIDEOS[1]) || {};
    const v3 = youtubeVideos[2] || (CONFIG.YOUTUBE_VIDEOS && CONFIG.YOUTUBE_VIDEOS[2]) || {};

    const t1 = document.getElementById("videoTitle1");
    const u1 = document.getElementById("videoUrl1");
    const d1 = document.getElementById("videoDesc1");

    const t2 = document.getElementById("videoTitle2");
    const u2 = document.getElementById("videoUrl2");
    const d2 = document.getElementById("videoDesc2");

    const t3 = document.getElementById("videoTitle3");
    const u3 = document.getElementById("videoUrl3");
    const d3 = document.getElementById("videoDesc3");

    if (t1) t1.value = v1.title || "";
    if (u1) u1.value = v1.url || "";
    if (d1) d1.value = v1.description || "";

    if (t2) t2.value = v2.title || "";
    if (u2) u2.value = v2.url || "";
    if (d2) d2.value = v2.description || "";

    if (t3) t3.value = v3.title || "";
    if (u3) u3.value = v3.url || "";
    if (d3) d3.value = v3.description || "";

    Utils.openModal("editVideosModal");
  };

  if (editVideosForm) {
    editVideosForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!Auth.isAdmin()) {
        Utils.showToast("เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถแก้ไขวิดีโอได้", "warning");
        return;
      }
      const saveBtn = document.getElementById("btnSaveVideos");
      if (saveBtn) saveBtn.disabled = true;

      const newVideos = [
        {
          id: "yt-1",
          title: document.getElementById("videoTitle1")?.value.trim() || "วิดีโอช่องที่ 1",
          url: document.getElementById("videoUrl1")?.value.trim() || "",
          description: document.getElementById("videoDesc1")?.value.trim() || "",
          category: (youtubeVideos[0] && youtubeVideos[0].category) || "แนะนำองค์กร",
          order: 1,
          status: "Active"
        },
        {
          id: "yt-2",
          title: document.getElementById("videoTitle2")?.value.trim() || "วิดีโอช่องที่ 2",
          url: document.getElementById("videoUrl2")?.value.trim() || "",
          description: document.getElementById("videoDesc2")?.value.trim() || "",
          category: (youtubeVideos[1] && youtubeVideos[1].category) || "คู่มือการใช้งาน",
          order: 2,
          status: "Active"
        },
        {
          id: "yt-3",
          title: document.getElementById("videoTitle3")?.value.trim() || "วิดีโอช่องที่ 3",
          url: document.getElementById("videoUrl3")?.value.trim() || "",
          description: document.getElementById("videoDesc3")?.value.trim() || "",
          category: (youtubeVideos[2] && youtubeVideos[2].category) || "ความปลอดภัย",
          order: 3,
          status: "Active"
        }
      ];

      const badIdx = newVideos.findIndex(v => !Utils.extractYouTubeId(v.url));
      if (badIdx !== -1) {
        Utils.showToast(`ลิงก์ YouTube ช่องที่ ${badIdx + 1} ไม่ถูกต้อง`, "warning");
        if (saveBtn) saveBtn.disabled = false;
        return;
      }

      try {
        const user = Auth.getUser();
        const res = await API.post("updateVideos", {
          videos: newVideos,
          adminId: user ? user.employeeId : ""
        });
        if (res && res.success) {
          // อัปเดตหน้าจอและแคชเฉพาะเมื่อเซิร์ฟเวอร์บันทึกสำเร็จเท่านั้น
          youtubeVideos = newVideos;
          localStorage.setItem("emp_portal_youtube_videos", JSON.stringify(newVideos));
          renderYouTubeVideos();
          Utils.showToast(res.message || "บันทึกลิงก์วิดีโอ YouTube ทั้ง 3 ช่องสำเร็จ!", "success");
        } else {
          Utils.showToast((res && res.message) || "บันทึกล้มเหลว: เฉพาะผู้ดูแลระบบเท่านั้น", "danger");
        }
      } catch (err) {
        Utils.showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ ยังไม่ได้บันทึกข้อมูล", "danger");
      }

      if (saveBtn) saveBtn.disabled = false;
      Utils.closeModal("editVideosModal");
    });
  }

  // Load everything
  loadNews();
  loadYouTubeVideos();
});