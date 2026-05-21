# Supabase Setup

## 1. สร้างโปรเจกต์
1. ไปที่ https://supabase.com/dashboard
2. สร้างโปรเจกต์ใหม่ (เลือก region สิงคโปร์เพื่อความเร็ว)
3. คัดลอกค่าจาก Settings → API:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (เก็บเป็นความลับ!)
4. วางลง `.env.local` ของโปรเจกต์

## 2. รัน Migrations

เปิด SQL Editor ใน Supabase Dashboard แล้วรันตามลำดับ:
1. `migrations/0001_init.sql` — schema + triggers + functions
2. `migrations/0002_rls.sql` — RLS policies + storage bucket
3. `seed.sql` — ใส่โรงงานตัวอย่าง (ต้อง login เป็น staff ก่อน หรือรันใน SQL Editor ที่ใช้ service role)

หรือถ้าใช้ Supabase CLI:
```bash
supabase db push
```

## 3. เปิด Google OAuth
1. Authentication → Providers → Google → Enable
2. ตั้ง Client ID/Secret จาก Google Cloud Console
3. Authorized redirect URI: `https://<project>.supabase.co/auth/v1/callback`
4. ใน Authentication → URL Configuration:
   - Site URL: `http://localhost:3000` (dev) หรือโดเมนจริง
   - Redirect URLs: เพิ่ม `http://localhost:3000/auth/callback`

## 4. สร้าง admin คนแรก
- Login ครั้งแรกผ่าน Google → trigger `on_auth_user_created` จะสร้าง row ใน `public.users` ให้อัตโนมัติ
- คนแรกที่ login จะได้ role = `admin` (ดู `handle_new_auth_user()` ใน 0001)
- คนต่อไปได้ role = `staff` (admin สามารถเปลี่ยนได้ใน DB)
