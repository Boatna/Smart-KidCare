# 🖥️ IT Support Helpdesk

ระบบแจ้งซ่อมและติดตามสถานะ IT สำหรับองค์กร พัฒนาด้วย **Google Apps Script** + **Bootstrap 5**

---

## 📁 โครงสร้างโปรเจกต์

```
it-helpdesk/
├── src/
│   ├── Code.gs            ← Backend logic (Apps Script)
│   ├── Index.html         ← หน้าแจ้งปัญหา (พนักงาน)
│   ├── Dashboard.html     ← IT Control Center Dashboard
│   └── appsscript.json   ← Apps Script manifest
├── .clasp.json            ← clasp CLI config (ใส่ Script ID ที่นี่)
├── .gitignore
└── README.md
```

---

## 🗂️ Google Sheets Structure

โปรเจกต์นี้ต้องการ Google Spreadsheet ที่มี 2 Sheets:

### Sheet: `Employee_Data`
| Col | A | B | C | D | E | ... | I (index 8) |
|-----|---|---|---|---|---|-----|-------------|
| | รหัสพนักงาน | ชื่อ-นามสกุล | แผนก | ตำแหน่ง | Plant | ... | Asset Tag |

### Sheet: `IT_Requests`
ระบบจะสร้างแถวอัตโนมัติเมื่อมีการแจ้งปัญหา คอลัมน์ตามลำดับ:

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T | U |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Ticket ID | วันที่ | รหัสพนักงาน | ชื่อ | แผนก | ตำแหน่ง | Plant | เบอร์ | Asset Tag | ความด่วน | หมวดหมู่ | รายละเอียด | เหตุผลขอเครื่องใหม่ | โปรแกรมที่ต้องการ | ลิงก์รูปภาพ | สถานะ | ผู้รับผิดชอบ | หมายเหตุ IT | แจ้งซ่อมนอก | เหตุผลซ่อมนอก | อีเมลผู้แจ้ง |

---

## 🚀 วิธี Deploy ขึ้น Google Apps Script

### วิธีที่ 1: Copy-Paste (ง่ายที่สุด)
1. เปิด [script.google.com](https://script.google.com) → สร้างโปรเจกต์ใหม่
2. Copy เนื้อหาจาก `src/Code.gs` วางใน Code editor
3. สร้างไฟล์ HTML ใหม่ชื่อ `Index` และ `Dashboard` → Copy เนื้อหาไปวาง
4. Deploy → New deployment → Web App

### วิธีที่ 2: ใช้ clasp CLI (แนะนำสำหรับ GitHub)

#### ติดตั้ง clasp
```bash
npm install -g @google/clasp
```

#### Login Google Account
```bash
clasp login
```

#### สร้างโปรเจกต์ใหม่ หรือ Link โปรเจกต์เดิม
```bash
# สร้างใหม่
clasp create --title "IT Helpdesk" --type webapp --rootDir ./src

# หรือ Link โปรเจกต์เดิม (ใส่ Script ID ใน .clasp.json ก่อน)
clasp clone YOUR_SCRIPT_ID
```

#### Push code ขึ้น Apps Script
```bash
clasp push
```

#### Deploy เป็น Web App
```bash
clasp deploy --description "v1.0"
```

---

## ⚙️ การตั้งค่า

แก้ไขค่าใน `src/Code.gs` บรรทัดต้นไฟล์:

```javascript
// รายชื่อช่าง IT (เพิ่ม/ลดได้)
var IT_STAFF_LIST = [
  { name: "ชื่อช่าง IT", email: "email@company.com" },
];

// PIN สำหรับเข้า Dashboard
var IT_PIN = "9999";

// คอลัมน์ Asset Tag ใน Sheet Employee_Data (นับจาก 0)
var EMP_ASSET_COL = 8;
```

---

## 🔗 URL การใช้งาน

หลัง Deploy จะได้ URL ประมาณนี้:
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

| หน้า | URL |
|------|-----|
| หน้าแจ้งปัญหา (พนักงาน) | `...exec` |
| IT Dashboard | `...exec?view=it` |

---

## 📦 Tech Stack

| ส่วน | เทคโนโลยี |
|------|-----------|
| Backend | Google Apps Script (V8) |
| Database | Google Sheets |
| File Storage | Google Drive |
| Email | Gmail (MailApp) |
| Frontend | Bootstrap 5, Bootstrap Icons |
| Charts | Chart.js |
| Table | DataTables |
| Alert | SweetAlert2 |
| Deploy Tool | clasp CLI |

---

## 🔒 Security Notes

- ⚠️ **อย่า commit** `.clasprc.json` (credentials) ไปที่ GitHub
- PIN Dashboard เป็นแค่ client-side protection — สำหรับ production ควรใช้ Google Sign-In แทน
- ตรวจสอบ Web App access settings ให้เหมาะกับองค์กร

---

## 📝 Changelog

- **v1.0** — Initial release: แจ้งปัญหา, ติดตามสถานะ, IT Dashboard, Email notification