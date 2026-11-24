/**
 * ==============================================================================
 * AUTHENTICATION & SESSION MANAGEMENT
 * ==============================================================================
 */

const Auth = (function() {
  const SESSION_KEY = "emp_portal_session";
  const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000; // ต้องตรงกับ SESSION_TTL_MS ใน Code.gs

  function getUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw);
      // Session เก่าที่ไม่มี token หรือหมดอายุแล้ว ให้ถือว่าไม่ได้ Login
      if (!user || !user.token || !user._savedAt || (Date.now() - user._savedAt) > SESSION_MAX_AGE_MS) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return user;
    } catch (e) {
      return null;
    }
  }

  function saveSession(user) {
    if (!user) return;
    localStorage.setItem(SESSION_KEY, JSON.stringify(Object.assign({}, user, { _savedAt: Date.now() })));
  }

  function logout(reason) {
    localStorage.removeItem(SESSION_KEY);
    if (reason === "expired") {
      try { sessionStorage.setItem("session_expired", "1"); } catch (e) {}
    }
    window.location.href = "login.html";
  }

  function isLoggedIn() {
    const user = getUser();
    return Boolean(user && user.employeeId);
  }

  function isAdmin() {
    const user = getUser();
    return user && user.isAdmin === true;
  }

  function requireAuth(redirectUrl = "login.html") {
    if (!isLoggedIn()) {
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  }

  function requireAdmin(redirectUrl = "index.html") {
    if (!isLoggedIn()) {
      window.location.href = "login.html";
      return false;
    }
    if (!isAdmin()) {
      alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะผู้ดูแลระบบ)");
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  }

  // Attempt to detect client IP (non-blocking with timeout fallback)
  async function getClientIp() {
    try {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeoutId = setTimeout(() => {
        if (controller) controller.abort();
      }, 1500);

      const fetchOpts = {};
      if (controller) fetchOpts.signal = controller.signal;

      const res = await fetch("https://api.ipify.org?format=json", fetchOpts);
      clearTimeout(timeoutId);
      const data = await res.json();
      return data.ip || "127.0.0.1";
    } catch (e) {
      return "127.0.0.1 (Local)";
    }
  }

  return {
    getUser,
    saveSession,
    logout,
    isLoggedIn,
    isAdmin,
    requireAuth,
    requireAdmin,
    getClientIp
  };
})();