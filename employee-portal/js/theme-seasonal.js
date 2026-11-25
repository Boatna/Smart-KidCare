const SeasonalTheme = (function () {
  const DEFAULT_COLOR = "#0284C7";

  function cleanup() {
    try { localStorage.removeItem("emp_seasonal_theme_override"); } catch (e) {}
    try {
      Object.keys(sessionStorage).forEach(function (k) {
        if (k.indexOf("emp_seasonal_banner_dismissed_") === 0) sessionStorage.removeItem(k);
      });
    } catch (e) {}

    document.documentElement.removeAttribute("data-theme");

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", DEFAULT_COLOR);

    const removeBanner = function () {
      const banner = document.getElementById("seasonalFestiveBanner");
      if (banner) banner.remove();
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", removeBanner);
    } else {
      removeBanner();
    }
  }

  cleanup();

  return {
    init: cleanup,
    applyTheme: function () { return null; },
    setOverrideTheme: function () { return null; },
    detectSeasonalTheme: function () { return "default"; },
    getAllThemes: function () { return []; }
  };
})();

if (typeof window !== "undefined") {
  window.SeasonalTheme = SeasonalTheme;
}