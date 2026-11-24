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
│   CORS Compatible & Input Validation          │
└───────────────────────┬───────────────────────┘
                        │
                        │ SpreadsheetApp Service
                        ▼
┌───────────────────────────────────────────────┐
│          Database (Google Sheets)             │
│   Users, Admin, LoginLog, LogAdmin,           │
│   News, Apps, ContactRequest                  │
└───────────────────────────────────────────────┘
```

---

## 📂 โครงสร้างโปรเจกต์ (Project Structure)

```text
employee-portal/
├── index.html                   # หน้า 2: ศูนย์รวมข่าวสารองค์กร (News Portal)
├── login.html                   # หน้า 1: หน้าเข้าสู่ระบบ (Login ด้วย Employee ID + PIN 4 หลัก)
├── apps.html                    # หน้า 3: รวมลิงก์แอปพลิเคชันองค์กร (Apps Directory)
├── contact.html                 # หน้า 4: แบบฟอร์มแจ้งปัญหาและติดต่อสอบถาม (Contact & Support)
├── admin.html                   # หน้า 5: ระบบจัดการข้อมูลสำหรับแอดมิน (Admin Panel)
│
├── css/
│   └── styles.css               # Corporate Design System, Responsive, Modal, Toast
│
├── js/
│   ├── config.js                # ไฟล์ตั้งค่า Web App API URL และข้อมูลองค์กร
│   ├── utils.js                 # Helper ฟังก์ชัน (Toast, Modal, Format Date, Icons)
│   ├── auth.js                  # ระบบ Authentication, LocalStorage Session, Route Guard
│   ├── api.js                   # Unified REST API Client สำหรับเรียก GAS
│   ├── news.js                  # ควบคุมหน้าข่าวสาร (Search, Filter, Modal Popup)
│   ├── apps.js                  # ควบคุมหน้ารวมแอป (Filter หมวดหมู่, Search, External Links)
│   ├── contact.js               # ควบคุมหน้าแจ้งปัญหา (Autofill, Validate, Submit)
│   └── admin.js                 # ควบคุมหน้า Admin (Dashboard, CRUD News, CRUD Apps, Users, Logs)
│
├── backend/
│   ├── Code.gs                  # โค้ด Google Apps Script (doGet & doPost REST API)
│   └── README.md                # คู่มือการติดตั้ง GAS และสร้างชีตฐานข้อมูลใน 3 นาที
│
└── modules/                     # ตัวอย่าง Internal Web Application บน GitHub Pages
    ├── leave/index.html         # ระบบยื่นใบลาออนไลน์
    ├── meeting/index.html       # ระบบจองห้องประชุม
    ├── visitor/index.html       # ระบบลงทะเบียนผู้มาติดต่อ
    └── quality/index.html       # ระบบตรวจสอบคุณภาพ
