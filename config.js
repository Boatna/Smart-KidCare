// ═══════════════════════════════════════════════════════════════
//  config.js — ตั้งค่า URL ของ Apps Script Web App
//
//  วิธีหา URL:
//  1. เปิด Apps Script project → Deploy → Manage deployments
//  2. คัดลอก Web app URL (ลงท้ายด้วย /exec)
//  3. วางใน APPS_SCRIPT_URL ด้านล่าง
// ═══════════════════════════════════════════════════════════════

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbynuWbMUJyh1gO-yPvoTSxzaY-wGxhGqrD9pLfzuFmB7WUWNT_Z3q_SwzK_sqhYfbWo/exec";

/**
 * เรียก Apps Script Web App
 * @param {string} action - ชื่อ action ที่ต้องการเรียก
 * @param {object} params - parameters เพิ่มเติม
 * @returns {Promise<object>} - ผลลัพธ์จาก Apps Script
 */
async function callAPI(action, params = {}) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    // Apps Script Web App ต้องการ redirect ดังนั้น redirect: "follow" จำเป็น
    redirect: "follow",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({ action, ...params }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  return response.json();
}