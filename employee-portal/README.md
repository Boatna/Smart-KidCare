# 🏢 Employee Portal Web Application

ระบบเว็บแอปพลิเคชันพอร์ทัลบริการพนักงานภายในองค์กร ออกแบบตามสถาปัตยกรรม **Serverless** ใช้งานได้ทั้งบน **Desktop** และ **Mobile (Responsive Design)** โดยใช้ **GitHub Pages** สำหรับส่วน Frontend และใช้ **Google Apps Script (GAS) + Google Sheets** เป็น Backend REST API และ Database

---

## 🚀 สถาปัตยกรรมระบบ (System Architecture)

```
┌───────────────────────────────────────────────┐
│          Frontend (GitHub Pages)              │
│   HTML5 + CSS3 + Vanilla JavaScript (ES6)     │
│   Responsive Design (Desktop & Mobile)        │
└───────────────────────┬───────────────────────┘
                        │
                        │ HTTP GET / POST (JSON)
                        ▼
┌───────────────────────────────────────────────┐
│         Backend (Google Apps Script)          │
│   Web App REST API: doGet() & doPost()        │
│   Session Token (HMAC) & Input Validation     │
└───────────────────────┬───────────────────────┘
                        │
                        │ SpreadsheetApp Service
                        ▼
┌───────────────────────────────────────────────┐
│          Database (Google Sheets)             │
│   Users, Admin, LoginLog, LogAdmin, News,     │
│   Apps, ContactRequest, Videos,               │
│   PushSubscriptions                           │
└───────────────────────────────────────────────┘
```

---

## 📂 โครงสร้างโปรเจกต์ (Project Structure)

```text
employee-portal/
├── index.html                   # ศูนย์รวมข่าวสารองค์กร (News Portal) — เปิดดูได้โดยไม่ต้อง Login
├── login.html                   # เข้าสู่ระบบด้วย Employee ID + PIN 4 หลัก
├── apps.html                    # รวมลิงก์แอปพลิเคชันองค์กร (ต้อง Login)
├── contact.html                 # แบบฟอร์มแจ้งปัญหาและติดต่อสอบถาม (ต้อง Login)
├── admin.html                   # ระบบจัดการข้อมูลสำหรับแอดมิน (เฉพาะ Admin)
├── manifest.json                # PWA manifest
├── sw.js                        # Service Worker (Network First สำหรับ HTML/JS/CSS)
│
├── css/
│   └── styles.css
│
├── js/
│   ├── config.js                # Web App API URL และข้อมูลองค์กร
│   ├── utils.js                 # Helper (Toast, Modal, Format Date, Icons, Image)
│   ├── theme-seasonal.js        # ธีมตามเทศกาล
│   ├── auth.js                  # Session (localStorage), Route Guard
│   ├── api.js                   # REST API Client สำหรับเรียก GAS (แนบ token อัตโนมัติ)
│   ├── pwa.js                   # ติดตั้งแอป, การแจ้งเตือนข่าวใหม่
│   ├── news.js                  # หน้าข่าวสาร (Carousel, Search, Filter, YouTube)
│   ├── apps.js                  # หน้ารวมแอป
│   ├── contact.js               # หน้าแจ้งปัญหา
│   └── admin.js                 # หน้า Admin (CRUD, Logs, ปลดล็อกผู้ใช้)
│
├── assets/icons/                # app-icon, icon-192/512, icon-maskable-512, apple-touch-icon, favicon-16/32
│
├── backend/
│   ├── Code.gs                  # Google Apps Script (doGet & doPost REST API)
│   └── README.md                # คู่มือติดตั้ง GAS และสร้างชีตฐานข้อมูล
│
└── modules/                     # Internal Web Application (ถ้ามี) เช่น modules/leave/index.html
```

---

## 📊 โครงสร้างฐานข้อมูล (Google Sheets Database)

