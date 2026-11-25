-- =========================================================================
-- 0035: ฟอร์มให้ลูกค้ากรอกรายชื่อ-เบอร์-ไซซ์เอง (Customer Roster Entry)
-- ลิงก์เฉพาะงาน → ลูกค้ากรอกเอง → เข้าระบบตรง (กันร้านพิมพ์ผิด)
-- =========================================================================

alter table public.jobs add column if not exists roster_token text;
alter table public.jobs add column if not exists roster_submitted_at timestamptz;

update public.jobs
  set roster_token = encode(gen_random_bytes(16), 'hex')
  where roster_token is null;

alter table public.jobs alter column roster_token set default encode(gen_random_bytes(16), 'hex');

create unique index if not exists jobs_roster_token_idx on public.jobs(roster_token);
