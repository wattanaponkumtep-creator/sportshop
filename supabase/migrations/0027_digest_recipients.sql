-- =========================================================================
-- ผู้รับสรุปประจำวันทาง LINE (หลายไอดี)
-- ส่ง daily digest ให้ LINE user IDs เหล่านี้ (ไม่ต้องเป็น admin user)
-- =========================================================================

create table if not exists public.digest_recipients (
  id uuid primary key default gen_random_uuid(),
  name text,                       -- ชื่อเรียก เช่น "พี่แดง", "ฝ่ายผลิต"
  line_user_id text not null,      -- LINE user ID (U...)
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists digest_recipients_active_idx
  on public.digest_recipients(is_active) where is_active = true;

alter table public.digest_recipients enable row level security;
drop policy if exists digest_recipients_all on public.digest_recipients;
create policy digest_recipients_all on public.digest_recipients
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
