# คู่มือการติดตั้ง Google Apps Script (Backend API) & Google Sheets Database

ระบบ Employee Portal ใช้สถาปัตยกรรมแบบ Serverless โดยใช้ **Google Sheets** เป็นฐานข้อมูล และ **Google Apps Script (GAS)** ทำหน้าที่เป็น REST API ให้กับ Frontend บน GitHub Pages

---

## ขั้นตอนที่ 1: สร้าง Google Sheets & Google Apps Script

1. ไปที่ [Google Sheets](https://sheets.new) แล้วสร้าง Spreadsheet เปล่าขึ้นมาใหม่ ตั้งชื่อว่า `Employee_Portal_DB`
2. ไปที่เมนู **ส่วนขยาย (Extensions)** > **Apps Script**
3. ลบโค้ดเดิมในไฟล์ `Code.gs` ทั้งหมด แล้วคัดลอกโค้ดจากไฟล์ `backend/Code.gs` ในโปรเจกต์นี้ไปวางแทนที่
4. บันทึกโปรเจกต์ (กดปุ่มเซฟ หรือ Ctrl + S)

---

## ขั้นตอนที่ 2: เริ่มต้นสร้างตารางฐานข้อมูลและข้อมูลจำลอง (Seed Data)

ในหน้า Google Apps Script:
1. ด้านบนตรงดรอปดาวน์เลือกฟังก์ชัน ให้เลือกฟังก์ชันชื่อ `setupInitialDatabase`
2. กดปุ่ม **เรียกใช้ (Run)**
3. Google จะขอสิทธิ์อนุญาตการเข้าถึงชีต ให้กด **ตรวจสอบสิทธิ์ (Review Permissions)** > เลือกบัญชี Google ของคุณ > กด **ขั้นสูง (Advanced)** > กด **ไปที่... (ไม่ปลอดภัย) / Go to ... (unsafe)** > กด **อนุญาต (Allow)**
4. เมื่อฟังก์ชันทำงานเสร็จ ให้กลับไปดูที่ Google Sheets จะพบว่าชีตทั้ง 9 แผ่นถูกสร้างพร้อมข้อมูลเริ่มต้นเรียบร้อยแล้ว:
   - `Users`: ข้อมูลพนักงานและรหัสผ่าน PIN 4 หลัก
   - `Admin`: ข้อมูลผู้ดูแลระบบ
   - `LoginLog`: บันทึกประวัติการ Login
   - `LogAdmin`: บันทึกการกระทำของ Admin
   - `News`: รายการข่าวสารองค์กร
   - `Apps`: รายการแอปพลิเคชัน
   - `ContactRequest`: รายการติดต่อ/แจ้งปัญหา
   - `Videos`: รายการคลิปวิดีโอ YouTube ประชาสัมพันธ์ 3 ช่อง (ดึงและบันทึกผ่าน Google Sheets ได้โดยตรง)
   - `PushSubscriptions`: จัดเก็บข้อมูล Token อุปกรณ์ของพนักงานสำหรับระบบแจ้งเตือน (Web Push Notification)

> **อัปเกรดจากเวอร์ชันเก่า (สำคัญ):** ถ้าชีต `News`/`Apps` ถูกสร้างด้วยโค้ดเวอร์ชันก่อน
> ให้เลือกฟังก์ชัน `migrateDatabaseSchema` แล้วกด **เรียกใช้ (Run)** หนึ่งครั้ง
> เพื่อเพิ่มคอลัมน์ `PublishDate` (News) และ `Type` (Apps) โดยไม่ลบข้อมูลเดิม
> (โค้ดใหม่จะเพิ่มคอลัมน์ให้อัตโนมัติเมื่อมีการเพิ่ม/แก้ไขรายการครั้งแรกด้วย)

---

## ขั้นตอนที่ 3: เผยแพร่เป็น Web App (Deploy as Web App)

1. ในหน้า Google Apps Script กดปุ่มสีน้ำเงิน **ทำให้ใช้งานได้ (Deploy)** มุมบนขวา > เลือก **การจัดการทำให้ใช้งานได้ใหม่ (New deployment)**
2. คลิกที่ไอคอนเฟือง ⚙️ ด้านข้าง **เลือกประเภท (Select type)** แล้วเลือก **เว็บแอป (Web app)**
3. ตั้งค่าการเผยแพร่ดังนี้:
   - **คำอธิบาย (Description)**: `Employee Portal Production API v1.0`
   - **เรียกใช้ในฐานะ (Execute as)**: **ฉัน (Me / บัญชีอีเมลของคุณ)** *(สำคัญมาก)*
   - **ผู้มีสิทธิ์เข้าถึง (Who has access)**: **ทุกคน (Anyone)** *(สำคัญมาก เพื่อให้ GitHub Pages ยิง API เข้ามาได้โดยไม่ต้องล็อกอินบัญชี Google)*
4. กดปุ่ม **ทำให้ใช้งานได้ (Deploy)**
5. คัดลอก **URL เว็บแอป (Web app URL)** ที่ลงท้ายด้วย `/exec` (ตัวอย่าง: `https://script.google.com/macros/s/AKfycbx.../exec`)

---

## ขั้นตอนที่ 4: นำ URL ไปใส่ใน Frontend

1. เปิดไฟล์ `js/config.js` ในโฟลเดอร์ของโปรเจกต์นี้
2. นำ Web App URL ที่ได้มาวางในตัวแปร `GAS_API_URL`:
   ```javascript
   const CONFIG = {
     // วาง URL ของ Google Apps Script ที่ Deploy เรียบร้อยแล้วที่นี่
     GAS_API_URL: "https://script.google.com/macros/s/AKfycbx.../exec"
   };
   ```
3. บันทึกไฟล์ และ Deploy ขึ้น GitHub Pages ได้ทันที!

---

## โครงสร้างตาราง Google Sheets (Schema Structure)

ระบบรองรับโครงสร้างคอลัมน์แบบไดนามิก (Dynamic Column Mapping) โดยตรวจสอบจากชื่อ Header โดยอัตโนมัติ:

1. **`Users`**:
   `| EmployeeID | Name | Department | Position | Plant | PIN | Status |`
   *(Layout จริงจากไฟล์ `Web Application .xlsx` — PIN อยู่คอลัมน์ F, Status อยู่ G)*
2. **`Admin`**:
   `| EmployeeID | Name | Role | Status |`
3. **`LoginLog`**:
   `| DateTime | EmployeeID | Name | IP | Status |`
4. **`LogAdmin`**:
   `| DateTime | AdminID | Action | Detail |`
5. **`News`**:
   `| ID | Title | Detail | URL | ImageUrl | Category | Status | PublishDate |`
   *(รองรับชีตเดิมที่มี header เป็น `AppName`, `Description`, `Icon` หรือภาษาไทย `หัวข้อข่าว`, `รายละเอียด`, `รูปภาพ` ได้โดยอัตโนมัติ)*
6. **`Apps`**:
   `| ID | AppName | Description | URL | Icon | Category | Status |`
   *(คอลัมน์เสริม: `Type` — ถ้าไม่มี ระบบจะ derive `Internal`/`External` จาก URL)*
   *(ถ้ามีชีตเก่าที่ขาด `PublishDate`/`Type` ให้รัน `migrateDatabaseSchema` หนึ่งครั้ง)*
7. **`ContactRequest`**:
   `| ID | EmployeeID | Name | Topic | Detail | CreatedDate | Status |`
8. **`Videos`** (วิดีโอ YouTube ประชาสัมพันธ์ 3 ช่อง):
   `| ID | Title | URL | Description | Category | Order | Status |`
   *(ระบบจะดึง 3 ช่องไปแสดงผลแบบ Responsive ในหน้าแรก และ Admin สามารถแก้ไขผ่าน Admin Panel หรือ Google Sheets ได้โดยตรง)*

---

## ตรวจสอบปัญหา "Login ไม่ได้" หรือ "ข้อมูลไม่ขึ้น" (Troubleshooting)

1. เปิด `https://script.google.com/macros/s/<DEPLOY_ID>/exec?action=ping`
   ต้องได้ `{"success":true,...}` — ถ้าได้ HTML/หน้า Login แสดงว่า Deploy ยังเป็น **Anyone with Google account** หรือ URL ผิด
2. เปิด `...?action=getSchemaInfo` เพื่อดูชื่อ Header จริงของทุกชีต (ไม่ส่งข้อมูลพนักงานออกมา)
3. ชีต `Users` **ต้องมี Header ชื่อ `PIN`** (หรือ `Password`) และ `Status` — ถ้าใช้ชื่ออื่น
   ระบบจะปฏิเสธการ Login พร้อมข้อความบอกสาเหตุ ไม่เดาคอลัมน์ผิดอีก
4. ชีต `News` ควรมี `PublishDate` (เพื่อแสดง/เรียงวันที่) และ `Apps` ควรมี `Type`
   (ถ้าไม่มี ระบบจะ derive จาก URL) — ชีตจากเวอร์ชันเก่าสามารถรัน `migrateDatabaseSchema` หนึ่งครั้ง
   ถ้าชีตใดหายไป ให้รัน `ensureAllSheets` (สร้างเฉพาะ Header ไม่ใส่ข้อมูลตัวอย่าง)
5. แก้โค้ดใน VS Code แล้ว **ต้องวางโค้ดใหม่ใน Apps Script และ Deploy เวอร์ชันใหม่**
   (Manage deployments → แก้ไข → Version: New version) มิฉะนั้น URL เดิมจะยังรันโค้ดเก่า

---

## บัญชีเริ่มต้น และความปลอดภัยของ PIN

`setupInitialDatabase` สร้างบัญชี **ตัวอย่าง** เท่านั้น (ห้ามนำข้อมูลพนักงานจริง/PIN จริงมาใส่ใน repo หรือ README)

| Role | Employee ID | PIN เริ่มต้น | หมายเหตุ |
| :--- | :--- | :--- | :--- |
| Admin | `10001` | `1234` | เปลี่ยน PIN และแก้เป็นรายชื่อจริงใน Sheet ทันทีหลังติดตั้ง |
| Employee | `10002` | `1234` | บัญชีตัวอย่าง ลบทิ้งได้ |

- **ก่อนเปิดใช้งานจริง:** เลือกฟังก์ชัน `initSecurity` ใน Apps Script Editor แล้วกด Run หนึ่งครั้ง (สร้างกุญแจ `SESSION_SECRET` และ `PIN_PEPPER`)
- **PIN ถูกเก็บเป็น hash** (SHA-256 + pepper ที่เก็บใน Script Properties ชื่อ `PIN_PEPPER`)
  ห้ามลบหรือเปลี่ยนค่า `PIN_PEPPER` หลังเริ่มใช้งาน มิฉะนั้นทุกคนจะ Login ไม่ได้
- **อัปเกรดจากเวอร์ชันที่เก็บ PIN แบบเดิม:** PIN เดิมยังใช้ได้และจะถูกแปลงเป็น hash อัตโนมัติเมื่อผู้ใช้ Login สำเร็จ
  หรือจะรันฟังก์ชัน `migratePinsToHash` ใน Apps Script Editor หนึ่งครั้งเพื่อแปลงทั้งชีตทันที
- ถ้าพนักงานใส่ PIN ผิดครบ 5 ครั้งจะถูกล็อก 15 นาที Admin กดปุ่ม 🔓 ในหน้า "จัดการผู้ใช้" เพื่อปลดล็อกได้ทันที
  (การเปลี่ยน PIN โดย Admin จะปลดล็อกให้อัตโนมัติ)
- หน้า "แจ้งปัญหา" ต้อง Login ก่อนจึงจะส่งได้ และจำกัด 5 ครั้งต่อ 10 นาทีต่อพนักงาน