/**
 * ==============================================================================
 * SEASONAL THEME ENGINE (ระบบธีมเทศกาลและวันสำคัญอัตโนมัติ)
 * ==============================================================================
 * 1. ปีใหม่ & คริสต์มาส (25 ธ.ค. - 5 ม.ค.)
 * 2. วาเลนไทน์ (10 - 16 ก.พ.)
 * 3. สงกรานต์ (11 - 17 เม.ย.)
 * 4. ฮาโลวีน (25 - 31 ต.ค.)
 * 5. ลอยกระทง (ตาม LUNAR_HOLIDAYS)
 * 6. วันพระใหญ่ / วันพระ (ตาม LUNAR_HOLIDAYS)
 *
 * แก้ไขรอบนี้:
 *  - ใช้เวลาไทย (Asia/Bangkok) ไม่ใช่เวลาเครื่องผู้ใช้
 *  - ตั้ง data-theme ทันทีที่สคริปต์โหลด (ลดอาการหน้ากะพริบ) แล้วค่อยใส่แบนเนอร์ตอน DOM พร้อม
 *  - เปลี่ยน <meta name="theme-color"> ตามธีม
 *  - ครอบ localStorage/sessionStorage ด้วย try/catch
 *
 * วิธีเพิ่มวันพระ/วันเทศกาลปีถัดไป: เติมใน LUNAR_HOLIDAYS รูปแบบ "YYYY-MM-DD": "ชื่อธีม"
 * (ชื่อธีม: loykrathong | buddhist | newyear | valentine | songkran | halloween)
 * ==============================================================================
 */

