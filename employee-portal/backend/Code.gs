const SPREADSHEET_ID = "1bePdeRo_aHmPK-764Kt_6ePXGra85_6h1KUIWwXRVsI";

let _dbCache = null;

function getDB() {
  if (_dbCache) return _dbCache;

  // หากเป็น Container-bound Script ที่ผูกกับชีตอยู่แล้ว ให้ใช้ชีตปัจจุบันทันที
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) { _dbCache = active; return _dbCache; }
  } catch (e) {}

  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    try {
      _dbCache = SpreadsheetApp.openById(SPREADSHEET_ID.trim());
      return _dbCache;
    } catch (err) {
      console.warn("Could not open spreadsheet by ID, falling back to active:", err);
    }
  }
  _dbCache = SpreadsheetApp.getActiveSpreadsheet();
  return _dbCache;
}

// ============================================================================
// SECURITY & COMMON HELPERS
// ============================================================================
const TZ = "Asia/Bangkok";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // Session token อายุ 12 ชั่วโมง
const MAX_LOGIN_FAILS = 5;                  // ใส่ PIN ผิดได้กี่ครั้ง
const LOCKOUT_SECONDS = 900;                // ล็อก 15 นาที
const CONTACT_STATUSES = ["Open", "In Progress", "Closed"];
const NEWS_CACHE_KEY = "news_active_v1";    // แคชรายการข่าว Active (ลดการอ่านชีตซ้ำๆ จาก polling)
const NEWS_CACHE_SEC = 300;                 // แคช 5 นาที
const CONTACT_RATE_MAX = 5;                 // ส่งเรื่องแจ้งปัญหาได้กี่ครั้ง
const CONTACT_RATE_WINDOW_SEC = 600;        // ภายในกี่วินาที (10 นาที)
const DEFAULT_VIDEOS = [
  ["yt-1", "หลักสูตรอุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล", "https://youtu.be/T1CSETUYaEo?si=y0CkQ9_GhPeFtBN-", "แนวทางปฏิบัติตามมาตรฐานความปลอดภัย อาชีวอนามัย และการบริหารจัดการสิ่งแวดล้อมอย่างยั่งยืน", "หลักสูตรแนะนำ", 1, "Active"],
  ["yt-2", "[เรียนรู้ 5ส.] ส.สะดวก", "https://youtu.be/TMy6mko6zHU?si=LcPBYO3ccRQ7m7Yd", "แนวทางปฏิบัติตามมาตรฐานความปลอดภัย อาชีวอนามัย และการบริหารจัดการสิ่งแวดล้อมอย่างยั่งยืน", "เรียนรู้ 5 ส.", 2, "Active"],
  ["yt-3", "[สื่อการสอนงานติดตั้งเครื่องปรับอากาศขนาดเล็ก] เครื่องมือสำหรับงานติดตั้ง", "https://youtu.be/3u_ybJdNzOU?si=C9K4gfO-6SSVe8IE", "แนวทางปฏิบัติตามมาตรฐานความปลอดภัย อาชีวอนามัย และการบริหารจัดการสิ่งแวดล้อมอย่างยั่งยืน", "สื่อการสอน", 3, "Active"]
];

let _tzCache = null;
function getSheetTz_() {
  if (_tzCache) return _tzCache;
  try { _tzCache = getDB().getSpreadsheetTimeZone() || TZ; } catch (e) { _tzCache = TZ; }
  return _tzCache;
}

function nowString_() {
  return Utilities.formatDate(new Date(), getSheetTz_(), "yyyy-MM-dd HH:mm:ss");
}

function dateValue_(s) {
  if (!s) return 0;
  const t = new Date(String(s).replace(" ", "T")).getTime();
  return isNaN(t) ? 0 : t;
}

// กัน Formula Injection ใน Google Sheets (ค่าที่ขึ้นต้นด้วย = + - @ จะถูกเก็บเป็นข้อความ)
function safeCell_(v) {
  if (typeof v !== "string") return v;
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

function getSessionSecret_() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty("SESSION_SECRET");
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty("SESSION_SECRET", secret);
  }
  return secret;
}

// ---------------------------------------------------------------------------
// PIN HASHING (เก็บ PIN เป็น SHA-256 + pepper แทนข้อความธรรมดา)
// ---------------------------------------------------------------------------
function getPinPepper_() {
  const props = PropertiesService.getScriptProperties();
  let pepper = props.getProperty("PIN_PEPPER");
  if (!pepper) {
    pepper = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty("PIN_PEPPER", pepper);
  }
  return pepper;
}

// รัน "ครั้งเดียว" จาก Apps Script Editor ก่อนเปิดใช้งานจริง เพื่อสร้างกุญแจลับ (SESSION_SECRET, PIN_PEPPER)
// ไว้ล่วงหน้า กันกรณีมีคน Login พร้อมกันครั้งแรกแล้วกุญแจถูกสร้างซ้อนกัน
function initSecurity() {
  getSessionSecret_();
  getPinPepper_();
  return { success: true, message: "สร้างกุญแจความปลอดภัยเรียบร้อย (SESSION_SECRET, PIN_PEPPER)" };
}

// ห้ามลบ/เปลี่ยนค่า PIN_PEPPER ใน Script Properties หลังเริ่มใช้งาน มิฉะนั้นทุกคน Login ไม่ได้
function normIdForHash_(employeeId) {
  const s = cleanId(employeeId).toLowerCase();
  return /^\d+$/.test(s) ? (s.replace(/^0+/, "") || "0") : s;
}

// ใช้ ID แบบ normalize (ตัด 0 นำหน้าของรหัสที่เป็นตัวเลขล้วน) เพราะ Google Sheets มักแปลง "01234" เป็นเลข 1234
function hashPin_(employeeId, pin) {
  const raw = getPinPepper_() + "|" + normIdForHash_(employeeId) + "|" + String(pin);
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return "h:" + Utilities.base64EncodeWebSafe(digest);
}

// สูตรเดิม (ก่อนแก้) ไว้ตรวจ hash เก่า แล้วระบบจะอัปเกรดเป็นสูตรใหม่ให้อัตโนมัติเมื่อ Login สำเร็จ
function hashPinLegacy_(employeeId, pin) {
  const raw = getPinPepper_() + "|" + cleanId(employeeId).toLowerCase() + "|" + String(pin);
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return "h:" + Utilities.base64EncodeWebSafe(digest);
}

// สร้าง ID ไม่ซ้ำ: prefix + วันเวลา(วินาที) + เลขสุ่ม 3 หลัก (เดิมใช้ 5-6 หลักท้ายของ timestamp ซึ่งวนซ้ำทุก ~16 นาที)
function genId_(prefix) {
  const stamp = Utilities.formatDate(new Date(), TZ, "yyMMddHHmmss");
  const rand = Math.floor(Math.random() * 90000) + 10000; // 5 หลัก: ลดโอกาส ID ซ้ำเมื่อบันทึกพร้อมกันในวินาทีเดียวกัน
  return prefix + stamp + rand;
}

// เทียบรหัสพนักงาน: ตัวเลขล้วนเทียบแบบตัด 0 นำหน้า / ตัวอักษรเทียบแบบไม่สนตัวพิมพ์
function sameEmpId_(a, b) {
  const x = cleanId(a).toLowerCase();
  const y = cleanId(b).toLowerCase();
  if (!x || !y) return false;
  if (x === y) return true;
  return /^\d+$/.test(x) && /^\d+$/.test(y) && x.replace(/^0+/, "") === y.replace(/^0+/, "");
}

function isHashedPin_(value) {
  return String(value || "").indexOf("h:") === 0;
}

function loginFailKey_(employeeId) {
  return "loginfail_" + normIdForHash_(employeeId).replace(/[^a-z0-9]/g, "").slice(0, 40);
}

// จองสิทธิ์พยายาม Login แบบ atomic (ใช้ Lock สั้นๆ) กัน Brute-force ด้วยการยิง request พร้อมกัน
function reserveLoginAttempt_(cache, failKey) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const count = Number(cache.get(failKey) || 0);
    if (count >= MAX_LOGIN_FAILS) return false;
    cache.put(failKey, String(count + 1), LOCKOUT_SECONDS);
    return true;
  } finally {
    lock.releaseLock();
  }
}

function clearNewsCache_() {
  try { CacheService.getScriptCache().remove(NEWS_CACHE_KEY); } catch (e) {}
}

function signSession_(employeeId) {
  const body = Utilities.base64EncodeWebSafe(employeeId + "|" + (Date.now() + SESSION_TTL_MS));
  const sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(body, getSessionSecret_()));
  return body + "." + sig;
}

function verifySession_(token) {
  try {
    if (!token) return "";
    const parts = String(token).split(".");
    if (parts.length !== 2) return "";
    const expected = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(parts[0], getSessionSecret_()));
    if (expected !== parts[1]) return "";
    const decoded = Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString();
    const idx = decoded.lastIndexOf("|");
    const exp = Number(decoded.slice(idx + 1));
    if (!exp || Date.now() > exp) return "";
    return decoded.slice(0, idx);
  } catch (e) {
    return "";
  }
}

function authError_(code, message) {
  return { success: false, code: code, message: message };
}

function userCacheKey_(employeeId) {
  return "uactive_" + normIdForHash_(employeeId).replace(/[^a-z0-9]/g, "").slice(0, 40);
}

function clearUserActiveCache_(employeeId) {
  try { CacheService.getScriptCache().remove(userCacheKey_(employeeId)); } catch (e) {}
}

// ตรวจว่าบัญชียัง Active อยู่ (แคช 2 นาที) เพื่อให้การ "ปิดการใช้งาน" มีผลกับ Token ที่ออกไปแล้วด้วย
function isUserActive_(employeeId) {
  const key = userCacheKey_(employeeId);
  let cache = null;
  try {
    cache = CacheService.getScriptCache();
    const hit = cache.get(key);
    if (hit !== null) return hit === "1";
  } catch (e) {}

  let active = true; // ถ้าอ่านชีตไม่ได้ชั่วคราว ให้ผ่านไปก่อน ไม่ล็อกทุกคนออก
  try {
    const sheet = getDB().getSheetByName("Users");
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      if (data.length > 1) {
        const headers = data[0].map(normalizeHeader_);
        const empIdCol = headers.indexOf("employeeid") !== -1 ? headers.indexOf("employeeid") : 0;
        const statusCol = headers.indexOf("status");
        const target = cleanId(employeeId);
        let found = false;
        for (let i = 1; i < data.length; i++) {
          const rowId = cleanId(data[i][empIdCol]);
          const match = rowId.toLowerCase() === target.toLowerCase() ||
            (/^\d+$/.test(rowId) && /^\d+$/.test(target) && rowId.replace(/^0+/, "") === target.replace(/^0+/, ""));
          if (match) {
            found = true;
            active = statusCol === -1 ? true : String(data[i][statusCol] || "Active").trim().toLowerCase() === "active";
            break;
          }
        }
        if (!found) active = false;
      }
    }
  } catch (e) {}

  try { if (cache) cache.put(key, active ? "1" : "0", 120); } catch (e) {}
  return active;
}

function requireSession_(token) {
  const id = verifySession_(token);
  if (!id) return { error: authError_("AUTH_REQUIRED", "เซสชันหมดอายุหรือยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่") };
  if (!isUserActive_(id)) return { error: authError_("AUTH_REQUIRED", "บัญชีนี้ถูกปิดใช้งานหรือไม่พบในระบบ กรุณาติดต่อผู้ดูแลระบบ") };
  return { employeeId: id };
}

function requireAdmin_(token) {
  const s = requireSession_(token);
  if (s.error) return s;
  if (!checkAdminStatus(s.employeeId).isAdmin) {
    return { error: authError_("FORBIDDEN", "สิทธิ์ไม่เพียงพอ: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น") };
  }
  return { employeeId: s.employeeId };
}

const SHEET_HEADERS = {
  Users: ["EmployeeID", "Name", "Department", "Position", "Plant", "PIN", "Status"],
  Admin: ["EmployeeID", "Name", "Role", "Status"],
  LoginLog: ["DateTime", "EmployeeID", "Name", "IP", "Status"],
  LogAdmin: ["DateTime", "AdminID", "Action", "Detail"],
  News: ["ID", "Title", "Detail", "URL", "ImageUrl", "Category", "Status", "PublishDate"],
  Apps: ["ID", "AppName", "Description", "URL", "Icon", "Category", "Status", "Type"],
  ContactRequest: ["ID", "EmployeeID", "Name", "Topic", "Detail", "CreatedDate", "Status"],
  Videos: ["ID", "Title", "URL", "Description", "Category", "Order", "Status"],
  PushSubscriptions: ["DateTime", "EmployeeID", "Name", "Subscription", "UserAgent", "Status"]
};

