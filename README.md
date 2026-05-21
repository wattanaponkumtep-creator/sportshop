# SportShop — ระบบจัดการร้านเสื้อกีฬาพิมพ์ลาย

ระบบ Web Application สำหรับร้านรับผลิตเสื้อกีฬาที่ใช้โรงงาน Outsource — รวมลูกค้าหลายช่องทาง, จัดการ JOB, ติดตามโรงงาน, เก็บไฟล์งาน, และ Dashboard แบบ Kanban

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript + TailwindCSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Auth:** Google OAuth (เฉพาะแอดมิน/พนักงาน)
- **Deploy:** Vercel + Supabase Cloud

## Setup

### 1. ติดตั้ง dependencies
```bash
npm install
```

### 2. ตั้ง Supabase
ดู [supabase/README.md](./supabase/README.md) สำหรับขั้นตอนละเอียด

สรุป:
1. สร้างโปรเจกต์ที่ https://supabase.com/dashboard
2. รัน SQL: `supabase/migrations/0001_init.sql` แล้วตามด้วย `0002_rls.sql` แล้ว `seed.sql`
3. เปิด Google OAuth provider
4. คัดลอก URL และ keys ใส่ `.env.local`

### 3. ตั้ง env vars
คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่า:
```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. รัน dev server
```bash
npm run dev
```
เปิด http://localhost:3000

ครั้งแรกที่ login ผ่าน Google จะถูกตั้งเป็น `admin` อัตโนมัติ (จาก trigger `handle_new_auth_user`)

## โครงสร้างโปรเจกต์

```
app/
  (auth)/login/        — หน้า login (Google OAuth)
  (admin)/             — เฉพาะ user ที่ login
    dashboard/         — Kanban + KPI
    customers/         — CRM ลูกค้า
    jobs/              — จัดการ JOB (ใหม่, รายการ, รายละเอียด)
    factories/         — จัดการโรงงาน
  track/[token]/       — public — ลูกค้าดูสถานะผ่านลิงก์
  auth/                — OAuth callback, signout
components/
  ui/                  — shadcn primitives
  admin/               — sidebar, mobile nav
  auth/                — login form
  customers/, jobs/, factories/  — โมดูล
lib/
  supabase/            — client / server / middleware (SSR pattern)
  types/               — TypeScript types ตรงกับ DB
  constants.ts         — Thai labels
  utils.ts             — formatBaht, formatDateTH, ฯลฯ
supabase/
  migrations/          — SQL (schema + RLS)
  seed.sql             — โรงงานตัวอย่าง
proxy.ts               — Next 16 proxy (เดิมชื่อ middleware) สำหรับ Supabase session refresh + auth guard
```

## ฟีเจอร์ MVP ที่มี

- [x] ระบบ CRM ลูกค้า (รวมหลายช่องทางต่อ 1 ลูกค้า)
- [x] เปิด JOB + auto-gen `job_code` (เช่น SP260001)
- [x] รายละเอียด JOB เต็ม: ตารางไซส์/ชื่อ/เบอร์, ไฟล์, timeline, โรงงาน, ส่งของ
- [x] อัปโหลดไฟล์เข้า Supabase Storage (artwork/mockup/slip)
- [x] ระบบโรงงาน + ติดตามสถานะ
- [x] Kanban Dashboard + Realtime (drag-drop, sync ทุก tab)
- [x] หน้าติดตามสาธารณะ `/track/<token>` (ลูกค้าเปิดได้โดยไม่ต้อง login)
- [x] Theme ดำ-สปอร์ต + Mobile-first

## Phase ถัดไป (ยังไม่ทำใน MVP นี้)

- LINE OA + Facebook Messenger webhook integration
- ระบบการเงินเต็ม (มัดจำ/ชำระเต็ม + สรุปกำไรรายเดือน)
- Mockup approval flow ผ่านลิงก์
- AI ราคา / AI ตรวจไฟล์ / AI จัดไซส์

## คำสั่งที่มี

```bash
npm run dev          # dev server
npm run build        # production build
npm run start        # production server
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
```
