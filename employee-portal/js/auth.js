const Auth = (function() {
  const SESSION_KEY = "emp_portal_session";
  const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

  function getUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw);
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

  // ออกจากระบบด้วยตัวเอง -> กลับหน้าแรก (index.html)
  // เซสชันหมดอายุ/ถูกปิดบัญชี (reason = "expired") -> ไปหน้า Login พร้อมข้อความแจ้ง
  function logout(reason) {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
    if (reason === "expired") {
      try { sessionStorage.setItem("session_expired", "1"); } catch (e) {}
      window.location.replace("login.html");
      return;
    }
    window.location.replace("index.html");
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

  // กันหน้าที่ต้อง Login ค้างอยู่หลังออกจากระบบ (ปุ่ม Back / แท็บอื่น)
  const loggedInAtLoad = isLoggedIn();
  window.addEventListener("pageshow", (e) => {
    if (e.persisted && isLoggedIn() !== loggedInAtLoad) window.location.reload();
  });
  window.addEventListener("storage", (e) => {
    if (e.key === SESSION_KEY && !e.newValue && loggedInAtLoad) {
      window.location.replace("index.html");
    }
  });

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