const HEADER_ALIASES = {
  // EmployeeID
  "employeeid": "employeeid",
  "empid": "employeeid",
  "empcode": "employeeid",
  "employeecode": "employeeid",
  "รหัสพนักงาน": "employeeid",
  "รหัส": "employeeid",

  // Name
  "name": "name",
  "fullname": "name",
  "ชื่อ": "name",
  "ชื่อนามสกุล": "name",
  "ชื่อพนักงาน": "name",

  // Department
  "department": "department",
  "dept": "department",
  "แผนก": "department",
  "ฝ่าย": "department",
  "หน่วยงาน": "department",

  // Position
  "position": "position",
  "pos": "position",
  "ตำแหน่ง": "position",

  // Plant / Company
  "plant": "plant",
  "company": "plant",
  "บริษัท": "plant",
  "โรงงาน": "plant",
  "สังกัด": "plant",
  "สาขา": "plant",

  // PIN / Password
  "pin": "pin",
  "pincode": "pin",
  "password": "pin",
  "passcode": "pin",
  "รหัสผ่าน": "pin",
  "รหัสpin": "pin",
  "รหัสเข้าระบบ": "pin",
  "รหัสเข้าใช้งาน": "pin",
  "รหัสผู้ใช้": "pin",
  "รหัสบัญชี": "pin",

  // Status
  "status": "status",
  "สถานะ": "status",
  "สถานะบัญชี": "status",
  "สถานะการใช้งาน": "status",

  // Title / AppName / Subject
  "title": "title",
  "หัวข้อ": "title",
  "ชื่อเรื่อง": "title",
  "หัวข้อข่าว": "title",
  "appname": "appname",
  "ชื่อแอป": "appname",

  // Detail / Description
  "detail": "detail",
  "description": "detail",
  "desc": "detail",
  "รายละเอียด": "detail",
  "เนื้อหา": "detail",
  "รายละเอียดข่าว": "detail",
  "คำอธิบาย": "detail",

  // Image / Icon
  "imageurl": "imageurl",
  "image": "imageurl",
  "img": "imageurl",
  "picture": "imageurl",
  "photo": "imageurl",
  "icon": "imageurl",
  "รูปภาพ": "imageurl",
  "รูปภาพข่าว": "imageurl",
  "ภาพ": "imageurl",
  "รูป": "imageurl",
  "ภาพข่าว": "imageurl",
  "ภาพประกอบ": "imageurl",
  "ไอคอน": "imageurl",

  // Category
  "category": "category",
  "cat": "category",
  "หมวดหมู่": "category",

  // PublishDate
  "publishdate": "publishdate",
  "วันที่เผยแพร่": "publishdate",
  "วันที่": "publishdate",
  "date": "publishdate",

  // URL / Link
  "url": "url",
  "ลิงก์": "url",
  "link": "url",

  // Type
  "type": "type",
  "ประเภท": "type",

  // Topic for ContactRequest
  "topic": "topic",
  "เรื่อง": "topic",
  "หัวข้อติดต่อ": "topic"
};

function normalizeHeader_(value) {
  const key = String(value === null || value === undefined ? "" : value)
    .replace(/\uFEFF/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-.]+/g, "");
  return HEADER_ALIASES[key] || key;
}

function cleanId(v) {
  return String(v !== undefined && v !== null ? v : "")
    .replace(/[\uFEFF\u00A0]/g, "")
    .trim()
    .replace(/^'+/, "")
    .replace(/\.0$/, "");
}

function findHeaderIndex_(headers, names) {
  const normalized = headers.map(normalizeHeader_);
  for (let i = 0; i < names.length; i++) {
    const idx = normalized.indexOf(normalizeHeader_(names[i]));
    if (idx !== -1) return idx;
  }
  return -1;
}

function findPinColumn_(headers) {
  return findHeaderIndex_(headers, ["PIN", "Password", "Passcode", "PIN Code", "รหัสผ่าน", "รหัส PIN"]);
}

function getHeaderValues_(sheet) {
  if (!sheet || sheet.getLastRow() === 0) return [];
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0];
}

function ensureSheetHeaders_(sheet, defaultHeaders) {
  if (sheet && sheet.getLastRow() === 0) {
    sheet.appendRow(defaultHeaders);
    formatHeaderRow(sheet);
    return true;
  }
  return false;
}

function ensureColumn_(sheet, names) {
  const headers = getHeaderValues_(sheet);
  const existing = findHeaderIndex_(headers, names);
  if (existing !== -1) return existing;
  if (sheet.getLastRow() === 0) return -1;

  const newIndex = Math.max(headers.length, sheet.getLastColumn());
  sheet.getRange(1, newIndex + 1)
    .setValue(names[0])
    .setBackground("#004A99")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold");
  return newIndex;
}

function migrateDatabaseSchema() {
  const ss = getDB();
  const messages = [];

  const news = ss.getSheetByName("News");
  if (news) {
    if (ensureColumn_(news, ["PublishDate", "Publish Date", "Date"]) !== -1) {
      messages.push("News.PublishDate ready");
    }
  }

  const apps = ss.getSheetByName("Apps");
  if (apps) {
    if (ensureColumn_(apps, ["Type"]) !== -1) {
      messages.push("Apps.Type ready");
    }
  }

  return { success: true, message: "Schema migration complete: " + messages.join(", ") };
}

function ensureAllSheets() {
  const ss = getDB();
  const created = [];

  Object.keys(SHEET_HEADERS).forEach(name => {
    if (!ss.getSheetByName(name)) {
      const sheet = ss.insertSheet(name);
      sheet.appendRow(SHEET_HEADERS[name]);
      formatHeaderRow(sheet);
      created.push(name);
    }
  });

  migrateDatabaseSchema();

  return {
    success: true,
    message: created.length
      ? "สร้างชีตที่ยังไม่มีเรียบร้อย: " + created.join(", ")
      : "มีชีตครบทั้ง " + Object.keys(SHEET_HEADERS).length + " แผ่นอยู่แล้ว"
  };
}

function getSchemaInfo() {
  const ss = getDB();
  const names = Object.keys(SHEET_HEADERS);
  const headers = {};

  names.forEach(name => {
    const sheet = ss.getSheetByName(name);
    headers[name] = sheet ? getHeaderValues_(sheet).map(v => String(v || "").trim()) : null;
  });

  return { success: true, headers: headers };
}

// รายการคำสั่ง "อ่านข้อมูล" ทั้งหมด — เรียกได้ทั้งแบบ GET (ไม่มี token) และ POST (แนบ token ใน body)
// การส่ง token ผ่าน POST ทำให้ token ไม่ไปปรากฏใน URL / ประวัติเบราว์เซอร์ / Log ของเซิร์ฟเวอร์
const READ_ACTIONS = ["ping", "getNews", "getNewsById", "getApps", "getUsers", "getAdmins", "checkAdmin",
  "getContactRequests", "getLoginLogs", "getAdminLogs", "getDashboardStats", "getVideos", "getSchemaInfo"];

function handleRead_(action, params, token) {
  params = params || {};
  const wantsAll = String(params.all) === "true";
  if (wantsAll) params.all = "true";

  // ---- Authorization ----
  const ADMIN_ONLY = ["getUsers", "getAdmins", "checkAdmin", "getContactRequests", "getLoginLogs", "getAdminLogs", "getDashboardStats", "getSchemaInfo"];
  const ALL_FLAG_ACTIONS = ["getNews", "getApps", "getVideos"];

  if (ADMIN_ONLY.indexOf(action) !== -1 || (wantsAll && ALL_FLAG_ACTIONS.indexOf(action) !== -1)) {
    const auth = requireAdmin_(token);
    if (auth.error) return auth.error;
  } else if (action === "getApps") {
    const auth = requireSession_(token);
    if (auth.error) return auth.error;
  }

  switch (action) {
    case "ping":
      return { success: true, message: "Employee Portal API is live!", timestamp: new Date().toISOString() };
    case "getNews": return getNewsData(params);
    case "getNewsById": return getNewsByIdData(params.id);
    case "getApps": return getAppsData(params);
    case "getUsers": return getUsersData(params);
    case "getAdmins": return getAdminsData();
    case "checkAdmin": return checkAdminStatus(params.employeeId);
    case "getContactRequests": return getContactRequestsData(params);
    case "getLoginLogs": return getLoginLogsData(params);
    case "getAdminLogs": return getAdminLogsData(params);
    case "getDashboardStats": return getDashboardStatsData();
    case "getVideos": return getVideosData(params);
    case "getSchemaInfo": return getSchemaInfo();
    default: return { success: false, message: "Unknown GET action: " + action };
  }
}

function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    return createJsonResponse(handleRead_(params.action || "", params, params.token || ""));
  } catch (error) {
    return createJsonResponse({ success: false, message: error.toString() });
  }
}

function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }
    if (!payload || typeof payload !== "object") payload = {};

    // ป้องกัน client ปลอมค่าภายใน
    delete payload._sessionId;

    const action = (e && e.parameter && e.parameter.action) || payload.action || "";
    const token = payload.token || (e && e.parameter && e.parameter.token) || "";
    delete payload.token;

    // คำสั่งอ่านข้อมูลที่ส่งมาทาง POST (แนบ token ใน body) — ไม่ต้องใช้ Lock
    if (READ_ACTIONS.indexOf(action) !== -1) {
      return createJsonResponse(handleRead_(action, payload, token));
    }

    // ---- Authorization ----
    const PUBLIC_ACTIONS = ["login", "submitContact", "savePushToken"];
    if (PUBLIC_ACTIONS.indexOf(action) === -1) {
      const auth = requireAdmin_(token);
      if (auth.error) return createJsonResponse(auth.error);
      payload.adminId = auth.employeeId; // ใช้ ID จาก token เท่านั้น ไม่เชื่อค่าจาก client
    } else {
      const sid = verifySession_(token);
      if (sid) payload._sessionId = sid;
      delete payload.adminId;
    }

    // ---- ป้องกันการเขียนชนกัน (Race Condition) ----
    let lock = null;
    // ไม่ล็อกคำสั่งที่ไม่แก้ข้อมูลหลักในชีต หรือ append อย่างเดียว (กันงานช้า เช่น อัปโหลดรูปไป Drive ไปขวาง Login)
    if (["login", "submitContact", "savePushToken", "uploadNewsImage"].indexOf(action) === -1) {
      lock = LockService.getScriptLock();
      lock.waitLock(20000);
    }

    let result;
    try {
      result = dispatchPost_(action, payload);
    } finally {
      if (lock) lock.releaseLock();
    }

    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ success: false, message: error.toString() });
  }
}