| ชื่อชีต | คอลัมน์ | รายละเอียด |
| :--- | :--- | :--- |
| **`Users`** | `EmployeeID` \| `Name` \| `Department` \| `Position` \| `Plant` \| `PIN` \| `Status` | ข้อมูลพนักงาน (คอลัมน์ PIN เก็บเป็น **hash** ไม่ใช่ตัวเลขจริง) |
| **`Admin`** | `EmployeeID` \| `Name` \| `Role` \| `Status` | สิทธิ์เข้า Admin Panel |
| **`LoginLog`** | `DateTime` \| `EmployeeID` \| `Name` \| `IP` \| `Status` | ประวัติการเข้าสู่ระบบ (IP ส่งมาจากเครื่องผู้ใช้ จึงใช้อ้างอิงเท่านั้น) |
| **`LogAdmin`** | `DateTime` \| `AdminID` \| `Action` \| `Detail` | บันทึกการกระทำของแอดมิน |
| **`News`** | `ID` \| `Title` \| `Detail` \| `URL` \| `ImageUrl` \| `Category` \| `Status` \| `PublishDate` | ข่าวสารและประกาศ (รองรับชีตเดิมที่ใช้ header `AppName`/`Description`/`Icon` อัตโนมัติ) |
| **`Apps`** | `ID` \| `AppName` \| `Description` \| `URL` \| `Icon` \| `Category` \| `Status` \| `Type` | รายการแอปพลิเคชัน |
| **`ContactRequest`** | `ID` \| `EmployeeID` \| `Name` \| `Topic` \| `Detail` \| `CreatedDate` \| `Status` | รายการแจ้งปัญหา |
| **`Videos`** | `ID` \| `Title` \| `URL` \| `Description` \| `Category` \| `Order` \| `Status` | คลิป YouTube 3 ช่อง |
| **`PushSubscriptions`** | `DateTime` \| `EmployeeID` \| `Name` \| `Subscription` \| `UserAgent` \| `Status` | ข้อมูลอุปกรณ์ที่เปิดการแจ้งเตือน |

> ชีต `News`/`Apps` เวอร์ชันเก่าที่ไม่มีคอลัมน์ `PublishDate`/`Type` ให้รัน `migrateDatabaseSchema` หนึ่งครั้ง

---

## 🛠️ รายละเอียดฟังก์ชันแต่ละหน้า

### `login.html`
- เข้าสู่ระบบด้วย **Employee ID** + **PIN 4 หลัก** (auto-jump ระหว่างช่อง, รองรับ paste)
- ตรวจสอบจาก Sheet `Users` และต้องมี `Status = Active`
- ใส่ PIN ผิดครบ 5 ครั้งจะถูกล็อก 15 นาที (Admin ปลดล็อกได้ทันทีจากหน้า "จัดการผู้ใช้")
- บันทึกประวัติลง `LoginLog` และเก็บ Session (token อายุ 12 ชั่วโมง) ใน `localStorage`

### `index.html`
- Carousel ข่าวเด่น (Auto-play 5 วินาที, Touch Swipe), ค้นหา/กรองหมวดหมู่, Modal รายละเอียดข่าว
- วิดีโอ YouTube 3 ช่อง (Admin แก้ลิงก์ได้จากหน้านี้)
- รายการข่าวถูกแคชฝั่ง Backend 5 นาที (การเพิ่ม/แก้/ลบ/สลับสถานะผ่าน Admin Panel ล้างแคชให้ทันที)

### `apps.html`
- ต้อง Login (ไม่เช่นนั้นถูกส่งไป `login.html`)
- กรองหมวดหมู่ HR, Production, Finance, Quality, Dashboard, External Link และค้นหาได้

### `contact.html`
- **ต้อง Login** — Backend ใช้รหัสพนักงานจาก token เท่านั้น (ปลอมรหัสคนอื่นไม่ได้)
- จำกัด 5 ครั้งต่อ 10 นาทีต่อพนักงาน บันทึกลง `ContactRequest` สถานะเริ่มต้น `Open`

