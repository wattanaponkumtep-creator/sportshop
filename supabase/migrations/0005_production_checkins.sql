-- =========================================================================
-- Phase 11: Production stage tracking + Factory check-in log
-- =========================================================================

-- Production progress per JOB (0-100% for 4 stages)
alter table public.jobs
  add column layout_progress int not null default 0 check (layout_progress between 0 and 100),
  add column print_progress int not null default 0 check (print_progress between 0 and 100),
  add column sew_progress int not null default 0 check (sew_progress between 0 and 100),
  add column ship_progress int not null default 0 check (ship_progress between 0 and 100);

-- Factory check-in log
create table public.factory_checkins (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  factory_id uuid references public.factories(id) on delete set null,
  status text not null,
  note text,
  checked_in_by uuid references public.users(id),
  created_at timestamptz not null default now()
);
create index factory_checkins_job_idx on public.factory_checkins(job_id, created_at desc);
create index factory_checkins_factory_idx on public.factory_checkins(factory_id, created_at desc);

alter table public.factory_checkins enable row level security;
create policy factory_checkins_all on public.factory_checkins
  for all using (public.is_staff()) with check (public.is_staff());

-- Shop info table (for invoice header)
create table public.shop_info (
  id int primary key default 1,
  shop_name text not null default 'SportShop',
  address text,
  phone text,
  email text,
  tax_id text,
  bank_info text,
  logo_url text,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.shop_info (id) values (1) on conflict (id) do nothing;

alter table public.shop_info enable row level security;
create policy shop_info_select on public.shop_info for select using (public.is_staff());
create policy shop_info_update on public.shop_info for update using (public.is_staff()) with check (public.is_staff());