function dispatchPost_(action, payload) {
  switch (action) {
    case "login": return handleLogin(payload);
    case "submitContact": return handleContactSubmit(payload);
    case "savePushToken": return handleSavePushToken(payload);
    case "addNews": return handleAddNews(payload);
    case "updateNews": return handleUpdateNews(payload);
    case "deleteNews": return handleDeleteNews(payload);
    case "toggleNewsStatus": return handleToggleStatus("News", payload.id, payload.status, payload.adminId);
    case "addApp": return handleAddApp(payload);
    case "updateApp": return handleUpdateApp(payload);
    case "deleteApp": return handleDeleteApp(payload);
    case "toggleAppStatus": return handleToggleStatus("Apps", payload.id, payload.status, payload.adminId);
    case "addUser": return handleAddUser(payload);
    case "updateUser": return handleUpdateUser(payload);
    case "changePin": return handleChangePin(payload);
    case "toggleUserStatus": return handleToggleUserStatus(payload);
    case "unlockUser": return handleUnlockUser(payload);
    case "updateContactStatus": return handleUpdateContactStatus(payload);
    case "updateVideos": return handleUpdateVideos(payload);
    case "uploadNewsImage": return handleUploadNewsImage(payload);
    case "ensureSheets": return ensureAllSheets();
    case "setupDatabase":
      if (PropertiesService.getScriptProperties().getProperty("ALLOW_SEED") !== "true") {
        return { success: false, message: "ปิดการสร้างข้อมูลเริ่มต้นไว้เพื่อความปลอดภัย (ต้องตั้ง Script Property ALLOW_SEED = true ก่อน)" };
      }
      return setupInitialDatabase();
    case "migrateSchema": return migrateDatabaseSchema();
    default: return { success: false, message: "Unknown POST action: " + action };
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleLogin(payload) {
  const employeeId = cleanId(payload.employeeId);
  const pin = cleanId(payload.pin);
  const clientIp = String(payload.ip || "Client Browser").slice(0, 64);

  if (!employeeId || !pin) {
    return { success: false, message: "กรุณากรอก Employee ID และ PIN ให้ครบถ้วน" };
  }

  // ป้องกันการเดา PIN (Brute-force): ผิดครบ MAX_LOGIN_FAILS ครั้ง ล็อก 15 นาที
  const cache = CacheService.getScriptCache();
  const failKey = loginFailKey_(employeeId);
  let allowed = false;
  try {
    allowed = reserveLoginAttempt_(cache, failKey);
  } catch (e) {
    return { success: false, message: "ระบบกำลังประมวลผลหลายรายการ กรุณาลองใหม่อีกครั้ง" };
  }
  if (!allowed) {
    recordLoginLog(employeeId, "Unknown", clientIp, "Failed (Locked)");
    // แจ้งแอดมินครั้งเดียวต่อการล็อก (เห็นในหน้า "ประวัติการแก้ไข") เพื่อแยกว่าเจ้าของลืม PIN หรือมีคนพยายามเดา
    try {
      const noteKey = "lockednote_" + failKey;
      if (!cache.get(noteKey)) {
        cache.put(noteKey, "1", LOCKOUT_SECONDS);
        recordAdminLog("SYSTEM", "Lock User (auto)", "Too many failed PIN attempts for Employee: " + employeeId + " (locked " + (LOCKOUT_SECONDS / 60) + " min)");
      }
    } catch (e) {}
    return { success: false, message: "ใส่ PIN ผิดหลายครั้งเกินกำหนด กรุณารอ 15 นาทีแล้วลองใหม่" };
  }

  const ss = getDB();
  const usersSheet = ss.getSheetByName("Users");
  if (!usersSheet) {
    return { success: false, message: "Database error: Users sheet not found" };
  }

  const usersData = usersSheet.getDataRange().getValues();
  if (usersData.length <= 1) {
    return { success: false, message: "ไม่พบข้อมูลผู้ใช้ในระบบ" };
  }

  const headers = usersData[0].map(normalizeHeader_);
  const empIdCol = headers.indexOf("employeeid") !== -1 ? headers.indexOf("employeeid") : 0;
  const nameCol = headers.indexOf("name") !== -1 ? headers.indexOf("name") : 1;
  const deptCol = headers.indexOf("department") !== -1 ? headers.indexOf("department") : 2;
  const posCol = headers.indexOf("position") !== -1 ? headers.indexOf("position") : 3;
  const plantCol = headers.indexOf("plant") !== -1 ? headers.indexOf("plant") : 4;
  const pinCol = findPinColumn_(headers);
  const statusCol = headers.indexOf("status") !== -1 ? headers.indexOf("status") : -1;

  if (pinCol === -1) {
    return {
      success: false,
      message: "ตั้งค่า Sheet Users ไม่ถูกต้อง: ไม่พบคอลัมน์ PIN (header ต้องชื่อ PIN หรือ Password)"
    };
  }

  let matchedUser = null;
  let employeeFound = false;
  let employeeName = "Unknown";

  for (let i = 1; i < usersData.length; i++) {
    const row = usersData[i];
    const rowEmpId = cleanId(row[empIdCol]);
    const rowPin = cleanId(row[pinCol]);

    const empMatches = (rowEmpId.toLowerCase() === employeeId.toLowerCase()) ||
      (/^\d+$/.test(rowEmpId) && /^\d+$/.test(employeeId) && rowEmpId.replace(/^0+/, "") === employeeId.replace(/^0+/, ""));

    if (!empMatches) continue;

    employeeFound = true;
    if (employeeName === "Unknown") employeeName = row[nameCol] || "Unknown";

    let pinMatches = false;
    let needsHashUpgrade = false;
    if (rowPin !== "") {
      if (isHashedPin_(rowPin)) {
        const newHash = hashPin_(rowEmpId, pin);
        pinMatches = (rowPin === newHash) || (rowPin === hashPinLegacy_(rowEmpId, pin));
        needsHashUpgrade = pinMatches && rowPin !== newHash;
      } else {
        // PIN แบบเก่า (ข้อความธรรมดา) ยังใช้ได้ แล้วจะถูกอัปเกรดเป็น hash อัตโนมัติ
        pinMatches = (rowPin === pin) ||
          (rowPin.length < 4 && rowPin.padStart(4, "0") === pin) ||
          (pin.length < 4 && pin.padStart(4, "0") === rowPin);
        needsHashUpgrade = pinMatches;
      }
    }

    if (pinMatches) {
      matchedUser = {
        employeeId: rowEmpId,
        name: row[nameCol] || "",
        department: deptCol !== -1 ? (row[deptCol] || "") : "",
        position: posCol !== -1 ? (row[posCol] || "") : "",
        plant: plantCol !== -1 ? (row[plantCol] || "") : "",
        status: statusCol !== -1 ? String(row[statusCol] || "Active").trim() : "Active"
      };
      if (needsHashUpgrade) {
        try { usersSheet.getRange(i + 1, pinCol + 1).setNumberFormat("@").setValue(hashPin_(rowEmpId, pin)); } catch (e) {}
      }
      break;
    }
  }

  if (!matchedUser) {
    // นับครั้งที่ผิดไปแล้วตอน reserveLoginAttempt_ และใช้ข้อความเดียวกัน กันการไล่เดารหัสพนักงาน
    recordLoginLog(employeeId, employeeFound ? employeeName : "Unknown", clientIp,
      employeeFound ? "Failed (Invalid PIN)" : "Failed (User Not Found)");
    return { success: false, message: "รหัสพนักงานหรือ PIN ไม่ถูกต้อง" };
  }

  if (matchedUser.status.toLowerCase() !== "active") {
    recordLoginLog(matchedUser.employeeId, matchedUser.name, clientIp, "Failed (Account Inactive)");
    return { success: false, message: "บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ" };
  }

  const adminCheck = checkAdminStatus(matchedUser.employeeId);
  const isAdmin = adminCheck.isAdmin;
  const role = isAdmin ? (adminCheck.role || "Admin") : "Employee";

  cache.remove(failKey);
  recordLoginLog(matchedUser.employeeId, matchedUser.name, clientIp, "Success");

  return {
    success: true,
    message: "เข้าสู่ระบบสำเร็จ",
    user: {
      employeeId: matchedUser.employeeId,
      name: matchedUser.name,
      department: matchedUser.department,
      position: matchedUser.position,
      plant: matchedUser.plant,
      role: role,
      isAdmin: isAdmin,
      token: signSession_(matchedUser.employeeId)
    }
  };
}

function checkAdminStatus(employeeId) {
  if (!employeeId) return { isAdmin: false, role: "Employee" };
  const targetId = cleanId(employeeId);
  const ss = getDB();
  const adminSheet = ss.getSheetByName("Admin");
  if (!adminSheet) return { isAdmin: false, role: "Employee" };

  const adminData = adminSheet.getDataRange().getValues();
  if (adminData.length <= 1) return { isAdmin: false, role: "Employee" };

  const headers = adminData[0].map(normalizeHeader_);
  const empIdCol = headers.indexOf("employeeid") !== -1 ? headers.indexOf("employeeid") : 0;
  const roleCol = headers.indexOf("role") !== -1 ? headers.indexOf("role") : 2;
  const statusCol = headers.indexOf("status") !== -1 ? headers.indexOf("status") : 3;

  for (let i = 1; i < adminData.length; i++) {
    const row = adminData[i];
    const rowEmpId = cleanId(row[empIdCol]);
    const role = row[roleCol] || "Admin";
    const status = String(row[statusCol] || "active").trim().toLowerCase();

    const idMatches = (rowEmpId.toLowerCase() === targetId.toLowerCase()) ||
      (/^\d+$/.test(rowEmpId) && /^\d+$/.test(targetId) && rowEmpId.replace(/^0+/, "") === targetId.replace(/^0+/, ""));

    if (idMatches && status === "active") {
      return { isAdmin: true, role: role };
    }
  }
  return { isAdmin: false, role: "Employee" };
}

function recordLoginLog(employeeId, name, ip, status) {
  try {
    const sheet = getDB().getSheetByName("LoginLog");
    if (!sheet) return;
    sheet.appendRow([nowString_(), employeeId, name, ip, status].map(safeCell_));
  } catch (e) {
    Logger.log("Error logging login: " + e.toString());
  }
}

function recordAdminLog(adminId, action, detail) {
  try {
    const sheet = getDB().getSheetByName("LogAdmin");
    if (!sheet) return;
    sheet.appendRow([nowString_(), adminId || "System", action, detail].map(safeCell_));
  } catch (e) {
    Logger.log("Error logging admin action: " + e.toString());
  }
}

function getNewsData(params) {
  const wantsActiveOnly = !(params && params.all === "true");
  if (wantsActiveOnly) {
    try {
      const hit = CacheService.getScriptCache().get(NEWS_CACHE_KEY);
      if (hit) return JSON.parse(hit);
    } catch (e) {}
  }
  const result = getNewsDataUncached_(params);
  if (wantsActiveOnly && result && result.success) {
    try { CacheService.getScriptCache().put(NEWS_CACHE_KEY, JSON.stringify(result), NEWS_CACHE_SEC); } catch (e) {} // เกิน 100KB จะข้ามเอง
  }
  return result;
}

function getNewsDataUncached_(params) {
  const ss = getDB();
  const sheet = ss.getSheetByName("News");
  if (!sheet) return { success: true, data: [] };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };

  const headers = data[0].map(normalizeHeader_);
  const idCol = findHeaderIndex_(headers, ["id", "รหัส"]);
  const titleCol = findHeaderIndex_(headers, ["title", "appname", "name", "หัวข้อข่าว", "หัวข้อ", "ชื่อเรื่อง", "ชื่อแอป"]);
  const detailCol = findHeaderIndex_(headers, ["detail", "description", "รายละเอียด", "เนื้อหา", "รายละเอียดข่าว", "คำอธิบาย"]);
  const urlCol = findHeaderIndex_(headers, ["url", "link", "ลิงก์"]);
  const imgCol = findHeaderIndex_(headers, ["imageurl", "icon", "image", "img", "picture", "photo", "รูปภาพ", "รูปภาพข่าว", "ภาพ"]);
  const catCol = findHeaderIndex_(headers, ["category", "cat", "หมวดหมู่", "ประเภทข่าว"]);
  const statusCol = findHeaderIndex_(headers, ["status", "สถานะ", "สถานะการใช้งาน"]);
  const dateCol = findHeaderIndex_(headers, ["publishdate", "date", "วันที่เผยแพร่", "วันที่", "createddate"]);

  const resolvedIdCol = idCol !== -1 ? idCol : 0;
  const resolvedTitleCol = titleCol !== -1 ? titleCol : 1;
  const resolvedDetailCol = detailCol !== -1 ? detailCol : 2;
  const resolvedUrlCol = urlCol !== -1 ? urlCol : 3;
  const resolvedImgCol = imgCol !== -1 ? imgCol : 4;
  const resolvedCatCol = catCol !== -1 ? catCol : 5;
  const resolvedStatusCol = statusCol !== -1 ? statusCol : 6;
  const resolvedDateCol = dateCol !== -1 ? dateCol : 7;

  const list = [];
  const onlyActive = params && params.all === "true" ? false : true;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = String(row[resolvedIdCol] || "").trim();
    const title = String(row[resolvedTitleCol] || "").trim();
    if (!id && !title) continue;

    const status = resolvedStatusCol !== -1 ? String(row[resolvedStatusCol] || "Active").trim() : "Active";

    if (onlyActive && status.toLowerCase() !== "active") {
      continue;
    }

    list.push({
      id: id,
      title: title,
      detail: String(row[resolvedDetailCol] || ""),
      imageUrl: String(row[resolvedImgCol] || ""),
      category: String(row[resolvedCatCol] || "General"),
      publishDate: resolvedDateCol !== -1 ? formatDateString(row[resolvedDateCol]) : "",
      status: status || "Active",
      url: resolvedUrlCol !== -1 ? String(row[resolvedUrlCol] || "") : ""
    });
  }

  list.sort((a, b) => (dateValue_(b.publishDate) - dateValue_(a.publishDate)) || (String(b.id).localeCompare(String(a.id))));

  return { success: true, data: list };
}

