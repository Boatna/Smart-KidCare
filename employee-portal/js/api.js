/**
 * ==============================================================================
 * API CLIENT FOR EMPLOYEE PORTAL (PRODUCTION)
 * Communicates directly with Google Apps Script (GAS) Web App endpoint
 * - แนบ Session Token ให้ทุก Request อัตโนมัติ (Backend ตรวจสิทธิ์จาก Token)
 * - ถ้า Token หมดอายุ (AUTH_REQUIRED) จะพากลับไปหน้า Login
 * ==============================================================================
 */

const API = (function() {
  const REQUEST_TIMEOUT_MS = 30000;

  const isGasConfigured = () => {
    return Boolean(CONFIG && CONFIG.GAS_API_URL && CONFIG.GAS_API_URL.trim().startsWith("http"));
  };

  function getToken() {
    try {
      const user = (typeof Auth !== "undefined") ? Auth.getUser() : null;
      return (user && user.token) || "";
    } catch (e) {
      return "";
    }
  }

  async function fetchWithTimeout(url, options) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = setTimeout(() => { if (controller) controller.abort(); }, REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, Object.assign({}, options, controller ? { signal: controller.signal } : {}));
    } finally {
      clearTimeout(timer);
    }
  }

  async function parseResponse(response) {
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (parseErr) {
      if (text.includes("<!DOCTYPE") || text.includes("<html")) {
        return {
          success: false,
          message: "Google Apps Script ส่งกลับเป็นหน้าเว็บแทน JSON (กรุณาตรวจสอบว่าได้ตั้งค่า Deploy Web App ให้ Who has access เป็น 'Anyone')"
        };
      }
      return {
        success: false,
        message: "ข้อมูลตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง: " + text.slice(0, 100)
      };
    }

    // Token หมดอายุ / ไม่ถูกต้อง -> ให้ Login ใหม่
    if (result && result.code === "AUTH_REQUIRED" && typeof Auth !== "undefined" && Auth.isLoggedIn()) {
      if (!/login\.html$/i.test(window.location.pathname)) {
        Auth.logout("expired");
      }
    }
    return result;
  }

  function networkError(err) {
    const msg = err && err.name === "AbortError" ? "หมดเวลาการเชื่อมต่อ" : ((err && err.message) || "Network Error");
    return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (" + msg + ")" };
  }

  /**
   * Send HTTP GET to Google Apps Script Web App
   * @param {string} action - API action name (e.g., "getNews", "getApps")
   * @param {object} params - Query parameters
   */
  async function get(action, params = {}) {
    if (!isGasConfigured()) {
      return { success: false, message: "ยังไม่ได้ระบุ GAS_API_URL ในการตั้งค่าระบบ" };
    }

    try {
      const token = getToken();
      const query = new URLSearchParams(Object.assign({ action }, params, token ? { token } : {})).toString();
      const url = `${CONFIG.GAS_API_URL}?${query}`;
      const response = await fetchWithTimeout(url, {
        method: "GET",
        cache: "no-store",
        headers: { "Accept": "application/json" }
      });
      return await parseResponse(response);
    } catch (err) {
      console.warn("GAS GET API request failed:", err);
      return networkError(err);
    }
  }

  /**
   * Send HTTP POST to Google Apps Script Web App
   * Uses Content-Type text/plain to avoid CORS preflight OPTIONS restriction in GAS
   */
  async function post(action, payload = {}) {
    if (!isGasConfigured()) {
      return { success: false, message: "ยังไม่ได้ระบุ GAS_API_URL ในการตั้งค่าระบบ" };
    }

    try {
      const token = getToken();
      const url = `${CONFIG.GAS_API_URL}?action=${encodeURIComponent(action)}`;
      const response = await fetchWithTimeout(url, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(Object.assign({}, payload, { action }, token ? { token } : {}))
      });
      return await parseResponse(response);
    } catch (err) {
      console.warn("GAS POST API request failed:", err);
      return networkError(err);
    }
  }

  return {
    get,
    post,
    isGasConfigured,
    savePushToken: (data) => post("savePushToken", data)
  };
})();