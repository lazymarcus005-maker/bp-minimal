# BP Reader (minimal)

อัปโหลดรูปค่าความดัน -> ให้ OpenRouter อ่าน -> ผู้ใช้ตรวจทาน -> บันทึกเฉพาะข้อมูลตัวเลขลง Supabase -> ดู dashboard

## จุดเด่น
- ไม่เก็บรูป
- ไม่มี login
- config ทั้งหมดอยู่ใน `.env`
- รันด้วย `docker compose`

## 1) เตรียม Supabase

สร้าง table ด้วยไฟล์ `supabase/schema.sql`

## 2) ตั้งค่า env

```bash
cp .env.example .env
```

จากนั้นใส่ค่า:
- `OPENROUTER_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_PASSCODE` (ใส่หรือปล่อยว่างก็ได้)
- `LINE_CHANNEL_ACCESS_TOKEN` (สำหรับดึงรูปจาก LINE Messaging API)
- `LINE_CHANNEL_SECRET` (สำหรับตรวจสอบลายเซ็น webhook)

## 3) รัน

```bash
docker compose up --build
```

เปิด `http://localhost:3000`

## LINE Webhook API

- Endpoint: `POST /api/line/webhook`
- ใช้รับ event จาก LINE Messaging API เฉพาะข้อความรูปภาพ
- ระบบจะ:
  1. ตรวจสอบ `x-line-signature`
  2. ดึงรูปจาก LINE Content API
  3. อ่านค่าความดันจากรูปด้วย OpenRouter
  4. บันทึกค่าที่อ่านได้ลงตาราง readings

## หมายเหตุ
- ถ้าตั้ง `APP_PASSCODE` ไว้ จะต้องส่ง `x-app-passcode` header ไปกับทุก API call ซึ่งหน้าเว็บนี้จัดการให้เอง
- ถ้าปล่อยว่าง ระบบจะเปิดใช้งานแบบไม่มี passcode
- ระบบไม่เก็บรูปและไม่ส่งรูปไปเก็บใน Supabase Storage