function getNewsByIdData(id) {
  const ss = getDB();
  const sheet = ss.getSheetByName("News");
  if (!sheet) return { success: false, message: "News sheet not found" };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: "News not found" };

  const headers = data[0].map(normalizeHeader_);
  const idCol = findHeaderIndex_(headers, ["id", "รหัส"]);
  const titleCol = findHeaderIndex_(headers, ["title", "appname", "name", "หัวข้อข่าว", "หัวข้อ", "ชื่อเรื่อง", "ชื่อแอป"]);
  const detailCol = findHeaderIndex_(headers, ["detail", "description", "รายละเอียด", "เนื้อหา", "รายละเอียดข่าว", "คำอธิบาย"]);
  const urlCol = findHeaderIndex_(headers, ["url", "link", "ลิงก์"]);
  const imgCol = findHeaderIndex_(headers, ["imageurl", "icon", "image", "img", "picture", "photo", "รูปภาพ", "รูปภาพข่าว", "ภาพ"]);
  const catCol = findHeaderIndex_(headers, ["category", "cat", "หมวดหมู่", "ประเภทข่าว"]);
  const statusCol = findHeaderIndex_(headers, ["status", "สถานะ", "สถานะการใช้งาน"]);
  const dateCol = findHeaderIndex_(headers, ["publishdate", "date", "วันที่เผยแพร่", "วันที่", "createddate"]);

  const resolvedIdCol = idCol !== -1 ? idCol : 0;
  const resolvedTitleCol = titleCol !== -1 ? titleCol : 1;
  const resolvedDetailCol = detailCol !== -1 ? detailCol : 2;
  const resolvedUrlCol = urlCol !== -1 ? urlCol : 3;
  const resolvedImgCol = imgCol !== -1 ? imgCol : 4;
  const resolvedCatCol = catCol !== -1 ? catCol : 5;
  const resolvedStatusCol = statusCol !== -1 ? statusCol : 6;
  const resolvedDateCol = dateCol !== -1 ? dateCol : 7;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[resolvedIdCol]).trim() === String(id).trim()) {
      if (String(row[resolvedStatusCol] || "Active").trim().toLowerCase() !== "active") {
        return { success: false, message: "News not found" };
      }
      return {
        success: true,
        data: {
          id: row[resolvedIdCol],
          title: String(row[resolvedTitleCol] || ""),
          detail: String(row[resolvedDetailCol] || ""),
          imageUrl: String(row[resolvedImgCol] || ""),
          category: String(row[resolvedCatCol] || "General"),
          publishDate: resolvedDateCol !== -1 ? formatDateString(row[resolvedDateCol]) : "",
          status: String(row[resolvedStatusCol] || "Active"),
          url: resolvedUrlCol !== -1 ? String(row[resolvedUrlCol] || "") : ""
        }
      };
    }
  }
  return { success: false, message: "News not found" };
}

function defaultVideosList_() {
  return DEFAULT_VIDEOS.map(v => ({
    id: v[0], title: v[1], url: v[2], description: v[3], category: v[4], order: v[5], status: v[6]
  }));
}

function getVideosData(params) {
  const ss = getDB();
  const sheet = ss.getSheetByName("Videos");
  if (!sheet) return { success: true, data: defaultVideosList_() };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };

  const headers = data[0].map(normalizeHeader_);
  const idCol = headers.indexOf("id") !== -1 ? headers.indexOf("id") : 0;
  const titleCol = headers.indexOf("title") !== -1 ? headers.indexOf("title") : 1;
  const urlCol = headers.indexOf("url") !== -1 ? headers.indexOf("url") : 2;
  const descCol = headers.indexOf("description") !== -1 ? headers.indexOf("description") : (headers.indexOf("detail") !== -1 ? headers.indexOf("detail") : 3);
  const catCol = headers.indexOf("category") !== -1 ? headers.indexOf("category") : 4;
  const orderCol = headers.indexOf("order") !== -1 ? headers.indexOf("order") : 5;
  const statusCol = headers.indexOf("status") !== -1 ? headers.indexOf("status") : 6;

  const onlyActive = params && params.all === "true" ? false : true;

  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = String(row[idCol] || "").trim();
    const url = String(row[urlCol] || "").trim();
    if (!id && !url) continue;

    const status = statusCol !== -1 ? String(row[statusCol] || "Active").trim() : "Active";
    if (onlyActive && status.toLowerCase() !== "active") continue;

    list.push({
      id: id || "yt-" + i,
      title: String(row[titleCol] || "คลิปวิดีโอประชาสัมพันธ์"),
      url: url,
      description: String(row[descCol] || ""),
      category: String(row[catCol] || "วิดีโอประชาสัมพันธ์"),
      order: orderCol !== -1 ? Number(row[orderCol]) || i : i,
      status: status
    });
  }

  list.sort((a, b) => a.order - b.order);
  return { success: true, data: list };
}

function handleUpdateVideos(payload) {
  const adminId = payload.adminId || "";
  const adminCheck = checkAdminStatus(adminId);
  if (!adminCheck.isAdmin) {
    return { success: false, message: "สิทธิ์ไม่เพียงพอ: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถแก้ไขวิดีโอได้" };
  }

  const ss = getDB();
  let sheet = ss.getSheetByName("Videos");
  if (!sheet) {
    sheet = ss.insertSheet("Videos");
    sheet.appendRow(SHEET_HEADERS.Videos);
    formatHeaderRow(sheet);
  }

  if (!Array.isArray(payload.videos)) {
    return { success: false, message: "Invalid videos payload" };
  }
  const videos = payload.videos.slice(0, 3);
  for (let i = 0; i < videos.length; i++) {
    if (!/^https?:\/\/((www|m)\.)?(youtube\.com|youtu\.be)\//i.test(String((videos[i] && videos[i].url) || ""))) {
      return { success: false, message: "ลิงก์ YouTube ช่องที่ " + (i + 1) + " ไม่ถูกต้อง" };
    }
  }

  ensureSheetHeaders_(sheet, SHEET_HEADERS.Videos);

  const rows = videos.map((v, idx) => [
    v.id || ("yt-" + (idx + 1)),
    v.title || "",
    v.url || "",
    v.description || "",
    v.category || "วิดีโอประชาสัมพันธ์",
    idx + 1,
    v.status || "Active"
  ]);

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    if (lastRow > 1 + rows.length) {
      sheet.deleteRows(2 + rows.length, lastRow - (1 + rows.length));
    }
  }

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, SHEET_HEADERS.Videos.length).setValues(rows.map(r => r.map(safeCell_)));
  }

  recordAdminLog(adminId, "Update Videos", "Updated YouTube showcase videos (3 slots)");
  return { success: true, message: "บันทึกลิงก์วิดีโอ YouTube สำเร็จ" };
}

// ============================================================================
// GOOGLE DRIVE AUTOMATIC FOLDER & IMAGE UPLOADER FOR NEWS
// ============================================================================
const NEWS_IMAGE_FOLDER_NAME = "Employee Portal - News Images";

function getOrCreateNewsFolder_() {
  const ss = getDB();
  let folder = null;

  // 1. Try to find/create folder inside the same folder as the Spreadsheet
  try {
    const file = DriveApp.getFileById(ss.getId());
    const parents = file.getParents();
    if (parents.hasNext()) {
      const parentFolder = parents.next();
      const subFolders = parentFolder.getFoldersByName(NEWS_IMAGE_FOLDER_NAME);
      if (subFolders.hasNext()) {
        folder = subFolders.next();
      } else {
        folder = parentFolder.createFolder(NEWS_IMAGE_FOLDER_NAME);
      }
    }
  } catch (e) {
    console.warn("Could not check parent folder:", e);
  }

  // 2. Fallback: Search globally in Google Drive
  if (!folder) {
    const folders = DriveApp.getFoldersByName(NEWS_IMAGE_FOLDER_NAME);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(NEWS_IMAGE_FOLDER_NAME);
    }
  }

  // 3. Set folder to Anyone with the link can view (public read for web portal images)
  try {
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {}

  return folder;
}

function handleUploadNewsImage(payload) {
  const adminId = payload.adminId || "";
  const adminCheck = checkAdminStatus(adminId);
  if (!adminCheck.isAdmin) {
    return { success: false, message: "สิทธิ์ไม่เพียงพอ: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถอัปโหลดรูปภาพได้" };
  }

  const fileData = payload.fileData || "";
  if (!fileData) {
    return { success: false, message: "ไม่พบข้อมูลไฟล์รูปภาพ" };
  }

  const originalName = String(payload.fileName || ("news_" + new Date().getTime() + ".jpg")).replace(/[\\\/:*?"<>|]/g, "_").slice(0, 100);
  let mimeType = payload.mimeType || "image/jpeg";
  let base64Content = fileData;

  const match = fileData.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    mimeType = match[1];
    base64Content = match[2];
  }

  if (["image/jpeg", "image/png", "image/webp", "image/gif"].indexOf(mimeType) === -1) {
    return { success: false, message: "รองรับเฉพาะไฟล์ภาพ JPG, PNG, WEBP, GIF" };
  }
  if (base64Content.length > 7 * 1024 * 1024) {
    return { success: false, message: "ไฟล์รูปภาพมีขนาดใหญ่เกินไป (สูงสุดประมาณ 5 MB)" };
  }

  try {
    base64Content = String(base64Content).replace(/\s/g, "");
    const bytes = Utilities.base64Decode(base64Content);
    const blob = Utilities.newBlob(bytes, mimeType, originalName);

    const folder = getOrCreateNewsFolder_();
    const file = folder.createFile(blob);

    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}

    const fileId = file.getId();
    // High-resolution web thumbnail URL that displays directly without authentication
    const directUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;

    recordAdminLog(adminId, "Upload News Image", `Uploaded image "${originalName}" to Google Drive folder "${NEWS_IMAGE_FOLDER_NAME}" (ID: ${fileId})`);

    return {
      success: true,
      message: "อัปโหลดรูปภาพไปยัง Google Drive สำเร็จ",
      fileId: fileId,
      imageUrl: directUrl,
      fileName: originalName
    };
  } catch (err) {
    return {
      success: false,
      message: "เกิดข้อผิดพลาดในการบันทึกรูปภาพลง Google Drive: " + err.toString()
    };
  }
}

function handleAddNews(payload) {
  const ss = getDB();
  const sheet = ss.getSheetByName("News");
  if (!sheet) return { success: false, message: "News sheet not found" };

  // If a file is uploaded as base64, save to Google Drive first
  let imageUrl = payload.imageUrl || "";
  if (payload.fileData) {
    const uploadRes = handleUploadNewsImage(payload);
    if (uploadRes.success && uploadRes.imageUrl) {
      imageUrl = uploadRes.imageUrl;
    }
  }

  // Make the write work on both the old (7-column) and new (8-column) layouts.
  ensureSheetHeaders_(sheet, SHEET_HEADERS.News);
  ensureColumn_(sheet, ["PublishDate", "Publish Date", "Date"]);
  ensureColumn_(sheet, ["URL"]);

  const id = genId_("N");
  const title = payload.title || "";
  const detail = payload.detail || "";
  const category = payload.category || "General";
  const publishDate = payload.publishDate || Utilities.formatDate(new Date(), getSheetTz_(), "yyyy-MM-dd");
  const status = payload.status || "Active";
  const url = payload.url || "";

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(normalizeHeader_);
  const newRow = new Array(headers.length).fill("");
  headers.forEach((h, idx) => {
    if (h === "id") newRow[idx] = id;
    else if (h === "title" || h === "appname") newRow[idx] = title;
    else if (h === "detail" || h === "description") newRow[idx] = detail;
    else if (h === "url") newRow[idx] = url;
    else if (h === "imageurl" || h === "icon") newRow[idx] = imageUrl;
    else if (h === "category") newRow[idx] = category;
    else if (h === "publishdate" || h === "date") newRow[idx] = publishDate;
    else if (h === "status") newRow[idx] = status;
  });
  sheet.appendRow(newRow.map(safeCell_));

  recordAdminLog(payload.adminId, "Create News", `Added News ID: ${id} - Title: ${title}`);
  if (String(status).toLowerCase() === "active") sendPushNotification_(title, detail, id);
  clearNewsCache_();
  return { success: true, message: "เพิ่มข่าวสารสำเร็จ", id: id };
}

