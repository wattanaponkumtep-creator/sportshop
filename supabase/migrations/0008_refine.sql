-- =========================================================================
-- Phase 14: Refinement — line items, customer team info
-- =========================================================================

-- Customer: add team name + default job label
alter table public.customers
  add column if not exists team_name text,
  add column if not exists default_job_label text;

-- JOB Line Items — detailed pricing breakdown per JOB
-- (Multiple products per JOB: shirts, pants, accessories, each with own product_type/collar/price/cost)
create table if not exists public.job_line_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  product_type text,        -- e.g. "เสื้อบอล", "เสื้อโปโล", "กางเกง"
  collar_type text,         -- e.g. "คอกลม", "คอปก", "V-neck"
  description text,         -- รายละเอียดเพิ่ม เช่น "พิมพ์ซับลิเมชั่น สีพื้น"
  quantity int not null default 1 check (quantity >= 0),
  unit_sale_price numeric(10,2) not null default 0 check (unit_sale_price >= 0),
  unit_cost numeric(10,2) not null default 0 check (unit_cost >= 0),
  factory_id uuid references public.factories(id) on delete set null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists job_line_items_job_idx on public.job_line_items(job_id);

alter table public.job_line_items enable row level security;
create policy job_line_items_all on public.job_line_items
  for all using (public.is_staff()) with check (public.is_staff());

-- JOB: add job_label (overrides display label if set, e.g. "เสื้อบอลทีมทรู A 25 ตัว")
alter table public.jobs
  add column if not exists job_label text;
