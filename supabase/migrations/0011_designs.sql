-- =========================================================================
-- คลังดีไซน์ (Design Library)
-- เก็บแบบเสื้อทุกแบบที่เคยทำ → ใช้เป็นพอร์ตโชว์ลูกค้า + นำกลับมาใช้ใหม่ได้
-- =========================================================================

create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  code text unique,                 -- DES-25-001 (auto)
  name text not null,               -- "เสื้อทีมทรู A สีน้ำเงิน"
  description text,
  sport_type text,                  -- football, basketball, volleyball, ...
  colors text[] not null default '{}',
  tags text[] not null default '{}',
  thumbnail_path text,              -- main image path in storage
  image_paths text[] not null default '{}',  -- all images
  suggested_price numeric(10,2),
  suggested_cost numeric(10,2),
  is_favorite boolean not null default false,
  use_count int not null default 0, -- จำนวน JOB ที่ใช้ดีไซน์นี้
  note text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists designs_created_idx on public.designs(created_at desc);
create index if not exists designs_sport_idx on public.designs(sport_type);
create index if not exists designs_favorite_idx on public.designs(is_favorite) where is_favorite = true;
create index if not exists designs_name_trgm_idx on public.designs using gin (name gin_trgm_ops);

-- Auto-generate design code: DES-YY-NNN
create or replace function public.generate_design_code() returns text as $$
declare
  year_part text;
  seq_num int;
  new_code text;
begin
  year_part := to_char(now(), 'YY');
  select coalesce(max(cast(substring(code from 'DES-' || year_part || '-(\d+)') as int)), 0) + 1
    into seq_num
    from public.designs
    where code like 'DES-' || year_part || '-%';
  new_code := 'DES-' || year_part || '-' || lpad(seq_num::text, 3, '0');
  return new_code;
end;
$$ language plpgsql;

create or replace function public.set_design_code() returns trigger as $$
begin
  if new.code is null or new.code = '' then
    new.code := public.generate_design_code();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_design_code on public.designs;
create trigger trg_design_code
  before insert on public.designs
  for each row execute function public.set_design_code();

-- Reuse the shared updated_at trigger (defined in 0001_init.sql)
drop trigger if exists designs_updated_at on public.designs;
create trigger designs_updated_at
  before update on public.designs
  for each row execute function public.set_updated_at();

-- Link from jobs to designs
alter table public.jobs
  add column if not exists design_id uuid references public.designs(id) on delete set null;
create index if not exists jobs_design_idx on public.jobs(design_id);

-- Auto-increment use_count when a JOB uses this design
create or replace function public.bump_design_use_count() returns trigger as $$
begin
  if new.design_id is not null and (old.design_id is null or old.design_id <> new.design_id) then
    update public.designs set use_count = use_count + 1 where id = new.design_id;
  end if;
  if tg_op = 'UPDATE' and old.design_id is not null and (new.design_id is null or new.design_id <> old.design_id) then
    update public.designs set use_count = greatest(use_count - 1, 0) where id = old.design_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_jobs_design_count on public.jobs;
create trigger trg_jobs_design_count
  after insert or update of design_id on public.jobs
  for each row execute function public.bump_design_use_count();

-- RLS
alter table public.designs enable row level security;
drop policy if exists designs_all on public.designs;
create policy designs_all on public.designs
  for all using (public.is_staff()) with check (public.is_staff());