function handleSavePushToken(payload) {
  try {
    const ss = getDB();
    let sheet = ss.getSheetByName("PushSubscriptions");
    if (!sheet) {
      sheet = ss.insertSheet("PushSubscriptions");
      sheet.appendRow(SHEET_HEADERS.PushSubscriptions);
      formatHeaderRow(sheet);
    }
    const sid = cleanId(payload._sessionId || "");
    if (!sid || !isUserActive_(sid)) {
      return { success: false, message: "ต้องเข้าสู่ระบบก่อนบันทึกการแจ้งเตือน" };
    }
    const empId = sid.slice(0, 30);
    const subscription = String(payload.subscription || "").slice(0, 4000);

    // กันบันทึกซ้ำ (พนักงาน + อุปกรณ์เดิม)
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (cleanId(data[i][1]) === cleanId(empId) && String(data[i][3]) === subscription) {
        return { success: true, message: "บันทึกข้อมูลการแจ้งเตือนสำเร็จ" };
      }
    }

    sheet.appendRow([
      nowString_(),
      empId,
      String(payload.name || "Anonymous").slice(0, 100),
      subscription,
      String(payload.userAgent || "").slice(0, 300),
      "Active"
    ].map(safeCell_));
    return { success: true, message: "บันทึกข้อมูลการแจ้งเตือนสำเร็จ" };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function sendPushNotification_(title, detail, newsId) {
  try {
    const props = PropertiesService.getScriptProperties();
    const oneSignalAppId = props.getProperty("ONESIGNAL_APP_ID");
    const oneSignalApiKey = props.getProperty("ONESIGNAL_REST_API_KEY");

    const portalUrl = props.getProperty("PORTAL_URL"); // เช่น https://yourname.github.io/employee-portal/
    if (oneSignalAppId && oneSignalApiKey && portalUrl) {
      const payload = {
        app_id: oneSignalAppId,
        included_segments: ["All"],
        headings: { "en": "📢 ข่าวใหม่: " + title, "th": "📢 ข่าวใหม่: " + title },
        contents: { "en": detail ? detail.slice(0, 100) : "กดเพื่อเปิดอ่านข่าวสารใหม่", "th": detail ? detail.slice(0, 100) : "กดเพื่อเปิดอ่านข่าวสารใหม่" },
        url: portalUrl + "index.html?newsId=" + newsId
      };
      UrlFetchApp.fetch("https://onesignal.com/api/v1/notifications", {
        method: "post",
        contentType: "application/json",
        headers: { "Authorization": "Basic " + oneSignalApiKey },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      recordAdminLog("SYSTEM", "Push Broadcast", `Dispatched notification for news ID: ${newsId} - "${title}"`);
    }
  } catch (err) {
    console.warn("sendPushNotification_ error:", err.toString());
  }
}

function handleUpdateNews(payload) {
  const ss = getDB();
  const sheet = ss.getSheetByName("News");
  if (!sheet) return { success: false, message: "News sheet not found" };

  // If new image file was uploaded as base64, save to Google Drive first
  if (payload.fileData) {
    const uploadRes = handleUploadNewsImage(payload);
    if (uploadRes.success && uploadRes.imageUrl) {
      payload.imageUrl = uploadRes.imageUrl;
    }
  }

  const id = String(payload.id).trim();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: "News sheet is empty" };

  const headers = data[0].map(normalizeHeader_);
  const idCol = findHeaderIndex_(headers, ["id", "รหัส"]);
  const titleCol = findHeaderIndex_(headers, ["title", "appname", "name", "หัวข้อข่าว", "หัวข้อ", "ชื่อเรื่อง", "ชื่อแอป"]);
  const detailCol = findHeaderIndex_(headers, ["detail", "description", "รายละเอียด", "เนื้อหา", "รายละเอียดข่าว", "คำอธิบาย"]);
  const imgCol = findHeaderIndex_(headers, ["imageurl", "icon", "image", "img", "picture", "photo", "รูปภาพ", "รูปภาพข่าว", "ภาพ"]);
  const catCol = findHeaderIndex_(headers, ["category", "cat", "หมวดหมู่", "ประเภทข่าว"]);
  let dateCol = findHeaderIndex_(headers, ["publishdate", "date", "วันที่เผยแพร่", "วันที่", "createddate"]);
  const statusCol = findHeaderIndex_(headers, ["status", "สถานะ", "สถานะการใช้งาน"]);
  let urlCol = findHeaderIndex_(headers, ["url", "link", "ลิงก์"]);

  const resolvedIdCol = idCol !== -1 ? idCol : 0;

  // Older News sheets might lack PublishDate or URL column. Create on first edit.
  if (dateCol === -1 && payload.publishDate !== undefined) {
    dateCol = ensureColumn_(sheet, ["PublishDate", "Publish Date", "Date"]);
  }
  if (urlCol === -1 && payload.url !== undefined) {
    urlCol = ensureColumn_(sheet, ["URL", "Link", "ลิงก์"]);
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][resolvedIdCol]).trim() === id) {
      const rowIndex = i + 1;
      if (payload.title !== undefined && titleCol !== -1) sheet.getRange(rowIndex, titleCol + 1).setValue(safeCell_(payload.title));
      if (payload.detail !== undefined && detailCol !== -1) sheet.getRange(rowIndex, detailCol + 1).setValue(safeCell_(payload.detail));
      if (payload.imageUrl !== undefined && imgCol !== -1) sheet.getRange(rowIndex, imgCol + 1).setValue(safeCell_(payload.imageUrl));
      if (payload.category !== undefined && catCol !== -1) sheet.getRange(rowIndex, catCol + 1).setValue(safeCell_(payload.category));
      if (payload.publishDate !== undefined && dateCol !== -1) sheet.getRange(rowIndex, dateCol + 1).setValue(safeCell_(payload.publishDate));
      if (payload.status !== undefined && statusCol !== -1) sheet.getRange(rowIndex, statusCol + 1).setValue(safeCell_(payload.status));
      if (payload.url !== undefined && urlCol !== -1) sheet.getRange(rowIndex, urlCol + 1).setValue(safeCell_(payload.url));

      recordAdminLog(payload.adminId, "Update News", `Updated News ID: ${id} - Title: ${payload.title || data[i][titleCol]}`);
      clearNewsCache_();
      return { success: true, message: "อัปเดตข่าวสารสำเร็จ" };
    }
  }

  return { success: false, message: "ไม่พบข่าวที่ต้องการแก้ไข" };
}

function handleDeleteNews(payload) {
  const ss = getDB();
  const sheet = ss.getSheetByName("News");
  if (!sheet) return { success: false, message: "News sheet not found" };

  const id = String(payload.id).trim();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: "ไม่พบข่าวสารที่ต้องการลบ" };

  // FIX: resolve ID/Title columns from the header row instead of assuming A/B.
  const headers = data[0].map(normalizeHeader_);
  const idCol = headers.indexOf("id") !== -1 ? headers.indexOf("id") : 0;
  const titleCol = headers.indexOf("title") !== -1 ? headers.indexOf("title") : headers.indexOf("appname");

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === id) {
      const newsTitle = titleCol !== -1 ? data[i][titleCol] : "";
      sheet.deleteRow(i + 1);
      recordAdminLog(payload.adminId, "Delete News", `Deleted News ID: ${id} - Title: ${newsTitle}`);
      clearNewsCache_();
      return { success: true, message: "ลบข่าวสารเรียบร้อยแล้ว" };
    }
  }

  return { success: false, message: "ไม่พบข่าวสารที่ต้องการลบ" };
}

function getAppsData(params) {
  const ss = getDB();
  const sheet = ss.getSheetByName("Apps");
  if (!sheet) return { success: true, data: [] };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };

  const headers = data[0].map(normalizeHeader_);
  const idCol = headers.indexOf("id") !== -1 ? headers.indexOf("id") : 0;
  const nameCol = headers.indexOf("appname") !== -1 ? headers.indexOf("appname") : (headers.indexOf("name") !== -1 ? headers.indexOf("name") : 1);
  const descCol = headers.indexOf("description") !== -1 ? headers.indexOf("description") : (headers.indexOf("detail") !== -1 ? headers.indexOf("detail") : 2);
  const urlCol = headers.indexOf("url") !== -1 ? headers.indexOf("url") : 3;
  // หมายเหตุ: normalizeHeader_ แปลง "Icon" เป็น "imageurl" แล้ว
  const iconCol = headers.indexOf("imageurl") !== -1 ? headers.indexOf("imageurl") : 4;
  const catCol = headers.indexOf("category") !== -1 ? headers.indexOf("category") : 5;
  const typeCol = headers.indexOf("type") !== -1 ? headers.indexOf("type") : -1;
  const statusCol = headers.indexOf("status") !== -1 ? headers.indexOf("status") : -1;
  const list = [];
  const onlyActive = params && params.all === "true" ? false : true;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = String(row[idCol] || "").trim();
    const appName = String(row[nameCol] || "").trim();
    if (!id && !appName) continue;

    const status = statusCol !== -1 ? String(row[statusCol] || "Active").trim() : "Active";

    if (onlyActive && status.toLowerCase() !== "active") {
      continue;
    }

    const url = String(row[urlCol] || "");
    const type = typeCol !== -1 && String(row[typeCol] || "").trim() !== ""
      ? String(row[typeCol]).trim()
      : (url.startsWith("http") ? "External" : "Internal");

    list.push({
      id: id,
      appName: appName,
      description: String(row[descCol] || ""),
      url: url,
      icon: String(row[iconCol] || "grid"),
      category: String(row[catCol] || "General"),
      type: type,
      status: status || "Active"
    });
  }

  return { success: true, data: list };
}

function handleAddApp(payload) {
  const ss = getDB();
  const sheet = ss.getSheetByName("Apps");
  if (!sheet) return { success: false, message: "Apps sheet not found" };

  ensureSheetHeaders_(sheet, SHEET_HEADERS.Apps);
  ensureColumn_(sheet, ["Type"]);

  const id = genId_("APP");
  const appName = payload.appName || "";
  const description = payload.description || "";
  const url = payload.url || "";
  const icon = payload.icon || "layout-grid";
  const category = payload.category || "HR";
  const type = payload.type || (url.startsWith("http") ? "External" : "Internal");
  const status = payload.status || "Active";

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(normalizeHeader_);
  const newRow = new Array(headers.length).fill("");
  headers.forEach((h, idx) => {
    if (h === "id") newRow[idx] = id;
    else if (h === "appname" || h === "name" || h === "title") newRow[idx] = appName;
    else if (h === "description" || h === "detail") newRow[idx] = description;
    else if (h === "url") newRow[idx] = url;
    else if (h === "icon" || h === "imageurl") newRow[idx] = icon;
    else if (h === "category") newRow[idx] = category;
    else if (h === "type") newRow[idx] = type;
    else if (h === "status") newRow[idx] = status;
  });
  sheet.appendRow(newRow.map(safeCell_));

  recordAdminLog(payload.adminId, "Create App", `Added App ID: ${id} - Name: ${appName}`);
  return { success: true, message: "เพิ่มรายการแอปพลิเคชันสำเร็จ", id: id };
}

function handleUpdateApp(payload) {
  const ss = getDB();
  const sheet = ss.getSheetByName("Apps");
  if (!sheet) return { success: false, message: "Apps sheet not found" };

  const id = String(payload.id).trim();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: "Apps sheet is empty" };

  const headers = data[0].map(normalizeHeader_);
  const idCol = headers.indexOf("id") !== -1 ? headers.indexOf("id") : 0;
  const nameCol = headers.indexOf("appname") !== -1 ? headers.indexOf("appname") : headers.indexOf("name");
  const descCol = headers.indexOf("description") !== -1 ? headers.indexOf("description") : headers.indexOf("detail");
  const urlCol = headers.indexOf("url");
  const iconCol = headers.indexOf("icon") !== -1 ? headers.indexOf("icon") : headers.indexOf("imageurl");
  const catCol = headers.indexOf("category");
  let typeCol = headers.indexOf("type");
  const statusCol = headers.indexOf("status");

  // Add the missing Type column on first edit of an old sheet.
  if (typeCol === -1 && payload.type !== undefined) {
    typeCol = ensureColumn_(sheet, ["Type"]);
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === id) {
      const rowIndex = i + 1;
      if (payload.appName !== undefined && nameCol !== -1) sheet.getRange(rowIndex, nameCol + 1).setValue(safeCell_(payload.appName));
      if (payload.description !== undefined && descCol !== -1) sheet.getRange(rowIndex, descCol + 1).setValue(safeCell_(payload.description));
      if (payload.url !== undefined && urlCol !== -1) sheet.getRange(rowIndex, urlCol + 1).setValue(safeCell_(payload.url));
      if (payload.icon !== undefined && iconCol !== -1) sheet.getRange(rowIndex, iconCol + 1).setValue(safeCell_(payload.icon));
      if (payload.category !== undefined && catCol !== -1) sheet.getRange(rowIndex, catCol + 1).setValue(safeCell_(payload.category));
      if (payload.type !== undefined && typeCol !== -1) sheet.getRange(rowIndex, typeCol + 1).setValue(safeCell_(payload.type));
      if (payload.status !== undefined && statusCol !== -1) sheet.getRange(rowIndex, statusCol + 1).setValue(safeCell_(payload.status));

      recordAdminLog(payload.adminId, "Update App", `Updated App ID: ${id} - Name: ${payload.appName || data[i][nameCol]}`);
      return { success: true, message: "อัปเดตข้อมูลแอปสำเร็จ" };
    }
  }

  return { success: false, message: "ไม่พบแอปที่ต้องการแก้ไข" };
}