### `admin.html`
- ตรวจสิทธิ์ทั้งฝั่งหน้าเว็บและฝั่ง Backend (ใช้ token ทุกคำสั่ง)
- Dashboard, จัดการข่าว/แอป/ผู้ใช้/วิดีโอ, เปลี่ยน PIN, ปลดล็อกการ Login (🔓), อัปเดตสถานะ Ticket
- Login Logs และ Admin Activity Logs (Search, Filter, Sort, Pagination)

---

## 📱 การติดตั้งแบบ Progressive Web App (PWA)

1. **คอมพิวเตอร์ (Chrome / Edge):** กดปุ่ม **"📲 ติดตั้งแอป"** ใน Navbar หรือไอคอนติดตั้งที่แถบ URL
2. **Android:** กดแบนเนอร์ **"ติดตั้ง"** หรือปุ่ม **"📲 ติดตั้งแอป"**
3. **iPhone / iPad (Safari):** แตะ **แชร์ 📤** → **เพิ่มไปยังหน้าจอโฮม** → **เพิ่ม**

> **การแจ้งเตือนข่าวใหม่:** ปัจจุบันทำงานเมื่อเปิดแอป/แท็บค้างไว้และผู้ใช้อนุญาตการแจ้งเตือนแล้ว (ตรวจข่าวใหม่ทุก 5 นาที)
> หากต้องการแจ้งเตือนขณะปิดแอป ต้องติดตั้ง Web Push จริง (เช่น OneSignal) เพิ่มเติม

---

## 🔑 บัญชีเริ่มต้น และความปลอดภัยของ PIN

`setupInitialDatabase()` สร้างบัญชี **ตัวอย่าง** เท่านั้น — ห้ามนำรายชื่อ/PIN พนักงานจริงมาใส่ใน repo หรือ README

| Role | Employee ID | PIN เริ่มต้น | หมายเหตุ |
| :--- | :--- | :--- | :--- |
| Admin | `10001` | `1234` | เปลี่ยน PIN และแก้เป็นรายชื่อจริงใน Sheet ทันทีหลังติดตั้ง |
| Employee | `10002` | `1234` | บัญชีตัวอย่าง ลบทิ้งได้ |

- PIN ถูกเก็บเป็น hash (SHA-256 + `PIN_PEPPER` ใน Script Properties) — **ห้ามลบ/เปลี่ยน `PIN_PEPPER`**
- รัน `initSecurity` หนึ่งครั้งก่อนเปิดใช้งาน และรัน `migratePinsToHash` หากมี PIN แบบเดิมอยู่ในชีต
- ดูรายละเอียดใน [`backend/README.md`](backend/README.md)

---

## 🚢 ขั้นตอนการ Deploy

### 1. Frontend บน GitHub Pages
1. Push โค้ดทั้งหมดขึ้น GitHub Repository
2. **Settings** > **Pages** > Source: **Deploy from a branch** > Branch `main` โฟลเดอร์ `/ (root)` > **Save**
3. รอ 1–2 นาที GitHub Pages จะสร้าง URL ให้

### 2. Backend บน Google Apps Script
ดูคู่มือละเอียดที่ [`backend/README.md`](backend/README.md)
1. วางโค้ด `backend/Code.gs` ใน Apps Script ของชีต
2. รัน `initSecurity` (ครั้งเดียว) แล้วรัน `setupInitialDatabase` (ชีตใหม่) หรือ `ensureAllSheets` (ชีต Production ที่ไม่ต้องการข้อมูลตัวอย่าง)
   และ `migrateDatabaseSchema` / `migratePinsToHash` ถ้าเป็นชีตเดิม
3. **Deploy as Web App** (Execute as: `Me`, Who has access: `Anyone`) — ทุกครั้งที่แก้ `Code.gs` ต้อง Deploy เป็น **New version**
4. นำ Web App URL ไปใส่ `GAS_API_URL` ใน `js/config.js`
5. ตรวจว่า `<URL>/exec?action=ping` ตอบเป็น JSON