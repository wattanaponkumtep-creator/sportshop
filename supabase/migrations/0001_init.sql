-- =========================================================================
-- SportShop — MVP schema (single tenant)
-- =========================================================================

create extension if not exists "pgcrypto";
create extension if not exists pg_trgm;

-- =========================================================================
-- Enums
-- =========================================================================
create type user_role as enum ('admin', 'staff');
create type channel_type as enum ('phone', 'line', 'line_oa', 'fb', 'fb_page', 'other');
create type job_status as enum (
  'received',        -- รับงาน
  'designing',       -- ออกแบบ
  'awaiting_approval', -- รออนุมัติ
  'sent_to_factory', -- ส่งโรงงาน
  'producing',       -- ผลิต
  'qc',              -- QC
  'ready_to_ship',   -- พร้อมส่ง
  'shipped',         -- ส่งแล้ว
  'completed',       -- ปิดงาน
  'cancelled'        -- ยกเลิก
);
create type priority_level as enum ('normal', 'urgent', 'rush');
create type factory_job_status as enum ('sent', 'producing', 'sewing', 'qc', 'returned');
create type file_kind as enum ('artwork', 'mockup', 'slip', 'reference', 'other');
create type payment_type as enum ('deposit', 'full', 'refund');
create type shipment_status as enum ('preparing', 'shipped', 'in_transit', 'delivered', 'returned');

-- =========================================================================
-- Tables
-- =========================================================================

-- staff users (linked to auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  avatar_url text,
  role user_role not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- customers
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  primary_channel channel_type not null default 'phone',
  note text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_name_idx on public.customers using gin (name gin_trgm_ops);

-- customer contact channels (1 customer ↔ many channels)
create table public.customer_channels (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  channel_type channel_type not null,
  external_id text,
  display_name text,
  note text,
  created_at timestamptz not null default now(),
  unique (channel_type, external_id)
);
create index customer_channels_customer_idx on public.customer_channels(customer_id);

-- factories
create table public.factories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  strengths text,
  lead_time_days int,
  quality_score numeric(3,1) check (quality_score between 0 and 10),
  base_price numeric(10,2),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- job_code generator: SP + (BE_year % 100) + 4-digit sequence
create sequence if not exists public.job_seq;

create or replace function public.generate_job_code() returns text
language plpgsql as $$
declare
  yy text;
  seq_val int;
begin
  yy := lpad(((extract(year from now())::int + 543) % 100)::text, 2, '0');
  seq_val := nextval('public.job_seq');
  return 'SP' || yy || lpad(seq_val::text, 4, '0');
end $$;

-- jobs
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  job_code text not null unique default public.generate_job_code(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  factory_id uuid references public.factories(id) on delete set null,
  product_type text,
  quantity int not null default 0,
  sale_price numeric(10,2) not null default 0,
  cost numeric(10,2) not null default 0,
  shipping_cost numeric(10,2) not null default 0,
  other_cost numeric(10,2) not null default 0,
  status job_status not null default 'received',
  priority priority_level not null default 'normal',
  received_at timestamptz not null default now(),
  due_date date,
  track_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  note text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_status_idx on public.jobs(status);
create index jobs_customer_idx on public.jobs(customer_id);
create index jobs_factory_idx on public.jobs(factory_id);
create index jobs_due_date_idx on public.jobs(due_date);

-- job items (sizes / names / numbers)
create table public.job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  name text,
  number text,
  size text,
  sponsor text,
  note text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index job_items_job_idx on public.job_items(job_id);

-- job files (artwork / mockup / slip / etc.)
create table public.job_files (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  kind file_kind not null default 'other',
  storage_path text not null,
  file_name text not null,
  file_size bigint,
  mime_type text,
  version int not null default 1,
  uploaded_by uuid references public.users(id),
  created_at timestamptz not null default now()
);
create index job_files_job_idx on public.job_files(job_id);

-- job timeline (append-only event log)
create table public.job_timeline (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  event_type text not null,
  description text,
  metadata jsonb,
  actor_id uuid references public.users(id),
  created_at timestamptz not null default now()
);
create index job_timeline_job_idx on public.job_timeline(job_id, created_at desc);

-- factory work tracking
create table public.factory_jobs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  factory_id uuid not null references public.factories(id) on delete restrict,
  status factory_job_status not null default 'sent',
  sent_at timestamptz,
  returned_at timestamptz,
  cost numeric(10,2),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index factory_jobs_job_idx on public.factory_jobs(job_id);

-- payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  type payment_type not null,
  amount numeric(10,2) not null,
  slip_path text,
  paid_at timestamptz not null default now(),
  note text,
  recorded_by uuid references public.users(id),
  created_at timestamptz not null default now()
);
create index payments_job_idx on public.payments(job_id);

-- shipments
create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  carrier text,
  tracking_no text,
  status shipment_status not null default 'preparing',
  shipped_at timestamptz,
  delivered_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);
create index shipments_job_idx on public.shipments(job_id);

-- notifications log
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  channel channel_type,
  template text not null,
  payload jsonb,
  status text not null default 'pending',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- Triggers
-- =========================================================================
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();
create trigger factory_jobs_updated_at before update on public.factory_jobs
  for each row execute function public.set_updated_at();

-- auto-create timeline entry when job status changes
create or replace function public.log_job_status_change() returns trigger
language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.job_timeline(job_id, event_type, description, actor_id)
    values (new.id, 'job_created', 'รับงานใหม่ ' || new.job_code, new.created_by);
  elsif (new.status is distinct from old.status) then
    insert into public.job_timeline(job_id, event_type, description, metadata)
    values (new.id, 'status_changed',
      'เปลี่ยนสถานะจาก ' || old.status::text || ' → ' || new.status::text,
      jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end $$;

create trigger jobs_timeline_insert after insert on public.jobs
  for each row execute function public.log_job_status_change();
create trigger jobs_timeline_status after update of status on public.jobs
  for each row execute function public.log_job_status_change();

-- =========================================================================
-- Auto-provision public.users row when auth user signs up
-- =========================================================================
create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    case when (select count(*) from public.users) = 0 then 'admin'::user_role else 'staff'::user_role end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- =========================================================================
-- Public tracking RPC (bypass RLS for non-authenticated tracking page)
-- =========================================================================
create or replace function public.get_public_tracking(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'job_code', j.job_code,
    'status', j.status,
    'product_type', j.product_type,
    'quantity', j.quantity,
    'received_at', j.received_at,
    'due_date', j.due_date,
    'customer_name', c.name,
    'timeline', coalesce((
      select jsonb_agg(jsonb_build_object(
        'event_type', t.event_type,
        'description', t.description,
        'created_at', t.created_at
      ) order by t.created_at)
      from public.job_timeline t where t.job_id = j.id
    ), '[]'::jsonb),
    'shipment', (
      select jsonb_build_object('carrier', s.carrier, 'tracking_no', s.tracking_no, 'status', s.status, 'shipped_at', s.shipped_at)
      from public.shipments s where s.job_id = j.id order by s.created_at desc limit 1
    )
  ) into result
  from public.jobs j
  join public.customers c on c.id = j.customer_id
  where j.track_token = p_token;
  return result;
end $$;

grant execute on function public.get_public_tracking(text) to anon, authenticated;