function handleDeleteApp(payload) {
  const ss = getDB();
  const sheet = ss.getSheetByName("Apps");
  if (!sheet) return { success: false, message: "Apps sheet not found" };

  const id = String(payload.id).trim();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: "ไม่พบแอปที่ต้องการลบ" };

  const headers = data[0].map(normalizeHeader_);
  const idCol = headers.indexOf("id") !== -1 ? headers.indexOf("id") : 0;
  const nameCol = headers.indexOf("appname") !== -1 ? headers.indexOf("appname") : headers.indexOf("name");

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === id) {
      const appName = nameCol !== -1 ? data[i][nameCol] : "";
      sheet.deleteRow(i + 1);
      recordAdminLog(payload.adminId, "Delete App", `Deleted App ID: ${id} - Name: ${appName}`);
      return { success: true, message: "ลบแอปพลิเคชันเรียบร้อยแล้ว" };
    }
  }

  return { success: false, message: "ไม่พบแอปที่ต้องการลบ" };
}

function getUsersData(params) {
  const ss = getDB();
  const sheet = ss.getSheetByName("Users");
  if (!sheet) return { success: true, data: [] };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };

  // Pre-load active admins for fast lookup
  const adminSheet = ss.getSheetByName("Admin");
  const adminIds = new Set();
  if (adminSheet) {
    const adminData = adminSheet.getDataRange().getValues();
    if (adminData.length > 1) {
      const aHeaders = adminData[0].map(normalizeHeader_);
      const aEmpIdCol = aHeaders.indexOf("employeeid") !== -1 ? aHeaders.indexOf("employeeid") : 0;
      const aStatusCol = aHeaders.indexOf("status") !== -1 ? aHeaders.indexOf("status") : 3;
      for (let j = 1; j < adminData.length; j++) {
        const aId = cleanId(adminData[j][aEmpIdCol]);
        const aStatus = String(adminData[j][aStatusCol] || "active").trim().toLowerCase();
        if (aId && aStatus === "active") {
          adminIds.add(aId.toLowerCase());
          if (/^\d+$/.test(aId)) adminIds.add(aId.replace(/^0+/, ""));
        }
      }
    }
  }

  const headers = data[0].map(normalizeHeader_);
  const empIdCol = headers.indexOf("employeeid") !== -1 ? headers.indexOf("employeeid") : 0;
  const nameCol = headers.indexOf("name") !== -1 ? headers.indexOf("name") : 1;
  const deptCol = headers.indexOf("department") !== -1 ? headers.indexOf("department") : 2;
  const posCol = headers.indexOf("position") !== -1 ? headers.indexOf("position") : 3;
  const plantCol = headers.indexOf("plant") !== -1 ? headers.indexOf("plant") : 4;
  const statusCol = headers.indexOf("status") !== -1 ? headers.indexOf("status") : 6;

  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const employeeId = cleanId(row[empIdCol]);
    // Skip formatted-but-empty rows
    if (!employeeId) continue;

    const isUserAdmin = adminIds.has(employeeId.toLowerCase()) ||
      (/^\d+$/.test(employeeId) && adminIds.has(employeeId.replace(/^0+/, "")));

    list.push({
      employeeId: employeeId,
      name: String(row[nameCol] || ""),
      department: deptCol !== -1 ? String(row[deptCol] || "") : "",
      position: posCol !== -1 ? String(row[posCol] || "") : "",
      plant: plantCol !== -1 ? String(row[plantCol] || "") : "",
      status: statusCol !== -1 ? String(row[statusCol] || "Active") : "Active",
      isAdmin: isUserAdmin
    });
  }

  return { success: true, data: list };
}

function getAdminsData() {
  const ss = getDB();
  const sheet = ss.getSheetByName("Admin");
  if (!sheet) return { success: true, data: [] };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };

  const headers = data[0].map(normalizeHeader_);
  const empIdCol = headers.indexOf("employeeid") !== -1 ? headers.indexOf("employeeid") : 0;
  const nameCol = headers.indexOf("name") !== -1 ? headers.indexOf("name") : 1;
  const roleCol = headers.indexOf("role") !== -1 ? headers.indexOf("role") : 2;
  const statusCol = headers.indexOf("status") !== -1 ? headers.indexOf("status") : 3;

  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const employeeId = cleanId(row[empIdCol]);
    if (!employeeId) continue;

    list.push({
      employeeId: employeeId,
      name: row[nameCol] || "",
      role: row[roleCol] || "Admin",
      status: row[statusCol] || "Active"
    });
  }

  return { success: true, data: list };
}

function syncAdminRole_(ss, employeeId, name, shouldBeAdmin, role) {
  const adminSheet = ss.getSheetByName("Admin");
  if (!adminSheet) return;

  const adminData = adminSheet.getDataRange().getValues();
  if (adminData.length <= 1) {
    if (shouldBeAdmin) {
      adminSheet.appendRow([employeeId, name, role || "Admin", "Active"]);
    }
    return;
  }

  const headers = adminData[0].map(normalizeHeader_);
  const empIdCol = headers.indexOf("employeeid") !== -1 ? headers.indexOf("employeeid") : 0;
  const nameCol = headers.indexOf("name") !== -1 ? headers.indexOf("name") : 1;
  const roleCol = headers.indexOf("role") !== -1 ? headers.indexOf("role") : 2;
  const statusCol = headers.indexOf("status") !== -1 ? headers.indexOf("status") : 3;

  const targetId = cleanId(employeeId);
  let foundRowIndex = -1;

  for (let i = 1; i < adminData.length; i++) {
    const rowId = cleanId(adminData[i][empIdCol]);
    if (rowId.toLowerCase() === targetId.toLowerCase() ||
      (/^\d+$/.test(rowId) && /^\d+$/.test(targetId) && rowId.replace(/^0+/, "") === targetId.replace(/^0+/, ""))) {
      foundRowIndex = i + 1;
      break;
    }
  }

  if (foundRowIndex !== -1) {
    if (name && nameCol !== -1) adminSheet.getRange(foundRowIndex, nameCol + 1).setValue(name);
    if (statusCol !== -1) {
      adminSheet.getRange(foundRowIndex, statusCol + 1).setValue(shouldBeAdmin ? "Active" : "Inactive");
    }
    if (role && roleCol !== -1) {
      adminSheet.getRange(foundRowIndex, roleCol + 1).setValue(role);
    }
  } else if (shouldBeAdmin) {
    adminSheet.appendRow([employeeId, name, role || "Admin", "Active"]);
  }
}

function handleAddUser(payload) {
  const ss = getDB();
  const sheet = ss.getSheetByName("Users");
  if (!sheet) return { success: false, message: "Users sheet not found" };

  const employeeId = cleanId(payload.employeeId);
  const name = payload.name || "";
  const pin = cleanId(payload.pin || "1234");
  const department = payload.department || "";
  const position = payload.position || "";
  const plant = payload.plant || "";
  const status = payload.status || "Active";

  if (!employeeId) {
    return { success: false, message: "กรุณากรอกรหัสพนักงาน" };
  }

  if (!/^\d{4}$/.test(pin)) {
    return { success: false, message: "PIN ต้องเป็นตัวเลข 4 หลัก" };
  }

  ensureSheetHeaders_(sheet, SHEET_HEADERS.Users);

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(normalizeHeader_);
  const empIdCol = headers.indexOf("employeeid") !== -1 ? headers.indexOf("employeeid") : 0;

  if (findPinColumn_(headers) === -1) {
    return { success: false, message: "ไม่พบคอลัมน์ PIN ใน Sheet Users จึงไม่สามารถเพิ่มผู้ใช้ได้" };
  }
  if (headers.indexOf("status") === -1) {
    ensureColumn_(sheet, ["Status", "สถานะ"]);
  }

  for (let i = 1; i < data.length; i++) {
    const existingId = cleanId(data[i][empIdCol]);
    if (sameEmpId_(existingId, employeeId)) {
      return { success: false, message: "รหัสพนักงานนี้มีอยู่ในระบบแล้ว" };
    }
  }

  const updatedData = sheet.getDataRange().getValues();
  const updatedHeaders = updatedData[0].map(normalizeHeader_);
  const newRow = new Array(updatedHeaders.length).fill("");
  updatedHeaders.forEach((h, idx) => {
    if (h === "employeeid") newRow[idx] = employeeId;
    else if (h === "name") newRow[idx] = name;
    else if (h === "department") newRow[idx] = department;
    else if (h === "position") newRow[idx] = position;
    else if (h === "plant") newRow[idx] = plant;
    else if (h === "pin" || h === "password") newRow[idx] = hashPin_(employeeId, pin);
    else if (h === "status") newRow[idx] = status;
  });

  sheet.appendRow(newRow.map(safeCell_));
  try { sheet.getRange(sheet.getLastRow(), empIdCol + 1).setNumberFormat("@").setValue(employeeId); } catch (e) {}

  if (payload.isAdmin) {
    syncAdminRole_(ss, employeeId, name, true, payload.role || "Admin");
  }

  recordAdminLog(payload.adminId, "Create User", `Created User: ${employeeId} - Name: ${name}`);
  return { success: true, message: "เพิ่มผู้ใช้งานสำเร็จ" };
}

function handleUpdateUser(payload) {
  const ss = getDB();
  const sheet = ss.getSheetByName("Users");
  if (!sheet) return { success: false, message: "Users sheet not found" };

  const employeeId = cleanId(payload.employeeId);
  if (!employeeId) return { success: false, message: "ไม่พบรหัสพนักงาน" };
  if (sameEmpId_(employeeId, payload.adminId)) {
    if (payload.isAdmin !== undefined && !payload.isAdmin) return { success: false, message: "ไม่สามารถถอดสิทธิ์ Admin ของตัวเองได้" };
    if (payload.status !== undefined && String(payload.status).toLowerCase() !== "active") return { success: false, message: "ไม่สามารถปิดการใช้งานบัญชีของตัวเองได้" };
  }
  if (payload.pin !== undefined && !/^\d{4}$/.test(cleanId(payload.pin))) {
    return { success: false, message: "PIN ต้องเป็นตัวเลข 4 หลัก" };
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: "ไม่พบผู้ใช้ที่ต้องการแก้ไข" };

  const headers = data[0].map(normalizeHeader_);
  const empIdCol = headers.indexOf("employeeid") !== -1 ? headers.indexOf("employeeid") : 0;
  const nameCol = headers.indexOf("name") !== -1 ? headers.indexOf("name") : 1;
  const deptCol = headers.indexOf("department") !== -1 ? headers.indexOf("department") : 2;
  const posCol = headers.indexOf("position") !== -1 ? headers.indexOf("position") : 3;
  const plantCol = headers.indexOf("plant") !== -1 ? headers.indexOf("plant") : 4;
  const pinCol = findPinColumn_(headers);
  const statusCol = headers.indexOf("status") !== -1 ? headers.indexOf("status") : 6;

  for (let i = 1; i < data.length; i++) {
    const rowEmpId = cleanId(data[i][empIdCol]);
    if (sameEmpId_(rowEmpId, employeeId)) {
      const rowIndex = i + 1;
      if (payload.name !== undefined && nameCol !== -1) sheet.getRange(rowIndex, nameCol + 1).setValue(safeCell_(payload.name));
      if (payload.department !== undefined && deptCol !== -1) sheet.getRange(rowIndex, deptCol + 1).setValue(safeCell_(payload.department));
      if (payload.position !== undefined && posCol !== -1) sheet.getRange(rowIndex, posCol + 1).setValue(safeCell_(payload.position));
      if (payload.plant !== undefined && plantCol !== -1) sheet.getRange(rowIndex, plantCol + 1).setValue(safeCell_(payload.plant));
      if (payload.pin !== undefined && pinCol !== -1) sheet.getRange(rowIndex, pinCol + 1).setNumberFormat("@").setValue(hashPin_(rowEmpId, cleanId(payload.pin)));
      if (payload.status !== undefined && statusCol !== -1) sheet.getRange(rowIndex, statusCol + 1).setValue(safeCell_(payload.status));
      clearUserActiveCache_(employeeId);

      const goingInactive = payload.status !== undefined && String(payload.status).toLowerCase() !== "active";
      if (goingInactive) {
        // ปิดบัญชีแล้ว ต้องถอนสิทธิ์ Admin ด้วย (เหมือนกับ toggleUserStatus)
        syncAdminRole_(ss, employeeId, "", false);
      } else if (payload.isAdmin !== undefined) {
        syncAdminRole_(ss, employeeId, payload.name || data[i][nameCol], Boolean(payload.isAdmin), payload.role);
      }

      recordAdminLog(payload.adminId, "Update User", `Updated User: ${employeeId} - Name: ${payload.name || data[i][nameCol]}`);
      return { success: true, message: "อัปเดตข้อมูลผู้ใช้งานสำเร็จ" };
    }
  }

  return { success: false, message: "ไม่พบผู้ใช้ที่ต้องการแก้ไข" };
}

