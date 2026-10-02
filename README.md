# Shorturl

สร้างลิงก์สั้นจาก URL ยาว พร้อมกำหนดชื่อท้ายลิงก์เอง สร้าง QR Code และดูประวัติพร้อมสถิติการคลิกได้ในเว็บเดียว

## คำอธิบาย

Shorturl เป็นเว็บแอปพลิเคชันสำหรับย่อลิงก์ พัฒนาด้วย Node.js, Express และ PostgreSQL

### ฟีเจอร์เด่น

- สร้างลิงก์สั้นด้วยรหัสสุ่ม หรือกำหนด alias เอง เช่น `promo2026`
- ตรวจสอบ URL และรูปแบบ alias ก่อนบันทึก
- แจ้งเมื่อ alias ถูกใช้งานแล้ว
- เปลี่ยนเส้นทางจากลิงก์สั้นไปยัง URL ต้นฉบับ และบันทึกการคลิก
- สร้างและดาวน์โหลด QR Code สำหรับลิงก์สั้น
- แสดงประวัติลิงก์ จำนวนคลิก และเวลาที่มีการคลิกล่าสุด พร้อมแบ่งหน้า

ระบบนี้ช่วยให้แชร์ลิงก์ได้สะดวกขึ้น และติดตามการใช้งานลิงก์ได้จากประวัติและจำนวนคลิก

## เทคโนโลยีที่ใช้

- Node.js 22 ขึ้นไป
- Express 5
- PostgreSQL
- HTML, CSS และ JavaScript

## วิธีติดตั้ง

### สิ่งที่ต้องเตรียม

- ติดตั้ง [Node.js](https://nodejs.org/) เวอร์ชัน 22 ขึ้นไป
- เตรียมฐานข้อมูล PostgreSQL ที่เข้าถึงได้จากเครื่อง เช่น PostgreSQL ในเครื่องหรือบริการ PostgreSQL บนคลาวด์

### ขั้นตอน

1. ดาวน์โหลดหรือ clone โปรเจกต์ แล้วเปิด terminal ในโฟลเดอร์โปรเจกต์

   ```bash
   git clone https://github.com/PywrksBook/short-url.git
   cd short-url
   ```

2. ติดตั้ง dependencies

   ```bash
   npm install
   ```

3. สร้างไฟล์ `.env` ในโฟลเดอร์หลักของโปรเจกต์ โดยกำหนดค่าตามนี้

   ```env
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
   BASE_URL=http://localhost:3000
   PORT=3000
   ```

   แทน `USER`, `PASSWORD`, `HOST` และ `DATABASE` ด้วยค่าจากฐานข้อมูลของคุณ หาก PostgreSQL ในเครื่องไม่ใช้ SSL ให้เอา `?sslmode=require` ออกได้

   อย่าเผยแพร่ไฟล์ `.env` หรือ commit ข้อมูลเชื่อมต่อฐานข้อมูลขึ้น Git

4. สร้างตารางในฐานข้อมูล

   ```bash
   npm run db:init
   ```

   คำสั่งนี้ใช้โครงสร้างตารางจาก `sql/schema.sql` ได้แก่ `urls` สำหรับเก็บลิงก์ และ `clicks` สำหรับเก็บข้อมูลการคลิก

5. เริ่มเซิร์ฟเวอร์สำหรับพัฒนา

   ```bash
   npm run dev
   ```

6. เปิดเว็บที่ [http://localhost:3000](http://localhost:3000)

   ตรวจสอบการเชื่อมต่อกับฐานข้อมูลได้ที่ [http://localhost:3000/health](http://localhost:3000/health) ซึ่งควรตอบกลับสถานะ `ok` และ `connected`

## วิธีใช้งาน

### ใช้งานผ่านหน้าเว็บ

1. เปิดหน้าเว็บ แล้วกรอก URL ต้นฉบับ เช่น `https://example.com/products/summer-sale`
2. หากต้องการชื่อท้ายลิงก์เอง ให้กรอก alias เช่น `summer-sale` โดยใช้ตัวอักษรภาษาอังกฤษ ตัวเลข `-` หรือ `_` ความยาว 3–30 ตัว
3. กด **ย่อลิงก์** หากเว้นช่อง alias ระบบจะสุ่มรหัสให้
4. ใช้ลิงก์สั้นที่แสดงขึ้นมา คัดลอกลิงก์ หรือดาวน์โหลด QR Code
5. ดูประวัติ จำนวนคลิก และเวลาที่คลิกล่าสุดในส่วน **ประวัติลิงก์** ใช้ปุ่มเปลี่ยนหน้าเมื่อมีหลายรายการ

### ใช้งานผ่าน API

สร้างลิงก์สั้นโดยกำหนด alias:

```bash
curl -X POST http://localhost:3000/api/urls \
  -H "Content-Type: application/json" \
  -d "{\"originalUrl\":\"https://example.com/products/summer-sale\",\"customAlias\":\"summer-sale\"}"
```

ตัวอย่างผลลัพธ์:

```json
{
  "shortCode": "summer-sale",
  "shortUrl": "http://localhost:3000/summer-sale",
  "originalUrl": "https://example.com/products/summer-sale",
  "createdAt": "2026-10-02T04:00:00.000Z"
}
```

ไม่ต้องการกำหนด alias ก็ส่งเฉพาะ `originalUrl` ได้:

```bash
curl -X POST http://localhost:3000/api/urls \
  -H "Content-Type: application/json" \
  -d "{\"originalUrl\":\"https://example.com/\"}"
```

เรียกดูประวัติ (หน้าละ 10 รายการ):

```bash
curl "http://localhost:3000/api/urls?page=1"
```

เปิดลิงก์สั้นเพื่อเปลี่ยนทางไป URL ต้นฉบับ:

```text
http://localhost:3000/summer-sale
```

รับ QR Code เป็นไฟล์ PNG:

```text
http://localhost:3000/api/urls/summer-sale/qr
```

## คำสั่งที่ใช้บ่อย

| คำสั่ง | รายละเอียด |
| --- | --- |
| `npm run dev` | เริ่มเซิร์ฟเวอร์โหมดพัฒนาและรีสตาร์ตเมื่อไฟล์เปลี่ยน |
| `npm start` | เริ่มเซิร์ฟเวอร์ |
| `npm run db:init` | สร้างตารางใน PostgreSQL |
| `npm test` | รันทดสอบทั้งหมด |

## โครงสร้างโปรเจกต์

```text
public/                  หน้าเว็บ, CSS และ JavaScript
scripts/init-db.js       สคริปต์สร้างตารางฐานข้อมูล
sql/schema.sql           โครงสร้างตาราง urls และ clicks
src/modules/url/         API สร้างลิงก์, ประวัติ และ QR Code
src/modules/redirect/    เปลี่ยนทางและบันทึกการคลิก
src/modules/analytics/   สรุปประวัติและสถิติการคลิก
src/server.js            จุดเริ่มต้นของ Express server
```

## ข้อจำกัดของ alias

- ความยาว 3–30 ตัว
- ใช้ได้เฉพาะ `A-Z`, `a-z`, `0-9`, `-` และ `_`
- ชื่อที่ระบบสงวน เช่น `api`, `health`, `static` และ `admin` ใช้ไม่ได้
- หากชื่อถูกใช้แล้ว ระบบจะแจ้งข้อผิดพลาดให้เลือกชื่ออื่น
