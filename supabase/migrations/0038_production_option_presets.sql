-- =========================================================================
-- 0038: คลังออปชั่นการผลิตที่ "เพิ่มเอง" — บันทึกไว้ใช้ซ้ำได้ทุกงาน
-- เมื่อแอดมินพิมพ์ออปชั่นใหม่ในช่อง "เพิ่มเอง" → เก็บเป็นตัวเลือกถาวร
-- =========================================================================

create table if not exists public.production_option_presets (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  created_at timestamptz not null default now()
);

alter table public.production_option_presets enable row level security;

drop policy if exists "staff all option presets" on public.production_option_presets;
create policy "staff all option presets"
  on public.production_option_presets
  for all
  using (public.is_staff())
  with check (public.is_staff());