function handleChangePin(payload) {
  const ss = getDB();
  const sheet = ss.getSheetByName("Users");
  if (!sheet) return { success: false, message: "Users sheet not found" };

  const employeeId = cleanId(payload.employeeId);
  const newPin = cleanId(payload.newPin || "");
  if (!employeeId) return { success: false, message: "ไม่พบรหัสพนักงาน" };

  if (!/^\d{4}$/.test(newPin)) {
    return { success: false, message: "PIN ต้องเป็นตัวเลข 4 หลัก" };
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: "ไม่พบรหัสพนักงาน" };

  const headers = data[0].map(normalizeHeader_);
  const empIdCol = headers.indexOf("employeeid") !== -1 ? headers.indexOf("employeeid") : 0;
  const pinCol = findPinColumn_(headers);

  if (pinCol === -1) {
    return { success: false, message: "ไม่พบคอลัมน์ PIN ใน Sheet Users" };
  }

  for (let i = 1; i < data.length; i++) {
    const rowEmpId = cleanId(data[i][empIdCol]);
    if (sameEmpId_(rowEmpId, employeeId)) {
      const rowIndex = i + 1;
      sheet.getRange(rowIndex, pinCol + 1).setNumberFormat("@").setValue(hashPin_(rowEmpId, newPin));
      try { CacheService.getScriptCache().remove(loginFailKey_(rowEmpId)); } catch (e) {} // เปลี่ยน PIN แล้วปลดล็อกให้ด้วย
      recordAdminLog(payload.adminId, "Change PIN", `Changed PIN for Employee: ${employeeId}`);
      return { success: true, message: "เปลี่ยน PIN สำเร็จแล้ว" };
    }
  }

  return { success: false, message: "ไม่พบรหัสพนักงาน" };
}

function handleToggleUserStatus(payload) {
  const ss = getDB();
  const sheet = ss.getSheetByName("Users");
  if (!sheet) return { success: false, message: "Users sheet not found" };

  const employeeId = cleanId(payload.employeeId);
  const newStatus = payload.status || "Active";
  if (!employeeId) return { success: false, message: "ไม่พบผู้ใช้ที่ระบุ" };
  if (["active", "inactive"].indexOf(String(newStatus).toLowerCase()) === -1) return { success: false, message: "สถานะไม่ถูกต้อง" };
  if (String(newStatus).toLowerCase() !== "active" && sameEmpId_(payload.adminId, employeeId)) {
    return { success: false, message: "ไม่สามารถปิดการใช้งานบัญชีของตัวเองได้" };
  }
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: "ไม่พบผู้ใช้ที่ระบุ" };

  const headers = data[0].map(normalizeHeader_);
  const empIdCol = headers.indexOf("employeeid") !== -1 ? headers.indexOf("employeeid") : 0;
  const statusCol = headers.indexOf("status") !== -1 ? headers.indexOf("status") : -1;

  if (statusCol === -1) {
    return { success: false, message: "ไม่พบคอลัมน์ Status ใน Sheet Users (ต้องมี header ชื่อ Status)" };
  }

  for (let i = 1; i < data.length; i++) {
    const rowEmpId = cleanId(data[i][empIdCol]);
    if (sameEmpId_(rowEmpId, employeeId)) {
      const rowIndex = i + 1;
      sheet.getRange(rowIndex, statusCol + 1).setValue(newStatus);

      clearUserActiveCache_(employeeId);

      // If user is deactivated, deactivate in Admin sheet as well
      if (newStatus.toLowerCase() !== "active") {
        syncAdminRole_(ss, employeeId, "", false);
      }

      recordAdminLog(payload.adminId, "Toggle User Status", `Set status of User ${employeeId} to ${newStatus}`);
      return { success: true, message: `เปลี่ยนสถานะเป็น ${newStatus} สำเร็จ` };
    }
  }

  return { success: false, message: "ไม่พบผู้ใช้ที่ระบุ" };
}

function handleUnlockUser(payload) {
  const employeeId = cleanId(payload.employeeId);
  if (!employeeId) return { success: false, message: "ไม่พบรหัสพนักงาน" };
  try { CacheService.getScriptCache().remove(loginFailKey_(employeeId)); } catch (e) {}
  recordAdminLog(payload.adminId, "Unlock User", `Unlocked login for Employee: ${employeeId}`);
  return { success: true, message: "ปลดล็อกการเข้าสู่ระบบสำเร็จ" };
}

function handleToggleStatus(sheetName, id, status, adminId) {
  if (["News", "Apps"].indexOf(sheetName) === -1) return { success: false, message: "Invalid sheet" };
  if (["active", "inactive"].indexOf(String(status).toLowerCase()) === -1) return { success: false, message: "สถานะไม่ถูกต้อง" };
  const ss = getDB();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, message: sheetName + " sheet not found" };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: "ไม่พบข้อมูลที่ต้องการเปลี่ยนสถานะ" };

  const headers = data[0].map(normalizeHeader_);
  const idCol = headers.indexOf("id") !== -1 ? headers.indexOf("id") : 0;
  const statusCol = headers.indexOf("status") !== -1 ? headers.indexOf("status") : -1;

  if (statusCol === -1) {
    return { success: false, message: "ไม่พบคอลัมน์ Status ใน Sheet " + sheetName };
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === String(id).trim()) {
      const rowIndex = i + 1;
      sheet.getRange(rowIndex, statusCol + 1).setValue(status);
      recordAdminLog(adminId, `Toggle ${sheetName} Status`, `Changed status of ${sheetName} ID ${id} to ${status}`);
      if (sheetName === "News") clearNewsCache_();
      return { success: true, message: `เปลี่ยนสถานะเป็น ${status} สำเร็จ` };
    }
  }

  return { success: false, message: "ไม่พบข้อมูลที่ต้องการเปลี่ยนสถานะ" };
}

function handleContactSubmit(payload) {
  const ss = getDB();
  const sheet = ss.getSheetByName("ContactRequest");
  if (!sheet) return { success: false, message: "ContactRequest sheet not found" };

  const id = genId_("REQ");
  // ต้อง Login เท่านั้น: ใช้รหัสพนักงานจาก token (กันการปลอมตัวส่งเรื่องแทนคนอื่น)
  const employeeId = cleanId(payload._sessionId || "").slice(0, 30);
  if (!employeeId || !isUserActive_(employeeId)) {
    return { success: false, code: "AUTH_REQUIRED", message: "กรุณาเข้าสู่ระบบก่อนส่งเรื่อง" };
  }
  const name = String(payload.name || "").trim().slice(0, 100);
  const topic = String(payload.topic || "").trim().slice(0, 200);
  const detail = String(payload.detail || "").trim().slice(0, 2000);
  const createdDate = nowString_();
  const status = "Open";

  if (!employeeId || !topic || !detail) {
    return { success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" };
  }

  // จำกัดความถี่การส่งเรื่อง กันสแปม
  const rlCache = CacheService.getScriptCache();
  const rlKey = "contactrl_" + employeeId.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
  const rlCount = Number(rlCache.get(rlKey) || 0);
  if (rlCount >= CONTACT_RATE_MAX) {
    return { success: false, message: "ส่งเรื่องบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง" };
  }
  rlCache.put(rlKey, String(rlCount + 1), CONTACT_RATE_WINDOW_SEC);

  ensureSheetHeaders_(sheet, SHEET_HEADERS.ContactRequest);

  // อ่านเฉพาะแถว Header (ไม่อ่านทั้งชีต เพราะ Ticket จะเพิ่มขึ้นเรื่อยๆ และฟังก์ชันนี้ทุกคนเรียกใช้)
  const headers = getHeaderValues_(sheet).map(normalizeHeader_);
  const newRow = new Array(headers.length).fill("");
  headers.forEach((h, idx) => {
    if (h === "id" || h === "ticketid") newRow[idx] = id;
    else if (h === "employeeid") newRow[idx] = employeeId;
    else if (h === "name") newRow[idx] = name;
    else if (h === "topic" || h === "title") newRow[idx] = topic;
    else if (h === "detail" || h === "description") newRow[idx] = detail;
    else if (h === "createddate" || h === "date" || h === "publishdate") newRow[idx] = createdDate;
    else if (h === "status") newRow[idx] = status;
  });
  sheet.appendRow(newRow.map(safeCell_));

  return {
    success: true,
    message: "ส่งข้อมูลแจ้งปัญหา/ติดต่อสอบถามเรียบร้อยแล้ว",
    ticketId: id
  };
}

function getContactRequestsData(params) {
  const ss = getDB();
  const sheet = ss.getSheetByName("ContactRequest");
  if (!sheet) return { success: true, data: [] };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };

  const headers = data[0].map(normalizeHeader_);
  const idCol = findHeaderIndex_(headers, ["id", "ticketid", "รหัส"]);
  const empIdCol = findHeaderIndex_(headers, ["employeeid", "empid", "รหัสพนักงาน"]);
  const nameCol = findHeaderIndex_(headers, ["name", "ชื่อ", "ผู้ส่ง"]);
  const topicCol = findHeaderIndex_(headers, ["topic", "หัวข้อ", "เรื่อง", "title"]);
  const detailCol = findHeaderIndex_(headers, ["detail", "description", "รายละเอียด"]);
  const dateCol = findHeaderIndex_(headers, ["createddate", "date", "datetime", "วันที่"]);
  const statusCol = findHeaderIndex_(headers, ["status", "สถานะ"]);

  const resolvedIdCol = idCol !== -1 ? idCol : 0;
  const resolvedEmpIdCol = empIdCol !== -1 ? empIdCol : 1;
  const resolvedNameCol = nameCol !== -1 ? nameCol : 2;
  const resolvedTopicCol = topicCol !== -1 ? topicCol : 3;
  const resolvedDetailCol = detailCol !== -1 ? detailCol : 4;
  const resolvedDateCol = dateCol !== -1 ? dateCol : 5;
  const resolvedStatusCol = statusCol !== -1 ? statusCol : 6;

  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = String(row[resolvedIdCol] || "").trim();
    const topic = String(row[resolvedTopicCol] || "").trim();
    if (!id && !topic) continue;

    list.push({
      id: id,
      employeeId: cleanId(row[resolvedEmpIdCol]),
      name: String(row[resolvedNameCol] || ""),
      topic: topic,
      detail: String(row[resolvedDetailCol] || ""),
      createdDate: formatDateString(row[resolvedDateCol]),
      status: String(row[resolvedStatusCol] || "Open")
    });
  }

  list.sort((a, b) => dateValue_(b.createdDate) - dateValue_(a.createdDate));

  return { success: true, data: list };
}

function handleUpdateContactStatus(payload) {
  const ss = getDB();
  const sheet = ss.getSheetByName("ContactRequest");
  if (!sheet) return { success: false, message: "ContactRequest sheet not found" };

  const id = String(payload.id).trim();
  const newStatus = payload.status || "In Progress";
  if (CONTACT_STATUSES.indexOf(newStatus) === -1) return { success: false, message: "สถานะไม่ถูกต้อง" };
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: "ไม่พบรายการที่ต้องการแก้ไข" };

  const headers = data[0].map(normalizeHeader_);
  const idCol = headers.indexOf("id") !== -1 ? headers.indexOf("id") : 0;
  const statusCol = headers.indexOf("status") !== -1 ? headers.indexOf("status") : -1;

  if (statusCol === -1) {
    return { success: false, message: "ไม่พบคอลัมน์ Status ใน Sheet ContactRequest" };
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === id) {
      const rowIndex = i + 1;
      sheet.getRange(rowIndex, statusCol + 1).setValue(newStatus);
      recordAdminLog(payload.adminId, "Update Contact Status", `Set Contact Request ID ${id} status to ${newStatus}`);
      return { success: true, message: `อัปเดตสถานะเป็น ${newStatus} สำเร็จ` };
    }
  }

  return { success: false, message: "ไม่พบรายการที่ต้องการแก้ไข" };
}

const LOG_READ_LIMIT = 2000; // อ่านเฉพาะแถวล่าสุด กันชีต Log โตแล้วโหลดช้า