```

---

## 📊 โครงสร้างฐานข้อมูล (Google Sheets Database)

| ชื่อชีต (Sheet Name) | คอลัมน์ (Columns) | รายละเอียด |
| :--- | :--- | :--- |
| **`Users`** | `EmployeeID` \| `Name` \| `Department` \| `Position` \| `Plant` \| `PIN` \| `Status` | ข้อมูลพนักงานและรหัส PIN 4 หลัก (Layout จริงจาก Sheet) |
| **`Admin`** | `EmployeeID` \| `Name` \| `Role` \| `Status` | ตรวจสอบสิทธิ์การเข้าใช้งาน Admin Panel |
| **`LoginLog`** | `DateTime` \| `EmployeeID` \| `Name` \| `IP` \| `Status` | ประวัติการเข้าสู่ระบบสำเร็จ/ล้มเหลว |
| **`LogAdmin`** | `DateTime` \| `AdminID` \| `Action` \| `Detail` | บันทึกการเพิ่ม ลบ แก้ไข ข้อมูลของแอดมิน |
| **`News`** | `ID` \| `AppName` \| `Description` \| `URL` \| `Icon` \| `Category` \| `Status` | ข่าวสารและประกาศองค์กร |
| **`Apps`** | `ID` \| `AppName` \| `Description` \| `URL` \| `Icon` \| `Category` \| `Status` | รายการแอปพลิเคชันระบบงาน |
| **`ContactRequest`** | `ID` \| `EmployeeID` \| `Name` \| `Topic` \| `Detail` \| `CreatedDate` \| `Status` | รายการแจ้งปัญหาและข้อสอบถาม |
| **`Videos`** | `ID` \| `Title` \| `URL` \| `Description` \| `Category` \| `Order` \| `Status` | รายการคลิปวิดีโอ YouTube ประชาสัมพันธ์ 3 ช่อง |

> **คอลัมน์เสริม (Optional Extensions):** `Users` ใช้ Layout จริง 7 คอลัมน์จากไฟล์ Excel แล้ว
> ส่วน `News`/`Apps` โค้ดจะต่อท้ายคอลัมน์เหล่านี้ให้อัตโนมัติเมื่อสร้างชีตใหม่
> เพราะ Functional Requirement ต้องใช้ข้อมูลที่ Schema หลักไม่มี:
> - `News`: `PublishDate` (ใช้แสดง/เรียงวันที่เผยแพร่)
> - `Apps`: `Type` (ใช้แยก `Internal` / `External`; ถ้าไม่มีจะ derive จาก URL)
>
> ชีต `News`/`Apps` แบบ 7 คอลัมน์ตาม Spec ยังอ่านได้ปกติ แต่จะไม่มีวันที่/Type
> จนกว่าจะรัน `migrateDatabaseSchema` หรือเพิ่มคอลัมน์เสริมเอง

---

## 🛠️ รายละเอียดฟังก์ชันแต่ละหน้า (Functional Highlights)

### หน้า 1 : เข้าสู่ระบบ (`login.html`)
- พนักงานเข้าสู่ระบบด้วย **Employee ID** และ **PIN 4 หลัก** (พร้อม auto-jump ระหว่างช่องกรอก)
- ตรวจสอบความถูกต้องจาก Sheet `Users` และต้องมี `Status = Active`
- บันทึกประวัติการ Login (สำเร็จหรือสาเหตุที่ล้มเหลว) ลงใน Sheet `LoginLog` พร้อม IP
- เก็บข้อมูล Session ลง `localStorage` เพื่อใช้งานในหน้าอื่นๆ และทำการ Redirect ไปหน้า Home (`index.html`)

### หน้า 2 : ข่าวสารองค์กร (`index.html`)
- **Carousel ข่าวเด่นวันนี้ (Today's Highlights)**: สไลด์เลื่อนข่าวประจำวันอัตโนมัติ (Auto-play ทุก 5 วินาที, Pause เมื่อชี้เมาส์, รองรับ Touch Swipe บนมือถือ/แท็บเล็ต) พร้อมป้ายไฟกะพริบ `🔥 ข่าววันนี้`
- ดึงข้อมูลข่าวสารจาก Sheet `News` เรียงจากวันที่ล่าสุดก่อน
- ค้นหาข่าวแบบ Real-time (`Search`) และกรองตามหมวดหมู่ (`Filter`)
- แสดงรูปภาพข่าว วันที่เผยแพร่ และป้ายกำกับหมวดหมู่
- คลิกเพื่อดูรายละเอียดข่าวฉบับเต็มผ่าน **Modal Popup**
- **วิดีโอประชาสัมพันธ์ YouTube 3 ช่อง**: แสดงคลิปวิดีโอแนะนำองค์กรและคู่มือการใช้งาน 3 ช่องรายการ พร้อม Smart Embed สัดส่วน 16:9 และปุ่มลัดสำหรับ Admin แก้ไขลิงก์ YouTube ได้โดยตรง

### หน้า 3 : ศูนย์รวมแอปพลิเคชัน (`apps.html`)
- **Route Guard**: จำกัดสิทธิ์เฉพาะผู้ที่ Login แล้วเท่านั้น (หากยังไม่ล็อกอินจะถูก Redirect ไป `login.html`)
- ดึงข้อมูลจาก Sheet `Apps` รองรับทั้งลิงก์ภายใน GitHub Pages (`Internal`) และลิงก์ระบบภายนอก (`External`)
- กรองหมวดหมู่: **HR, Production, Finance, Quality, Dashboard, External Link**
- ระบบค้นหาแอปพลิเคชัน และเปิด URL ในแท็บใหม่เมื่อคลิก

### หน้า 4 : แจ้งปัญหาและติดต่อสอบถาม (`contact.html`)
- ดึงข้อมูล **Employee ID** และ **ชื่อพนักงาน** จาก Session ใน LocalStorage อัตโนมัติ
- เมื่อส่งข้อมูล จะบันทึกลง Sheet `ContactRequest` พร้อมระบุ `CreatedDate` และสถานะเริ่มต้น `Status = Open`
- แสดงการแจ้งเตือนสำเร็จด้วย **Toast Notification**

### หน้า 5 : ระบบจัดการข้อมูลสำหรับแอดมิน (`admin.html`)
- **Authorization Guard**: ตรวจสอบสิทธิ์จาก Sheet `Admin` (หากไม่ใช่ Admin จะถูก Redirect กลับหน้า Home)
- **Dashboard Summary**: สรุปสถิติจำนวนผู้ใช้ ข่าวสาร แอป และรายการแจ้งปัญหา
- **News Management (CRUD)**: เพิ่ม แก้ไข ลบ และเปิด/ปิดสถานะข่าวสาร
- **YouTube Management**: จัดการและแก้ไขลิงก์วิดีโอ YouTube ทั้ง 3 ช่อง พร้อมบันทึกลง Google Sheets ชีต `Videos`
- **Apps Management (CRUD)**: เพิ่ม แก้ไข ลบ และเปิด/ปิดสถานะแอป
- **User Management**: เพิ่มพนักงาน แก้ไขข้อมูล เปลี่ยน PIN 4 หลัก และเปิด/ปิดการใช้งานบัญชี
- **Tickets Management**: ตรวจสอบรายการแจ้งปัญหาและอัปเดตสถานะ (`Open`, `In Progress`, `Closed`)
- **Login Logs**: ตรวจสอบประวัติ Login รองรับ Search, Filter Status, Sort และ Pagination
- **Admin Activity Logs**: ตรวจสอบประวัติการทำงานของแอดมิน บันทึกทุกการกระทำลงใน `LogAdmin` อัตโนมัติ

---

## 📱 การติดตั้งแบบ Progressive Web App (PWA)

ระบบรองรับมาตรฐาน **PWA (Progressive Web App)** เต็มรูปแบบ:
1. **บนคอมพิวเตอร์ (Windows / Mac / Chrome / Edge)**:
   - สังเกตปุ่ม **"📲 ติดตั้งแอป"** ใน Navbar หรือไอคอนติดตั้งตรงแถบ URL ด้านบนของเบราว์เซอร์
   - กดปุ่มเพื่อติดตั้ง Employee Portal ลงเป็นโปรแกรมบนเครื่อง มีไอคอนมาสคอต BW บน Desktop และ Start Menu
2. **บนมือถือ Android**:
   - จะมีแบนเนอร์ด้านล่างปรากฏขึ้นมาว่า *"ติดตั้ง Employee Portal"* หรือกดปุ่ม *"📲 ติดตั้งแอป"*
   - กด **"ติดตั้งเลย"** แอปจะถูกเพิ่มไปยังหน้าจอหลัก (Home Screen) เหมือนแอปใน Play Store
3. **บน iPhone / iPad (Safari)**:
   - แตะปุ่ม **แชร์ (Share) 📤** ที่แถบเมนูด้านล่างของ Safari
   - เลื่อนลงแล้วเลือก **"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen) ➕**
   - กด **"เพิ่ม" (Add)** ไอคอนเพนกวิน BW จะไปปรากฏบนหน้าจอโฮมทันที

---

## 🔑 บัญชีทดสอบระบบเริ่มต้น (Test Credentials)

| สิทธิ์ (Role) | Employee ID | Name | PIN | การเข้าถึง |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `1673231` | นาย ปฏิพล พึ่งพังเทียม | `3293` | เข้าได้ทุกหน้า รวมถึง Admin Panel |
| **Admin** | `1540524` | นางสาว สุภาวดี เสนาะเสียง | `1234` | เข้าได้ทุกหน้า รวมถึง Admin Panel |
| **Employee** | `3630169` | นาย เชิดศักดิ์ พรหมคุปต์ | `1234` | เข้าหน้า ข่าวสาร, แอป, ติดต่อสอบถาม (ไม่เห็น Admin Panel) |

> ข้อมูลข้างต้นคือ Seed Data ที่ `setupInitialDatabase()` สร้างจริงใน Sheet `Users`/`Admin`
> (บัญชี `10001` / John Doe ในเอกสารเวอร์ชันเก่าไม่มีอยู่ในฐานข้อมูลจริง)

---

## 🚢 ขั้นตอนการ Deploy

### 1. Deploy Frontend บน GitHub Pages
1. Push โค้ดทั้งหมดขึ้น GitHub Repository
2. ไปที่ **Settings** > **Pages**
3. ที่หัวข้อ **Build and deployment** ให้เลือก Source เป็น **Deploy from a branch**
4. เลือก Branch `main` โฟลเดอร์ `/ (root)` แล้วกด **Save**
5. รอ 1-2 นาที GitHub Pages จะสร้าง URL เว็บไซต์พร้อมใช้งานทันที

### 2. ติดตั้ง Backend บน Google Apps Script
ดูคู่มือการติดตั้งแบบละเอียดได้ใน [`backend/README.md`](backend/README.md)
1. นำโค้ดจาก `backend/Code.gs` ไปวางใน Google Apps Script ของชีต
2. รันฟังก์ชัน `setupInitialDatabase` เพื่อสร้างชีตทั้ง 7 แผ่นและใส่ Seed Data
   (ถ้าเป็นชีต Production และไม่ต้องการข้อมูลตัวอย่าง ให้รัน `ensureAllSheets` แทน
   และถ้ามีชีตเดิมอยู่แล้ว ให้รัน `migrateDatabaseSchema` เพิ่มหนึ่งครั้งเพื่อเพิ่มคอลัมน์ `PublishDate`/`Type`)
3. กด **Deploy as Web App** (Execute as: `Me`, Who has access: `Anyone`)
4. นำ Web App URL ที่ได้มาใส่ในตัวแปร `GAS_API_URL` ในไฟล์ `js/config.js`
5. เปิด `https://script.google.com/macros/s/<DEPLOY_ID>/exec?action=ping` เพื่อตรวจว่า API ตอบ JSON