const SeasonalTheme = (function() {
  const STORAGE_KEY = "emp_seasonal_theme_override";
  const BANNER_DISMISSED_KEY = "emp_seasonal_banner_dismissed_";

  const THEMES = {
    default: {
      id: "default",
      name: "ธีมปกติ (Fresh Radiant Sky)",
      greeting: "ยินดีต้อนรับสู่ Employee Portal บริการพนักงานองค์กร",
      icon: "🏢",
      badge: ""
    },
    newyear: {
      id: "newyear",
      name: "เทศกาลปีใหม่ & คริสต์มาส",
      greeting: "🎉 สุขสันต์วันปีใหม่ ขอให้พบแต่ความสุข ความเจริญ และความสำเร็จตลอดปี!",
      icon: "🎆",
      badge: "Festive New Year"
    },
    valentine: {
      id: "valentine",
      name: "เทศกาลวาเลนไทน์",
      greeting: "💖 สุขสันต์วันแห่งความรัก ส่งต่อรอยยิ้มและความปรารถนาดีให้เพื่อนร่วมงาน",
      icon: "🌹",
      badge: "Happy Valentine"
    },
    songkran: {
      id: "songkran",
      name: "เทศกาลสงกรานต์ (ปีใหม่ไทย)",
      greeting: "💦 สุขสันต์วันสงกรานต์ ชุ่มฉ่ำ เบิกบานใจ ปลอดภัยทุกการเดินทางร่วมครอบครัว",
      icon: "🔫",
      badge: "Songkran Festival"
    },
    halloween: {
      id: "halloween",
      name: "เทศกาลฮาโลวีน",
      greeting: "🎃 สุขสันต์วันฮาโลวีน ร่วมสนุกและสร้างสรรค์สิ่งดีๆ ไปด้วยกัน",
      icon: "🎃",
      badge: "Happy Halloween"
    },
    loykrathong: {
      id: "loykrathong",
      name: "เทศกาลลอยกระทง",
      greeting: "🌕 สุขสันต์วันลอยกระทง ร่วมสืบสานประเพณีไทย ขอขมาพระแม่คงคา",
      icon: "🪷",
      badge: "Loy Krathong"
    },
    buddhist: {
      id: "buddhist",
      name: "วันสำคัญทางพระพุทธศาสนา",
      greeting: "🪷 วันสำคัญทางศาสนา จิตใจสงบ เบิกบานด้วยสติ ปัญญา และความดีงาม",
      icon: "🙏",
      badge: "Buddhist Holy Day"
    }
  };

  // สีแถบสถานะมือถือ (meta theme-color) ของแต่ละธีม
  const THEME_COLORS = {
    default: "#0284C7",
    newyear: "#dc2626",
    valentine: "#e11d48",
    songkran: "#0284c7",
    halloween: "#ea580c",
    loykrathong: "#4338ca",
    buddhist: "#b45309"
  };

  // ตารางวันจันทรคติ (ลอยกระทง & วันพระใหญ่)
  // ต้องเติมเองทุกปี — ควรคัดวันที่จากปฏิทินทางการ (เช่น สำนักพระพุทธศาสนาแห่งชาติ)
  // วันพระรายสัปดาห์ (ขึ้น/แรม 8 ค่ำ, 15 ค่ำ) ก็เติมที่นี่ได้ด้วย "YYYY-MM-DD": "buddhist"
  const LUNAR_HOLIDAYS = {
    // ลอยกระทง (ขึ้น 15 ค่ำ เดือน 12 - เผื่อช่วงเฉลิมฉลอง +- 1-2 วัน)
    "2024-11-14": "loykrathong", "2024-11-15": "loykrathong", "2024-11-16": "loykrathong",
    "2025-11-04": "loykrathong", "2025-11-05": "loykrathong", "2025-11-06": "loykrathong",
    "2026-11-23": "loykrathong", "2026-11-24": "loykrathong", "2026-11-25": "loykrathong", "2026-11-26": "loykrathong",
    "2027-11-13": "loykrathong", "2027-11-14": "loykrathong", "2027-11-15": "loykrathong",

    // วันพระใหญ่ (มาฆบูชา, วิสาขบูชา, อาสาฬหบูชา, เข้าพรรษา)
    "2025-02-12": "buddhist", "2025-05-11": "buddhist", "2025-07-10": "buddhist", "2025-07-11": "buddhist",
    "2026-03-03": "buddhist", "2026-05-31": "buddhist", "2026-07-29": "buddhist", "2026-07-30": "buddhist",
    "2027-02-21": "buddhist", "2027-05-20": "buddhist", "2027-07-18": "buddhist", "2027-07-19": "buddhist"
  };

  function safeGet(storage, key) {
    try { return storage.getItem(key); } catch (e) { return null; }
  }

  function safeSet(storage, key, value) {
    try { storage.setItem(key, value); } catch (e) {}
  }

  function safeRemove(storage, key) {
    try { storage.removeItem(key); } catch (e) {}
  }

  /** วัน-เดือน-ปี ตามเวลาไทย (ไม่ขึ้นกับ timezone เครื่องผู้ใช้) */
  function getBangkokParts() {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit"
      }).formatToParts(new Date());
      const get = (t) => Number(parts.find(p => p.type === t).value);
      return { year: get("year"), month: get("month"), day: get("day") };
    } catch (e) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
    }
  }

  /** ตรวจว่าวันนี้ตรงกับธีมไหน */
  function detectSeasonalTheme() {
    const override = safeGet(localStorage, STORAGE_KEY);
    if (override && THEMES[override]) return override;

    const { year, month, day } = getBangkokParts();
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    // 1) วันจันทรคติ (ลอยกระทง / วันพระ)
    if (LUNAR_HOLIDAYS[dateKey]) return LUNAR_HOLIDAYS[dateKey];

    // 2) วันสุริยคติ
    if ((month === 12 && day >= 25) || (month === 1 && day <= 5)) return "newyear";
    if (month === 2 && day >= 10 && day <= 16) return "valentine";
    if (month === 4 && day >= 11 && day <= 17) return "songkran";
    if (month === 10 && day >= 25 && day <= 31) return "halloween";

    return "default";
  }

  function applyThemeColorMeta(themeId) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[themeId] || THEME_COLORS.default);
  }

  /** ตั้ง attribute ธีมทันที (ไม่ต้องรอ DOM) */
  function setThemeAttribute(themeId) {
    if (themeId === "default") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", themeId);
    }
    if (document.head) applyThemeColorMeta(themeId);
  }

  /** ใช้ธีม + แบนเนอร์ (เรียกเมื่อ DOM พร้อม) */
  function applyTheme(themeId) {
    const activeTheme = themeId || detectSeasonalTheme();
    const themeInfo = THEMES[activeTheme] || THEMES.default;

    setThemeAttribute(activeTheme);
    applyThemeColorMeta(activeTheme);

    if (activeTheme === "default") {
      removeFestiveBanner();
    } else {
      injectFestiveBanner(themeInfo);
    }

    console.log(`[SeasonalTheme] Active Theme: "${themeInfo.name}" (${activeTheme})`);
    return themeInfo;
  }

  function injectFestiveBanner(themeInfo) {
    const bannerId = "seasonalFestiveBanner";
    const dismissedKey = BANNER_DISMISSED_KEY + themeInfo.id;

    if (safeGet(sessionStorage, dismissedKey) === "true") return;

    let banner = document.getElementById(bannerId);
    if (!banner) {
      banner = document.createElement("div");
      banner.id = bannerId;
      banner.className = "seasonal-festive-banner animate-fade-in";
      const navbar = document.querySelector(".navbar");
      if (navbar && navbar.parentNode) {
        navbar.parentNode.insertBefore(banner, navbar.nextSibling);
      } else {
        document.body.prepend(banner);
      }
    }

    banner.style.display = "";
    banner.innerHTML = `
      <div class="festive-banner-inner">
        <div class="festive-banner-content">
          <span class="festive-banner-icon">${themeInfo.icon}</span>
          <span class="festive-banner-text">${themeInfo.greeting}</span>
          ${themeInfo.badge ? `<span class="festive-banner-badge">${themeInfo.badge}</span>` : ""}
        </div>
        <button type="button" class="festive-banner-close" aria-label="ปิดข้อความอวยพร" title="ปิดข้อความ">
          &times;
        </button>
      </div>
    `;

    const closeBtn = banner.querySelector(".festive-banner-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        banner.style.display = "none";
        safeSet(sessionStorage, dismissedKey, "true");
      });
    }
  }

  function removeFestiveBanner() {
    const banner = document.getElementById("seasonalFestiveBanner");
    if (banner) banner.remove();
  }

  /** บังคับเปลี่ยนธีม (ทดสอบ หรือให้ผู้ใช้เลือกเอง) */
  function setOverrideTheme(themeId) {
    if (themeId && THEMES[themeId]) {
      if (themeId === "default") {
        safeRemove(localStorage, STORAGE_KEY);
        return applyTheme(detectSeasonalTheme());
      }
      safeSet(localStorage, STORAGE_KEY, themeId);
      return applyTheme(themeId);
    }
    return null;
  }

  function getAllThemes() {
    return Object.values(THEMES);
  }

  function init() {
    if (typeof document === "undefined") return;

    // 1) ตั้งสีธีมทันที (ลดอาการกะพริบเป็นสีฟ้าก่อน)
    const id = detectSeasonalTheme();
    setThemeAttribute(id);

    // 2) ใส่แบนเนอร์เมื่อ DOM พร้อม
    const mount = () => applyTheme(id);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount);
    } else {
      mount();
    }
  }

  init();

  return {
    init,
    applyTheme,
    setOverrideTheme,
    detectSeasonalTheme,
    getAllThemes
  };
})();

if (typeof window !== "undefined") {
  window.SeasonalTheme = SeasonalTheme;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = SeasonalTheme;
}