function readLastRows_(sheet, maxRows) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol < 1) return [];
  const count = Math.min(maxRows, lastRow - 1);
  return sheet.getRange(lastRow - count + 1, 1, count, lastCol).getValues();
}

function getLoginLogsData(params) {
  const sheet = getDB().getSheetByName("LoginLog");
  if (!sheet) return { success: true, data: [] };

  const list = [];
  readLastRows_(sheet, LOG_READ_LIMIT).forEach(row => {
    const dateTime = formatDateString(row[0]);
    const employeeId = String(row[1] || "").trim();
    if (!dateTime && !employeeId) return;
    list.push({
      dateTime: dateTime,
      employeeId: employeeId,
      name: String(row[2] || ""),
      ip: String(row[3] || ""),
      status: String(row[4] || "")
    });
  });

  list.sort((a, b) => dateValue_(b.dateTime) - dateValue_(a.dateTime));
  if (list.length > 1000) list.length = 1000;
  return { success: true, data: list };
}

function getAdminLogsData(params) {
  const sheet = getDB().getSheetByName("LogAdmin");
  if (!sheet) return { success: true, data: [] };

  const list = [];
  readLastRows_(sheet, LOG_READ_LIMIT).forEach(row => {
    const dateTime = formatDateString(row[0]);
    const adminId = String(row[1] || "").trim();
    if (!dateTime && !adminId) return;
    list.push({
      dateTime: dateTime,
      adminId: adminId,
      action: String(row[2] || ""),
      detail: String(row[3] || "")
    });
  });

  list.sort((a, b) => dateValue_(b.dateTime) - dateValue_(a.dateTime));
  if (list.length > 1000) list.length = 1000;
  return { success: true, data: list };
}

function getDashboardStatsData() {
  const ss = getDB();
  const countRows = (sheetName, onlyActive) => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return 0;
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return 0;

    // ไม่ต้องกรองสถานะ: อ่านเฉพาะคอลัมน์แรก (เร็วกว่าอ่านทั้งชีต โดยเฉพาะ LoginLog)
    if (!onlyActive) {
      const firsts = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      let n = 0;
      for (let i = 0; i < firsts.length; i++) {
        const v = firsts[i][0];
        if (v !== null && v !== undefined && String(v).trim() !== "") n++;
      }
      return n;
    }

    const values = sheet.getDataRange().getValues();
    const headers = values[0].map(normalizeHeader_);
    const statusCol = headers.indexOf("status");
    let count = 0;
    for (let i = 1; i < values.length; i++) {
      const firstCell = values[i][0];
      if (firstCell === null || firstCell === undefined || String(firstCell).trim() === "") continue;
      if (statusCol !== -1 && String(values[i][statusCol] || "Active").trim().toLowerCase() !== "active") continue;
      count++;
    }
    return count;
  };

  return {
    success: true,
    stats: {
      users: countRows("Users", false),
      news: countRows("News", true),
      apps: countRows("Apps", true),
      contacts: countRows("ContactRequest", false),
      logins: countRows("LoginLog", false)
    }
  };
}

function setupInitialDatabase() {
  const ss = getDB();
  let usersSheet = ss.getSheetByName("Users");
  if (!usersSheet) {
    usersSheet = ss.insertSheet("Users");
    usersSheet.appendRow(SHEET_HEADERS.Users);
    // ข้อมูลตัวอย่างเท่านั้น (PIN เริ่มต้น 1234) — เปลี่ยน PIN และแก้รายชื่อจริงใน Sheet ทันทีหลังติดตั้ง
    usersSheet.appendRow(["10001", "Admin ตัวอย่าง", "งานไอที", "IT Support", "Tasaki", hashPin_("10001", "1234"), "Active"]);
    usersSheet.appendRow(["10002", "พนักงาน ตัวอย่าง", "แผนกประกอบแอร์", "พนักงาน", "Tasaki", hashPin_("10002", "1234"), "Active"]);
    formatHeaderRow(usersSheet);
  }

  let adminSheet = ss.getSheetByName("Admin");
  if (!adminSheet) {
    adminSheet = ss.insertSheet("Admin");
    adminSheet.appendRow(["EmployeeID", "Name", "Role", "Status"]);
    adminSheet.appendRow(["10001", "Admin ตัวอย่าง", "admin", "Active"]);
    formatHeaderRow(adminSheet);
  }

  let loginLogSheet = ss.getSheetByName("LoginLog");
  if (!loginLogSheet) {
    loginLogSheet = ss.insertSheet("LoginLog");
    loginLogSheet.appendRow(["DateTime", "EmployeeID", "Name", "IP", "Status"]);
    formatHeaderRow(loginLogSheet);
  }

  let logAdminSheet = ss.getSheetByName("LogAdmin");
  if (!logAdminSheet) {
    logAdminSheet = ss.insertSheet("LogAdmin");
    logAdminSheet.appendRow(["DateTime", "AdminID", "Action", "Detail"]);
    formatHeaderRow(logAdminSheet);
  }

  let newsSheet = ss.getSheetByName("News");
  if (!newsSheet) {
    newsSheet = ss.insertSheet("News");
    newsSheet.appendRow(SHEET_HEADERS.News);
    newsSheet.appendRow([
      "N001",
      "ประกาศนโยบายการทำงานแบบ Hybrid Workplace ประจำปี 2026",
      "บริษัทมุ่งมั่นส่งเสริมสมดุลชีวิตและการทำงาน (Work-Life Balance) โดยอนุญาตให้พนักงานสามารถเลือกทำงานแบบ Work from Anywhere ได้สัปดาห์ละ 2 วันตามข้อตกลงของแต่ละแผนก",
      "",
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80",
      "Announcement",
      "Active",
      "2026-11-15"
    ]);
    newsSheet.appendRow([
      "N002",
      "กิจกรรมตรวจสุขภาพประจำปี 2026 สำหรับพนักงานทุกคน",
      "ขอเชิญชวนเพื่อนพนักงานทุกคนเข้ารับการตรวจสุขภาพประจำปี ณ อาคารอเนกประสงค์ ชั้น 2 ในวันที่ 25-27 พฤศจิกายน 2026 ตั้งแต่เวลา 08:30 - 15:00 น. กรุณางดน้ำและอาหารหลัง 20:00 น.",
      "",
      "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&q=80",
      "Activity",
      "Active",
      "2026-11-10"
    ]);
    newsSheet.appendRow([
      "N003",
      "โครงการปรับปรุงระบบประหยัดพลังงานและความปลอดภัยในโรงงาน",
      "ฝ่ายวิศวกรรมและซ่อมบำรุงจะดำเนินการติดตั้งระบบโซลาร์เซลล์และเซนเซอร์ความปลอดภัยอัจฉริยะในพื้นที่ผลิตโซน B โดยจะเริ่มดำเนินการตั้งแต่วันเสาร์นี้เป็นต้นไป",
      "",
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80",
      "Production",
      "Active",
      "2026-11-05"
    ]);
    formatHeaderRow(newsSheet);
  }

  let appsSheet = ss.getSheetByName("Apps");
  if (!appsSheet) {
    appsSheet = ss.insertSheet("Apps");
    appsSheet.appendRow(SHEET_HEADERS.Apps);
    appsSheet.appendRow(["APP01", "ระบบยื่นใบลาออนไลน์ (Leave Request)", "ยื่นขอลาพักร้อน ลาป่วย ตรวจสอบวันลาคงเหลือ", "modules/leave/index.html", "calendar-days", "HR", "Active", "Internal"]);
    appsSheet.appendRow(["APP02", "ระบบจองห้องประชุม (Meeting Rooms)", "จองห้องประชุม ตรวจสอบตารางการใช้ห้องประชุม", "modules/meeting/index.html", "users", "HR", "Active", "Internal"]);
    appsSheet.appendRow(["APP03", "ระบบลงทะเบียนผู้มาติดต่อ (Visitor)", "แจ้งนัดหมายล่วงหน้าและบันทึกผู้เข้าพบ", "modules/visitor/index.html", "shield-check", "Quality", "Active", "Internal"]);
    appsSheet.appendRow(["APP04", "ระบบตรวจสอบคุณภาพ (QA Inspection)", "บันทึกผลตรวจสอบชิ้นงานและสถิติข้อบกพร่อง", "modules/quality/index.html", "clipboard-check", "Quality", "Active", "Internal"]);
    appsSheet.appendRow(["APP05", "Power BI Executive Dashboard", "รายงานวิเคราะห์ยอดขายและผลประกอบการผู้บริหาร", "https://app.powerbi.com", "bar-chart-3", "Dashboard", "Active", "External"]);
    appsSheet.appendRow(["APP06", "ระบบ ERP องค์กร (SAP WebGUI)", "ระบบบริหารจัดการทรัพยากรและการสั่งซื้อ", "https://my-sap-enterprise.com", "database", "Finance", "Active", "External"]);
    appsSheet.appendRow(["APP07", "ระบบ MES ติดตามการผลิต", "Manufacturing Execution System ติดตามไลน์ผลิต Real-time", "https://mes-production.internal", "cog", "Production", "Active", "External"]);
    appsSheet.appendRow(["APP08", "แบบประเมินความพึงพอใจ (Google Form)", "สำรวจความคิดเห็นพนักงานประจำไตรมาส", "https://forms.google.com", "file-text", "External Link", "Active", "External"]);
    formatHeaderRow(appsSheet);
  }

  // 7. ContactRequest
  let contactSheet = ss.getSheetByName("ContactRequest");
  if (!contactSheet) {
    contactSheet = ss.insertSheet("ContactRequest");
    contactSheet.appendRow(["ID", "EmployeeID", "Name", "Topic", "Detail", "CreatedDate", "Status"]);
    contactSheet.appendRow(["REQ001", "10002", "พนักงาน ตัวอย่าง", "ขอสิทธิ์เข้าใช้งานระบบ MES", "ต้องการขอสิทธิ์เข้าใช้งาน MES ในส่วนของ Line 4 กะเช้าครับ", "2026-11-16 09:30:00", "Open"]);
    formatHeaderRow(contactSheet);
  }

  // 8. Videos (YouTube 3 Slots)
  let videosSheet = ss.getSheetByName("Videos");
  if (!videosSheet) {
    videosSheet = ss.insertSheet("Videos");
    videosSheet.appendRow(SHEET_HEADERS.Videos);
    DEFAULT_VIDEOS.forEach(v => videosSheet.appendRow(v));
    formatHeaderRow(videosSheet);
  }

  migrateDatabaseSchema();

  return { success: true, message: "สร้างฐานข้อมูล Google Sheets และใส่ Seed Data เรียบร้อยแล้ว!" };
}

// รันครั้งเดียวจาก Apps Script Editor (เลือกฟังก์ชันนี้ แล้วกด Run) เพื่อแปลง PIN เดิมทั้งชีตเป็น hash ทันที
// ถ้าไม่รัน PIN เดิมของแต่ละคนจะถูกแปลงเองเมื่อเขาเข้าสู่ระบบสำเร็จครั้งถัดไป
function migratePinsToHash() {
  const sheet = getDB().getSheetByName("Users");
  if (!sheet) return { success: false, message: "Users sheet not found" };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, message: "ไม่มีข้อมูลผู้ใช้" };

  const headers = data[0].map(normalizeHeader_);
  const empIdCol = headers.indexOf("employeeid") !== -1 ? headers.indexOf("employeeid") : 0;
  const pinCol = findPinColumn_(headers);
  if (pinCol === -1) return { success: false, message: "ไม่พบคอลัมน์ PIN ใน Sheet Users" };

  let converted = 0;
  for (let i = 1; i < data.length; i++) {
    const id = cleanId(data[i][empIdCol]);
    const pin = cleanId(data[i][pinCol]);
    if (!id || !pin || isHashedPin_(pin) || !/^\d{1,4}$/.test(pin)) continue;
    const normalized = pin.padStart(4, "0");
    sheet.getRange(i + 1, pinCol + 1).setNumberFormat("@").setValue(hashPin_(id, normalized));
    converted++;
  }
  const msg = "แปลง PIN เป็น hash แล้ว " + converted + " บัญชี";
  Logger.log(msg);
  return { success: true, message: msg };
}

function formatHeaderRow(sheet) {
  if (!sheet) return;
  const lastCol = sheet.getLastColumn();
  if (lastCol <= 0) return;
  const header = sheet.getRange(1, 1, 1, lastCol);
  header.setBackground("#004A99");
  header.setFontColor("#FFFFFF");
  header.setFontWeight("bold");
  sheet.setFrozenRows(1);
}

function formatDateString(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, getSheetTz_(), "yyyy-MM-dd HH:mm:ss");
  }
  return String(val);
}