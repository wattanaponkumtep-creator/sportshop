-- =========================================================================
-- 0036: ระบบเคลม / รับประกัน (Claims)
-- บันทึกเคลม → ระบุความผิด (เรา/ลูกค้า/โรงงาน) → แก้/ชดเชย → ปิดเคลม
-- =========================================================================

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  reason text not null,
  fault text not null default 'shop',   -- shop | customer | factory
  status text not null default 'open',  -- open | resolved
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_by uuid references public.users(id)
);

create index if not exists claims_job_idx on public.claims(job_id);

alter table public.claims enable row level security;
drop policy if exists claims_all on public.claims;
create policy claims_all on public.claims
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
