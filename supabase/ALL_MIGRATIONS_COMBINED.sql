-- ============================================================
-- รวมทุก migration (0001-0026) สำหรับตั้ง Supabase project ใหม่
-- Paste ทั้งไฟล์นี้ใน SQL Editor ของ project ใหม่ แล้วกด Run
-- ============================================================


-- ==================== 0001_init.sql ====================
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


-- ==================== 0002_rls.sql ====================
-- =========================================================================
-- Row Level Security: staff-only access for all tables
-- =========================================================================

alter table public.users enable row level security;
alter table public.customers enable row level security;
alter table public.customer_channels enable row level security;
alter table public.factories enable row level security;
alter table public.jobs enable row level security;
alter table public.job_items enable row level security;
alter table public.job_files enable row level security;
alter table public.job_timeline enable row level security;
alter table public.factory_jobs enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;
alter table public.notifications enable row level security;

-- helper: is current user an active staff?
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and is_active = true
  );
$$;
grant execute on function public.is_staff() to authenticated;

-- users: see self only (avoid recursive RLS via subquery on same table)
create policy users_select on public.users for select using (auth.uid() = id);
create policy users_update_self on public.users for update using (auth.uid() = id);

-- generic: any active staff can do everything on business tables
create policy customers_all on public.customers for all using (public.is_staff()) with check (public.is_staff());
create policy customer_channels_all on public.customer_channels for all using (public.is_staff()) with check (public.is_staff());
create policy factories_all on public.factories for all using (public.is_staff()) with check (public.is_staff());
create policy jobs_all on public.jobs for all using (public.is_staff()) with check (public.is_staff());
create policy job_items_all on public.job_items for all using (public.is_staff()) with check (public.is_staff());
create policy job_files_all on public.job_files for all using (public.is_staff()) with check (public.is_staff());
create policy job_timeline_all on public.job_timeline for all using (public.is_staff()) with check (public.is_staff());
create policy factory_jobs_all on public.factory_jobs for all using (public.is_staff()) with check (public.is_staff());
create policy payments_all on public.payments for all using (public.is_staff()) with check (public.is_staff());
create policy shipments_all on public.shipments for all using (public.is_staff()) with check (public.is_staff());
create policy notifications_all on public.notifications for all using (public.is_staff()) with check (public.is_staff());

-- =========================================================================
-- Storage bucket
-- =========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-files', 'job-files', false, 104857600, null)
on conflict (id) do nothing;

create policy "staff read job-files" on storage.objects for select to authenticated
  using (bucket_id = 'job-files' and public.is_staff());
create policy "staff write job-files" on storage.objects for insert to authenticated
  with check (bucket_id = 'job-files' and public.is_staff());
create policy "staff update job-files" on storage.objects for update to authenticated
  using (bucket_id = 'job-files' and public.is_staff());
create policy "staff delete job-files" on storage.objects for delete to authenticated
  using (bucket_id = 'job-files' and public.is_staff());


-- ==================== 0003_mockups.sql ====================
-- =========================================================================
-- Phase 9: Mockup Approval Flow
-- =========================================================================

create type mockup_status as enum ('draft', 'awaiting_approval', 'approved', 'rejected');

create table public.mockups (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  version int not null default 1,
  title text,
  description text,
  status mockup_status not null default 'draft',
  approval_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  storage_paths text[] not null default '{}',
  decision_note text,
  decided_at timestamptz,
  decided_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, version)
);
create index mockups_job_idx on public.mockups(job_id);
create index mockups_token_idx on public.mockups(approval_token);

create trigger mockups_updated_at before update on public.mockups
  for each row execute function public.set_updated_at();

-- RLS: staff only for admin operations
alter table public.mockups enable row level security;
create policy mockups_all on public.mockups for all using (public.is_staff()) with check (public.is_staff());

-- =========================================================================
-- Public RPC: get mockup details for approval page
-- =========================================================================
create or replace function public.get_mockup_for_approval(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'id', m.id,
    'job_code', j.job_code,
    'version', m.version,
    'title', m.title,
    'description', m.description,
    'status', m.status,
    'storage_paths', m.storage_paths,
    'decision_note', m.decision_note,
    'decided_at', m.decided_at,
    'decided_by_name', m.decided_by_name,
    'created_at', m.created_at,
    'customer_name', c.name
  ) into result
  from public.mockups m
  join public.jobs j on j.id = m.job_id
  join public.customers c on c.id = j.customer_id
  where m.approval_token = p_token;
  return result;
end $$;

grant execute on function public.get_mockup_for_approval(text) to anon, authenticated;

-- =========================================================================
-- Public RPC: submit customer's approval decision
-- =========================================================================
create or replace function public.submit_mockup_decision(
  p_token text,
  p_decision text,
  p_note text default null,
  p_name text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_mockup record;
  v_new_status mockup_status;
begin
  -- validate decision
  if p_decision not in ('approve', 'reject') then
    return jsonb_build_object('ok', false, 'error', 'Invalid decision');
  end if;

  -- find mockup by token
  select * into v_mockup from public.mockups where approval_token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Mockup not found');
  end if;

  -- only awaiting_approval can be decided
  if v_mockup.status != 'awaiting_approval' then
    return jsonb_build_object('ok', false, 'error', 'Mockup is not awaiting approval');
  end if;

  -- require note for reject
  if p_decision = 'reject' and (p_note is null or trim(p_note) = '') then
    return jsonb_build_object('ok', false, 'error', 'Comment required for changes request');
  end if;

  v_new_status := case p_decision when 'approve' then 'approved'::mockup_status else 'rejected'::mockup_status end;

  update public.mockups
  set
    status = v_new_status,
    decision_note = nullif(trim(coalesce(p_note, '')), ''),
    decided_by_name = nullif(trim(coalesce(p_name, '')), ''),
    decided_at = now()
  where id = v_mockup.id;

  -- log timeline event on the job
  insert into public.job_timeline(job_id, event_type, description, metadata)
  values (
    v_mockup.job_id,
    'mockup_decision',
    case when p_decision = 'approve'
      then 'ลูกค้าอนุมัติ Mockup v' || v_mockup.version
      else 'ลูกค้าขอแก้ไข Mockup v' || v_mockup.version || ': ' || coalesce(p_note, '')
    end,
    jsonb_build_object(
      'mockup_id', v_mockup.id,
      'version', v_mockup.version,
      'decision', p_decision,
      'decided_by_name', p_name
    )
  );

  -- auto-update job status: approved → designing finishes
  if p_decision = 'approve' then
    update public.jobs set status = 'sent_to_factory' where id = v_mockup.job_id and status in ('designing', 'awaiting_approval');
  else
    update public.jobs set status = 'designing' where id = v_mockup.job_id and status = 'awaiting_approval';
  end if;

  return jsonb_build_object('ok', true, 'status', v_new_status);
end $$;

grant execute on function public.submit_mockup_decision(text, text, text, text) to anon, authenticated;

-- =========================================================================
-- Public RPC: signed URL for mockup files
-- =========================================================================
-- Note: signed URLs are generated in app code via service role client
-- This RPC just validates token + returns paths


-- ==================== 0004_line_events.sql ====================
-- =========================================================================
-- Phase 10: LINE OA webhook event log
-- =========================================================================

create table public.line_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  line_user_id text,
  message_text text,
  raw_payload jsonb not null,
  customer_id uuid references public.customers(id) on delete set null,
  linked_at timestamptz,
  created_at timestamptz not null default now()
);
create index line_events_user_idx on public.line_webhook_events(line_user_id);
create index line_events_created_idx on public.line_webhook_events(created_at desc);
create index line_events_unlinked_idx on public.line_webhook_events(linked_at) where linked_at is null;

alter table public.line_webhook_events enable row level security;
create policy line_events_all on public.line_webhook_events
  for all using (public.is_staff()) with check (public.is_staff());


-- ==================== 0005_production_checkins.sql ====================
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


-- ==================== 0006_notifications.sql ====================
-- =========================================================================
-- Phase 12: Calendar feed + Admin daily digest
-- =========================================================================

-- Add calendar token (for .ics subscription) + personal LINE ID (for admin digest)
alter table public.users
  add column if not exists calendar_token text not null default encode(gen_random_bytes(16), 'hex'),
  add column if not exists line_user_id_personal text;

create unique index if not exists users_calendar_token_idx on public.users(calendar_token);


-- ==================== 0007_extend_tracking.sql ====================
-- =========================================================================
-- Phase 13: Extend public tracking RPC + customer feedback
-- =========================================================================

-- Allow customers to post comments on tracking page (read-only events of type 'customer_comment')
create table if not exists public.customer_comments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  author_name text,
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists customer_comments_job_idx on public.customer_comments(job_id, created_at desc);

alter table public.customer_comments enable row level security;
create policy customer_comments_select on public.customer_comments for select using (public.is_staff());

-- =========================================================================
-- Extend get_public_tracking to include mockup + items + production stages
-- =========================================================================
create or replace function public.get_public_tracking(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'job_id', j.id,
    'job_code', j.job_code,
    'status', j.status,
    'product_type', j.product_type,
    'quantity', j.quantity,
    'received_at', j.received_at,
    'due_date', j.due_date,
    'customer_name', c.name,
    'layout_progress', j.layout_progress,
    'print_progress', j.print_progress,
    'sew_progress', j.sew_progress,
    'ship_progress', j.ship_progress,
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
    ),
    'latest_mockup', (
      select jsonb_build_object(
        'id', m.id,
        'version', m.version,
        'title', m.title,
        'description', m.description,
        'status', m.status,
        'storage_paths', m.storage_paths,
        'approval_token', m.approval_token,
        'decided_at', m.decided_at,
        'decision_note', m.decision_note
      )
      from public.mockups m
      where m.job_id = j.id and m.status in ('awaiting_approval', 'approved', 'rejected')
      order by m.version desc
      limit 1
    ),
    'size_summary', (
      select coalesce(jsonb_agg(jsonb_build_object('size', size, 'count', cnt) order by size), '[]'::jsonb) from (
        select coalesce(nullif(trim(size), ''), 'ไม่ระบุ') as size, count(*)::int as cnt
        from public.job_items
        where job_id = j.id
        group by 1
      ) s
    ),
    'items_total', (select count(*)::int from public.job_items where job_id = j.id),
    'comments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'author_name', cc.author_name,
        'message', cc.message,
        'created_at', cc.created_at
      ) order by cc.created_at)
      from public.customer_comments cc where cc.job_id = j.id
    ), '[]'::jsonb)
  ) into result
  from public.jobs j
  join public.customers c on c.id = j.customer_id
  where j.track_token = p_token;
  return result;
end $$;

grant execute on function public.get_public_tracking(text) to anon, authenticated;

-- =========================================================================
-- Public RPC: customer post a comment on tracking page
-- =========================================================================
create or replace function public.post_customer_comment(
  p_token text,
  p_message text,
  p_name text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_job_id uuid;
begin
  -- Validate
  if p_message is null or length(trim(p_message)) < 2 then
    return jsonb_build_object('ok', false, 'error', 'กรุณาพิมพ์ข้อความ');
  end if;
  if length(p_message) > 1000 then
    return jsonb_build_object('ok', false, 'error', 'ข้อความยาวเกิน 1000 ตัวอักษร');
  end if;

  -- Find job by token
  select id into v_job_id from public.jobs where track_token = p_token;
  if v_job_id is null then
    return jsonb_build_object('ok', false, 'error', 'ไม่พบงาน');
  end if;

  -- Insert comment
  insert into public.customer_comments(job_id, author_name, message)
  values (v_job_id, nullif(trim(coalesce(p_name, '')), ''), trim(p_message));

  -- Log in job timeline so admin sees it
  insert into public.job_timeline(job_id, event_type, description)
  values (
    v_job_id,
    'customer_comment',
    'ลูกค้าตอบกลับ' || coalesce(' (' || nullif(trim(coalesce(p_name, '')), '') || ')', '') || ': ' || trim(p_message)
  );

  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.post_customer_comment(text, text, text) to anon, authenticated;


-- ==================== 0008_refine.sql ====================
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


-- ==================== 0009_item_type.sql ====================
-- =========================================================================
-- Phase 15: Add item_type to job_items
-- =========================================================================
alter table public.job_items
  add column if not exists item_type text;
-- item_type examples: "เป็นชุด", "เฉพาะเสื้อ", "เฉพาะกางเกง", "ถุงเท้า", "ปลอกแขน", "อื่น ๆ"

create index if not exists job_items_type_idx on public.job_items(job_id, item_type);


-- ==================== 0010_received_counts.sql ====================
-- ระบบตรวจรับเสื้อจากโรงงาน
-- เก็บจำนวนที่นับได้จริง แยกตามประเภท + ไซส์ (JSONB)
-- รูปแบบ: { "เป็นชุด": { "M": 5, "L": 10 }, "เฉพาะเสื้อ": { "M": 3 } }

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS received_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS received_check_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_check_note TEXT;


-- ==================== 0011_designs.sql ====================
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


-- ==================== 0012_factory_portal.sql ====================
-- =========================================================================
-- Factory Portal — 2-way communication with factories
-- โรงงานเข้าผ่าน public link (ไม่ต้อง login) → ดูงาน + อัพเดทขั้นตอน + ส่งข้อความ
-- Admin ตอบกลับ + เห็น notification เมื่อโรงงานส่งข้อความใหม่
-- =========================================================================

-- 1) Each factory_job gets a unique portal token (auto-generated)
alter table public.factory_jobs
  add column if not exists portal_token text unique;

-- Backfill tokens for existing rows
update public.factory_jobs
  set portal_token = encode(gen_random_bytes(16), 'hex')
  where portal_token is null;

-- Auto-generate for new rows
create or replace function public.set_factory_portal_token() returns trigger as $$
begin
  if new.portal_token is null or new.portal_token = '' then
    new.portal_token := encode(gen_random_bytes(16), 'hex');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_factory_portal_token on public.factory_jobs;
create trigger trg_factory_portal_token
  before insert on public.factory_jobs
  for each row execute function public.set_factory_portal_token();

-- 2) Messages table — 2-way thread between admin and factory
create table if not exists public.factory_messages (
  id uuid primary key default gen_random_uuid(),
  factory_job_id uuid not null references public.factory_jobs(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  author text not null check (author in ('admin', 'factory')),
  author_name text,
  kind text not null default 'text' check (kind in ('text', 'progress', 'issue', 'complete', 'question')),
  message text,
  stage text check (stage in ('layout', 'print', 'sew', 'ship') or stage is null),
  progress_value int check (progress_value between 0 and 100 or progress_value is null),
  read_by_admin boolean not null default false,
  read_by_factory boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists factory_messages_job_idx on public.factory_messages(job_id, created_at desc);
create index if not exists factory_messages_factory_job_idx on public.factory_messages(factory_job_id, created_at desc);
create index if not exists factory_messages_unread_admin_idx
  on public.factory_messages(read_by_admin) where read_by_admin = false and author = 'factory';

alter table public.factory_messages enable row level security;
drop policy if exists factory_messages_all on public.factory_messages;
create policy factory_messages_all on public.factory_messages
  for all using (public.is_staff()) with check (public.is_staff());

-- 3) Public RPC: factory reads their job by token
create or replace function public.get_factory_portal(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'factory_job_id', fj.id,
    'job_id', j.id,
    'job_code', j.job_code,
    'job_label', j.job_label,
    'product_type', j.product_type,
    'due_date', j.due_date,
    'note', j.note,
    'priority', j.priority,
    'job_status', j.status,
    'factory_status', fj.status,
    'factory_name', f.name,
    'factory_cost', fj.cost,
    'factory_note', fj.note,
    'sent_at', fj.sent_at,
    'returned_at', fj.returned_at,
    'layout_progress', j.layout_progress,
    'print_progress', j.print_progress,
    'sew_progress', j.sew_progress,
    'ship_progress', j.ship_progress,
    'items_total', (select count(*) from public.job_items where job_id = j.id),
    'items_by_size', (
      select coalesce(jsonb_agg(jsonb_build_object('size', size, 'count', cnt) order by size), '[]'::jsonb)
      from (
        select coalesce(upper(trim(size)), 'ไม่ระบุ') as size, count(*) as cnt
        from public.job_items where job_id = j.id
        group by 1
      ) s
    ),
    'items_by_type', (
      select coalesce(jsonb_agg(jsonb_build_object('item_type', it, 'count', cnt) order by it), '[]'::jsonb)
      from (
        select coalesce(trim(item_type), 'ไม่ระบุ') as it, count(*) as cnt
        from public.job_items where job_id = j.id
        group by 1
      ) t
    ),
    'messages', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id,
        'author', m.author,
        'author_name', m.author_name,
        'kind', m.kind,
        'message', m.message,
        'stage', m.stage,
        'progress_value', m.progress_value,
        'created_at', m.created_at
      ) order by m.created_at asc), '[]'::jsonb)
      from public.factory_messages m
      where m.factory_job_id = fj.id
    )
  ) into result
  from public.factory_jobs fj
  join public.jobs j on j.id = fj.job_id
  join public.factories f on f.id = fj.factory_id
  where fj.portal_token = p_token;

  if result is null then
    raise exception 'invalid_token';
  end if;

  -- Mark admin-authored messages as read (factory is viewing)
  update public.factory_messages
    set read_by_factory = true
    where factory_job_id = (result->>'factory_job_id')::uuid
      and author = 'admin'
      and read_by_factory = false;

  return result;
end;
$$;

revoke all on function public.get_factory_portal(text) from public;
grant execute on function public.get_factory_portal(text) to anon, authenticated;

-- 4) Public RPC: factory posts a message
create or replace function public.factory_post_message(
  p_token text,
  p_kind text,
  p_message text,
  p_stage text default null,
  p_progress_value int default null,
  p_author_name text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_factory_job_id uuid;
  v_job_id uuid;
  v_message_id uuid;
begin
  select fj.id, fj.job_id into v_factory_job_id, v_job_id
    from public.factory_jobs fj where fj.portal_token = p_token;

  if v_factory_job_id is null then
    raise exception 'invalid_token';
  end if;

  if p_kind not in ('text', 'progress', 'issue', 'complete', 'question') then
    raise exception 'invalid_kind';
  end if;

  insert into public.factory_messages
    (factory_job_id, job_id, author, author_name, kind, message, stage, progress_value, read_by_factory)
  values
    (v_factory_job_id, v_job_id, 'factory', nullif(trim(p_author_name), ''), p_kind, nullif(trim(p_message), ''), p_stage, p_progress_value, true)
  returning id into v_message_id;

  -- Write to job timeline for admin visibility
  insert into public.job_timeline (job_id, event_type, description)
  values (
    v_job_id,
    'factory_message',
    case p_kind
      when 'issue' then '🚨 โรงงานแจ้งปัญหา: ' || coalesce(p_message, '')
      when 'complete' then '✅ โรงงานแจ้งว่าทำเสร็จแล้ว' || coalesce(': ' || p_message, '')
      when 'progress' then '📊 โรงงานอัพเดท ' || coalesce(p_stage, '') || ' = ' || coalesce(p_progress_value::text, '') || '%'
      when 'question' then '❓ โรงงานถาม: ' || coalesce(p_message, '')
      else '💬 โรงงาน: ' || coalesce(p_message, '')
    end
  );

  return v_message_id;
end;
$$;

revoke all on function public.factory_post_message(text, text, text, text, int, text) from public;
grant execute on function public.factory_post_message(text, text, text, text, int, text) to anon, authenticated;

-- 5) Public RPC: factory updates a production stage
create or replace function public.factory_update_stage(
  p_token text,
  p_stage text,
  p_value int,
  p_author_name text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_factory_job_id uuid;
  v_job_id uuid;
begin
  if p_stage not in ('layout', 'print', 'sew', 'ship') then
    raise exception 'invalid_stage';
  end if;
  if p_value < 0 or p_value > 100 then
    raise exception 'invalid_value';
  end if;

  select fj.id, fj.job_id into v_factory_job_id, v_job_id
    from public.factory_jobs fj where fj.portal_token = p_token;

  if v_factory_job_id is null then
    raise exception 'invalid_token';
  end if;

  -- Update the corresponding *_progress column on jobs
  if p_stage = 'layout' then
    update public.jobs set layout_progress = p_value where id = v_job_id;
  elsif p_stage = 'print' then
    update public.jobs set print_progress = p_value where id = v_job_id;
  elsif p_stage = 'sew' then
    update public.jobs set sew_progress = p_value where id = v_job_id;
  elsif p_stage = 'ship' then
    update public.jobs set ship_progress = p_value where id = v_job_id;
  end if;

  -- Log to messages so admin sees the update
  insert into public.factory_messages
    (factory_job_id, job_id, author, author_name, kind, stage, progress_value, read_by_factory)
  values
    (v_factory_job_id, v_job_id, 'factory', nullif(trim(p_author_name), ''), 'progress', p_stage, p_value, true);
end;
$$;

revoke all on function public.factory_update_stage(text, text, int, text) from public;
grant execute on function public.factory_update_stage(text, text, int, text) to anon, authenticated;


-- ==================== 0013_factory_portal_files.sql ====================
-- =========================================================================
-- Factory Portal — show JOB files to factory (artwork, work orders, references)
-- โรงงานเห็นไฟล์ทั้งหมดยกเว้น 'slip' (สลิปการเงิน — เป็นส่วนตัว)
-- =========================================================================

create or replace function public.get_factory_portal(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'factory_job_id', fj.id,
    'job_id', j.id,
    'job_code', j.job_code,
    'job_label', j.job_label,
    'product_type', j.product_type,
    'due_date', j.due_date,
    'note', j.note,
    'priority', j.priority,
    'job_status', j.status,
    'factory_status', fj.status,
    'factory_name', f.name,
    'factory_cost', fj.cost,
    'factory_note', fj.note,
    'sent_at', fj.sent_at,
    'returned_at', fj.returned_at,
    'layout_progress', j.layout_progress,
    'print_progress', j.print_progress,
    'sew_progress', j.sew_progress,
    'ship_progress', j.ship_progress,
    'items_total', (select count(*) from public.job_items where job_id = j.id),
    'items_by_size', (
      select coalesce(jsonb_agg(jsonb_build_object('size', size, 'count', cnt) order by size), '[]'::jsonb)
      from (
        select coalesce(upper(trim(size)), 'ไม่ระบุ') as size, count(*) as cnt
        from public.job_items where job_id = j.id
        group by 1
      ) s
    ),
    'items_by_type', (
      select coalesce(jsonb_agg(jsonb_build_object('item_type', it, 'count', cnt) order by it), '[]'::jsonb)
      from (
        select coalesce(trim(item_type), 'ไม่ระบุ') as it, count(*) as cnt
        from public.job_items where job_id = j.id
        group by 1
      ) t
    ),
    -- All items with name/number/size/sponsor for factory reference (the full roster)
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', name,
        'number', number,
        'size', size,
        'sponsor', sponsor,
        'item_type', item_type,
        'note', note
      ) order by position), '[]'::jsonb)
      from public.job_items where job_id = j.id
    ),
    -- All files EXCEPT payment slips (slips are private)
    'files', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'kind', kind,
        'storage_path', storage_path,
        'file_name', file_name,
        'file_size', file_size,
        'mime_type', mime_type,
        'created_at', created_at
      ) order by created_at desc), '[]'::jsonb)
      from public.job_files
      where job_id = j.id and kind != 'slip'
    ),
    'messages', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id,
        'author', m.author,
        'author_name', m.author_name,
        'kind', m.kind,
        'message', m.message,
        'stage', m.stage,
        'progress_value', m.progress_value,
        'created_at', m.created_at
      ) order by m.created_at asc), '[]'::jsonb)
      from public.factory_messages m
      where m.factory_job_id = fj.id
    )
  ) into result
  from public.factory_jobs fj
  join public.jobs j on j.id = fj.job_id
  join public.factories f on f.id = fj.factory_id
  where fj.portal_token = p_token;

  if result is null then
    raise exception 'invalid_token';
  end if;

  update public.factory_messages
    set read_by_factory = true
    where factory_job_id = (result->>'factory_job_id')::uuid
      and author = 'admin'
      and read_by_factory = false;

  return result;
end;
$$;


-- ==================== 0014_job_items_quantity.sql ====================
-- =========================================================================
-- เพิ่ม quantity ให้ job_items
-- แต่ละแถว = 1 รายการที่มี 1 หรือมากกว่า units (เช่น ถุงเท้า 5 คู่ = 1 row, quantity=5)
-- =========================================================================

alter table public.job_items
  add column if not exists quantity int not null default 1 check (quantity > 0);

-- Update factory portal RPC to use SUM(quantity) instead of COUNT(*)
create or replace function public.get_factory_portal(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'factory_job_id', fj.id,
    'job_id', j.id,
    'job_code', j.job_code,
    'job_label', j.job_label,
    'product_type', j.product_type,
    'due_date', j.due_date,
    'note', j.note,
    'priority', j.priority,
    'job_status', j.status,
    'factory_status', fj.status,
    'factory_name', f.name,
    'factory_cost', fj.cost,
    'factory_note', fj.note,
    'sent_at', fj.sent_at,
    'returned_at', fj.returned_at,
    'layout_progress', j.layout_progress,
    'print_progress', j.print_progress,
    'sew_progress', j.sew_progress,
    'ship_progress', j.ship_progress,
    'items_total', (select coalesce(sum(quantity), 0) from public.job_items where job_id = j.id),
    'items_by_size', (
      select coalesce(jsonb_agg(jsonb_build_object('size', size, 'count', cnt) order by size), '[]'::jsonb)
      from (
        select coalesce(upper(trim(size)), 'ไม่ระบุ') as size, sum(quantity) as cnt
        from public.job_items where job_id = j.id
        group by 1
      ) s
    ),
    'items_by_type', (
      select coalesce(jsonb_agg(jsonb_build_object('item_type', it, 'count', cnt) order by it), '[]'::jsonb)
      from (
        select coalesce(trim(item_type), 'ไม่ระบุ') as it, sum(quantity) as cnt
        from public.job_items where job_id = j.id
        group by 1
      ) t
    ),
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', name,
        'number', number,
        'size', size,
        'sponsor', sponsor,
        'item_type', item_type,
        'quantity', quantity,
        'note', note
      ) order by position), '[]'::jsonb)
      from public.job_items where job_id = j.id
    ),
    'files', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'kind', kind,
        'storage_path', storage_path,
        'file_name', file_name,
        'file_size', file_size,
        'mime_type', mime_type,
        'created_at', created_at
      ) order by created_at desc), '[]'::jsonb)
      from public.job_files
      where job_id = j.id and kind != 'slip'
    ),
    'messages', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id,
        'author', m.author,
        'author_name', m.author_name,
        'kind', m.kind,
        'message', m.message,
        'stage', m.stage,
        'progress_value', m.progress_value,
        'created_at', m.created_at
      ) order by m.created_at asc), '[]'::jsonb)
      from public.factory_messages m
      where m.factory_job_id = fj.id
    )
  ) into result
  from public.factory_jobs fj
  join public.jobs j on j.id = fj.job_id
  join public.factories f on f.id = fj.factory_id
  where fj.portal_token = p_token;

  if result is null then
    raise exception 'invalid_token';
  end if;

  update public.factory_messages
    set read_by_factory = true
    where factory_job_id = (result->>'factory_job_id')::uuid
      and author = 'admin'
      and read_by_factory = false;

  return result;
end;
$$;


-- ==================== 0015_factory_item_checklist.sql ====================
-- =========================================================================
-- Factory checklist — โรงงานติ๊กเช็คว่าแต่ละชิ้นผลิตเสร็จแล้ว
-- =========================================================================

alter table public.job_items
  add column if not exists produced boolean not null default false,
  add column if not exists produced_at timestamptz;

create index if not exists job_items_produced_idx on public.job_items(job_id, produced);

-- Update factory portal RPC to include `id` + `produced` per item
create or replace function public.get_factory_portal(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'factory_job_id', fj.id,
    'job_id', j.id,
    'job_code', j.job_code,
    'job_label', j.job_label,
    'product_type', j.product_type,
    'due_date', j.due_date,
    'note', j.note,
    'priority', j.priority,
    'job_status', j.status,
    'factory_status', fj.status,
    'factory_name', f.name,
    'factory_cost', fj.cost,
    'factory_note', fj.note,
    'sent_at', fj.sent_at,
    'returned_at', fj.returned_at,
    'layout_progress', j.layout_progress,
    'print_progress', j.print_progress,
    'sew_progress', j.sew_progress,
    'ship_progress', j.ship_progress,
    'items_total', (select coalesce(sum(quantity), 0) from public.job_items where job_id = j.id),
    'items_produced', (select coalesce(sum(quantity), 0) from public.job_items where job_id = j.id and produced = true),
    'items_by_size', (
      select coalesce(jsonb_agg(jsonb_build_object('size', size, 'count', cnt) order by size), '[]'::jsonb)
      from (
        select coalesce(upper(trim(size)), 'ไม่ระบุ') as size, sum(quantity) as cnt
        from public.job_items where job_id = j.id
        group by 1
      ) s
    ),
    'items_by_type', (
      select coalesce(jsonb_agg(jsonb_build_object('item_type', it, 'count', cnt) order by it), '[]'::jsonb)
      from (
        select coalesce(trim(item_type), 'ไม่ระบุ') as it, sum(quantity) as cnt
        from public.job_items where job_id = j.id
        group by 1
      ) t
    ),
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'number', number,
        'size', size,
        'sponsor', sponsor,
        'item_type', item_type,
        'quantity', quantity,
        'note', note,
        'produced', produced,
        'produced_at', produced_at
      ) order by position), '[]'::jsonb)
      from public.job_items where job_id = j.id
    ),
    'files', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'kind', kind,
        'storage_path', storage_path,
        'file_name', file_name,
        'file_size', file_size,
        'mime_type', mime_type,
        'created_at', created_at
      ) order by created_at desc), '[]'::jsonb)
      from public.job_files
      where job_id = j.id and kind != 'slip'
    ),
    'messages', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id,
        'author', m.author,
        'author_name', m.author_name,
        'kind', m.kind,
        'message', m.message,
        'stage', m.stage,
        'progress_value', m.progress_value,
        'created_at', m.created_at
      ) order by m.created_at asc), '[]'::jsonb)
      from public.factory_messages m
      where m.factory_job_id = fj.id
    )
  ) into result
  from public.factory_jobs fj
  join public.jobs j on j.id = fj.job_id
  join public.factories f on f.id = fj.factory_id
  where fj.portal_token = p_token;

  if result is null then
    raise exception 'invalid_token';
  end if;

  update public.factory_messages
    set read_by_factory = true
    where factory_job_id = (result->>'factory_job_id')::uuid
      and author = 'admin'
      and read_by_factory = false;

  return result;
end;
$$;

-- New RPC: factory toggles `produced` flag on a single item
create or replace function public.factory_toggle_item_produced(
  p_token text,
  p_item_id uuid,
  p_produced boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
begin
  -- Validate token + get job_id
  select fj.job_id into v_job_id
    from public.factory_jobs fj
    where fj.portal_token = p_token;
  if v_job_id is null then
    raise exception 'invalid_token';
  end if;

  -- Update the item — only if it belongs to this job
  update public.job_items
    set produced = p_produced,
        produced_at = case when p_produced then now() else null end
    where id = p_item_id and job_id = v_job_id;

  if not found then
    raise exception 'item_not_found';
  end if;
end;
$$;

revoke all on function public.factory_toggle_item_produced(text, uuid, boolean) from public;
grant execute on function public.factory_toggle_item_produced(text, uuid, boolean) to anon, authenticated;

-- New RPC: factory bulk-marks all items of a given type as produced
create or replace function public.factory_mark_group_produced(
  p_token text,
  p_item_type text,
  p_produced boolean
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
  v_count int;
begin
  select fj.job_id into v_job_id
    from public.factory_jobs fj
    where fj.portal_token = p_token;
  if v_job_id is null then
    raise exception 'invalid_token';
  end if;

  update public.job_items
    set produced = p_produced,
        produced_at = case when p_produced then now() else null end
    where job_id = v_job_id
      and coalesce(trim(item_type), 'ไม่ระบุประเภท') = p_item_type;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.factory_mark_group_produced(text, text, boolean) from public;
grant execute on function public.factory_mark_group_produced(text, text, boolean) to anon, authenticated;


-- ==================== 0016_factory_portal_mockups.sql ====================
-- =========================================================================
-- Factory portal — แสดง mockup ที่อนุมัติแล้วให้โรงงานดูประกอบการผลิต
-- เฉพาะ status = 'approved' เท่านั้น (ไม่โชว์ draft/rejected)
-- =========================================================================

create or replace function public.get_factory_portal(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'factory_job_id', fj.id,
    'job_id', j.id,
    'job_code', j.job_code,
    'job_label', j.job_label,
    'product_type', j.product_type,
    'due_date', j.due_date,
    'note', j.note,
    'priority', j.priority,
    'job_status', j.status,
    'factory_status', fj.status,
    'factory_name', f.name,
    'factory_cost', fj.cost,
    'factory_note', fj.note,
    'sent_at', fj.sent_at,
    'returned_at', fj.returned_at,
    'layout_progress', j.layout_progress,
    'print_progress', j.print_progress,
    'sew_progress', j.sew_progress,
    'ship_progress', j.ship_progress,
    'items_total', (select coalesce(sum(quantity), 0) from public.job_items where job_id = j.id),
    'items_produced', (select coalesce(sum(quantity), 0) from public.job_items where job_id = j.id and produced = true),
    'items_by_size', (
      select coalesce(jsonb_agg(jsonb_build_object('size', size, 'count', cnt) order by size), '[]'::jsonb)
      from (
        select coalesce(upper(trim(size)), 'ไม่ระบุ') as size, sum(quantity) as cnt
        from public.job_items where job_id = j.id
        group by 1
      ) s
    ),
    'items_by_type', (
      select coalesce(jsonb_agg(jsonb_build_object('item_type', it, 'count', cnt) order by it), '[]'::jsonb)
      from (
        select coalesce(trim(item_type), 'ไม่ระบุ') as it, sum(quantity) as cnt
        from public.job_items where job_id = j.id
        group by 1
      ) t
    ),
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'number', number,
        'size', size,
        'sponsor', sponsor,
        'item_type', item_type,
        'quantity', quantity,
        'note', note,
        'produced', produced,
        'produced_at', produced_at
      ) order by position), '[]'::jsonb)
      from public.job_items where job_id = j.id
    ),
    'files', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'kind', kind,
        'storage_path', storage_path,
        'file_name', file_name,
        'file_size', file_size,
        'mime_type', mime_type,
        'created_at', created_at
      ) order by created_at desc), '[]'::jsonb)
      from public.job_files
      where job_id = j.id and kind != 'slip'
    ),
    -- Mockups: only approved ones (factory shouldn't see drafts/rejected)
    'mockups', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'version', version,
        'title', title,
        'description', description,
        'storage_paths', storage_paths,
        'decided_at', decided_at,
        'decision_note', decision_note
      ) order by version desc), '[]'::jsonb)
      from public.mockups
      where job_id = j.id and status = 'approved'
    ),
    'messages', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id,
        'author', m.author,
        'author_name', m.author_name,
        'kind', m.kind,
        'message', m.message,
        'stage', m.stage,
        'progress_value', m.progress_value,
        'created_at', m.created_at
      ) order by m.created_at asc), '[]'::jsonb)
      from public.factory_messages m
      where m.factory_job_id = fj.id
    )
  ) into result
  from public.factory_jobs fj
  join public.jobs j on j.id = fj.job_id
  join public.factories f on f.id = fj.factory_id
  where fj.portal_token = p_token;

  if result is null then
    raise exception 'invalid_token';
  end if;

  update public.factory_messages
    set read_by_factory = true
    where factory_job_id = (result->>'factory_job_id')::uuid
      and author = 'admin'
      and read_by_factory = false;

  return result;
end;
$$;


-- ==================== 0017_factory_portal_all_mockups.sql ====================
-- =========================================================================
-- Factory portal — show ALL mockups (not just approved)
-- Exclude only rejected (those should NOT be produced)
-- =========================================================================

create or replace function public.get_factory_portal(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'factory_job_id', fj.id,
    'job_id', j.id,
    'job_code', j.job_code,
    'job_label', j.job_label,
    'product_type', j.product_type,
    'due_date', j.due_date,
    'note', j.note,
    'priority', j.priority,
    'job_status', j.status,
    'factory_status', fj.status,
    'factory_name', f.name,
    'factory_cost', fj.cost,
    'factory_note', fj.note,
    'sent_at', fj.sent_at,
    'returned_at', fj.returned_at,
    'layout_progress', j.layout_progress,
    'print_progress', j.print_progress,
    'sew_progress', j.sew_progress,
    'ship_progress', j.ship_progress,
    'items_total', (select coalesce(sum(quantity), 0) from public.job_items where job_id = j.id),
    'items_produced', (select coalesce(sum(quantity), 0) from public.job_items where job_id = j.id and produced = true),
    'items_by_size', (
      select coalesce(jsonb_agg(jsonb_build_object('size', size, 'count', cnt) order by size), '[]'::jsonb)
      from (
        select coalesce(upper(trim(size)), 'ไม่ระบุ') as size, sum(quantity) as cnt
        from public.job_items where job_id = j.id
        group by 1
      ) s
    ),
    'items_by_type', (
      select coalesce(jsonb_agg(jsonb_build_object('item_type', it, 'count', cnt) order by it), '[]'::jsonb)
      from (
        select coalesce(trim(item_type), 'ไม่ระบุ') as it, sum(quantity) as cnt
        from public.job_items where job_id = j.id
        group by 1
      ) t
    ),
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'number', number,
        'size', size,
        'sponsor', sponsor,
        'item_type', item_type,
        'quantity', quantity,
        'note', note,
        'produced', produced,
        'produced_at', produced_at
      ) order by position), '[]'::jsonb)
      from public.job_items where job_id = j.id
    ),
    'files', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'kind', kind,
        'storage_path', storage_path,
        'file_name', file_name,
        'file_size', file_size,
        'mime_type', mime_type,
        'created_at', created_at
      ) order by created_at desc), '[]'::jsonb)
      from public.job_files
      where job_id = j.id and kind != 'slip'
    ),
    -- Show ALL mockups except rejected (factory needs to see designs ASAP)
    'mockups', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'version', version,
        'title', title,
        'description', description,
        'storage_paths', storage_paths,
        'status', status,
        'decided_at', decided_at,
        'decision_note', decision_note,
        'created_at', created_at
      ) order by version desc), '[]'::jsonb)
      from public.mockups
      where job_id = j.id and status != 'rejected'
    ),
    'messages', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id,
        'author', m.author,
        'author_name', m.author_name,
        'kind', m.kind,
        'message', m.message,
        'stage', m.stage,
        'progress_value', m.progress_value,
        'created_at', m.created_at
      ) order by m.created_at asc), '[]'::jsonb)
      from public.factory_messages m
      where m.factory_job_id = fj.id
    )
  ) into result
  from public.factory_jobs fj
  join public.jobs j on j.id = fj.job_id
  join public.factories f on f.id = fj.factory_id
  where fj.portal_token = p_token;

  if result is null then
    raise exception 'invalid_token';
  end if;

  update public.factory_messages
    set read_by_factory = true
    where factory_job_id = (result->>'factory_job_id')::uuid
      and author = 'admin'
      and read_by_factory = false;

  return result;
end;
$$;


-- ==================== 0018_shop_info_seed.sql ====================
-- =========================================================================
-- Ensure shop_info row id=1 exists (safety net if seed didn't run)
-- =========================================================================

insert into public.shop_info (id, shop_name)
  values (1, 'SportShop')
  on conflict (id) do nothing;


-- ==================== 0019_public_storefront.sql ====================
-- =========================================================================
-- Public Storefront (4 phases combined)
--   1. Catalog (fabric / collar / product types / sleeves / extras)
--   2. Portfolio (use designs with is_public flag)
--   3. Landing data (uses existing designs + catalog)
--   4. Quote request / inquiries
-- =========================================================================

-- 1) Catalog categories
create table if not exists public.catalog_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  position int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2) Catalog items
create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.catalog_categories(id) on delete cascade,
  name text not null,
  description text,
  thumbnail_path text,
  image_paths text[] not null default '{}',
  attributes jsonb not null default '{}',
  is_active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists catalog_items_category_idx on public.catalog_items(category_id, position);

drop trigger if exists catalog_items_updated_at on public.catalog_items;
create trigger catalog_items_updated_at before update on public.catalog_items
  for each row execute function public.set_updated_at();

-- 3) Inquiries (quote requests from public site)
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  line_id text,
  team_name text,
  product_type text,
  quantity int,
  budget numeric(10,2),
  message text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'quoted', 'converted', 'rejected')),
  converted_to_customer_id uuid references public.customers(id) on delete set null,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists inquiries_status_idx on public.inquiries(status, created_at desc);

drop trigger if exists inquiries_updated_at on public.inquiries;
create trigger inquiries_updated_at before update on public.inquiries
  for each row execute function public.set_updated_at();

-- 4) Mark designs as publicly visible (for /portfolio)
-- Defensive: only run if designs table exists (in case 0011 not yet applied)
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'designs')
  then
    alter table public.designs
      add column if not exists is_public boolean not null default false;
    create index if not exists designs_public_idx on public.designs(is_public) where is_public = true;
  end if;
end $$;

-- =========================================================================
-- RLS
-- =========================================================================

-- Catalog: public READ active, staff FULL
alter table public.catalog_categories enable row level security;
drop policy if exists catalog_categories_public_read on public.catalog_categories;
create policy catalog_categories_public_read on public.catalog_categories
  for select to anon, authenticated using (is_active = true);
drop policy if exists catalog_categories_staff on public.catalog_categories;
create policy catalog_categories_staff on public.catalog_categories
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

alter table public.catalog_items enable row level security;
drop policy if exists catalog_items_public_read on public.catalog_items;
create policy catalog_items_public_read on public.catalog_items
  for select to anon, authenticated using (is_active = true);
drop policy if exists catalog_items_staff on public.catalog_items;
create policy catalog_items_staff on public.catalog_items
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Inquiries: public submits via RPC only; staff sees all
alter table public.inquiries enable row level security;
drop policy if exists inquiries_staff on public.inquiries;
create policy inquiries_staff on public.inquiries
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- =========================================================================
-- Seed common categories
-- =========================================================================
insert into public.catalog_categories (slug, name, description, icon, position) values
  ('fabric',  'เนื้อผ้า',       'ชนิดผ้าที่ใช้พิมพ์ — เลือกตามการใช้งานและงบประมาณ', '🧵', 1),
  ('collar',  'คอเสื้อ',         'แบบคอเสื้อให้เลือก — เปลี่ยน look ของชุดได้',         '👔', 2),
  ('product', 'ประเภทเสื้อ',     'เสื้อกีฬาแบ่งตามชนิดกีฬา + การออกแบบ',              '👕', 3),
  ('sleeve',  'แบบแขน',         'แขนสั้น / แขนยาว / ทรงต่าง ๆ',                       '💪', 4),
  ('extras',  'สินค้าเสริม',     'ถุงเท้า ปลอกแขน ผ้าพันคอ ฯลฯ',                       '🧦', 5)
  on conflict (slug) do nothing;

-- =========================================================================
-- Public RPCs
-- =========================================================================

-- Read full public catalog (categories + items) in one round-trip
create or replace function public.get_public_catalog()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id,
      'slug', c.slug,
      'name', c.name,
      'description', c.description,
      'icon', c.icon,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', i.id,
          'name', i.name,
          'description', i.description,
          'thumbnail_path', i.thumbnail_path,
          'image_paths', i.image_paths,
          'attributes', i.attributes
        ) order by i.position, i.created_at)
        from public.catalog_items i
        where i.category_id = c.id and i.is_active = true
      ), '[]'::jsonb)
    ) order by c.position, c.name)
    from public.catalog_categories c
    where c.is_active = true
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_public_catalog() from public;
grant execute on function public.get_public_catalog() to anon, authenticated;

-- Read one category by slug (for detail page)
create or replace function public.get_public_catalog_category(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'id', c.id,
    'slug', c.slug,
    'name', c.name,
    'description', c.description,
    'icon', c.icon,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'name', i.name,
        'description', i.description,
        'thumbnail_path', i.thumbnail_path,
        'image_paths', i.image_paths,
        'attributes', i.attributes
      ) order by i.position, i.created_at)
      from public.catalog_items i
      where i.category_id = c.id and i.is_active = true
    ), '[]'::jsonb)
  ) into result
  from public.catalog_categories c
  where c.slug = p_slug and c.is_active = true;
  return result;
end;
$$;

revoke all on function public.get_public_catalog_category(text) from public;
grant execute on function public.get_public_catalog_category(text) to anon, authenticated;

-- Read public portfolio (designs.is_public = true)
-- Defensive: only create if designs table exists
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'designs')
  then
    execute $func$
      create or replace function public.get_public_portfolio()
      returns jsonb
      language plpgsql
      security definer
      set search_path = public
      as $body$
      begin
        return coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', id,
            'code', code,
            'name', name,
            'description', description,
            'sport_type', sport_type,
            'colors', colors,
            'tags', tags,
            'thumbnail_path', thumbnail_path,
            'image_paths', image_paths,
            'created_at', created_at
          ) order by use_count desc, created_at desc)
          from public.designs
          where is_public = true
        ), '[]'::jsonb);
      end;
      $body$;
    $func$;
  else
    -- Stub: returns empty array until designs table is created
    execute $func$
      create or replace function public.get_public_portfolio()
      returns jsonb
      language sql
      security definer
      as $body$ select '[]'::jsonb $body$;
    $func$;
  end if;
end $$;

revoke all on function public.get_public_portfolio() from public;
grant execute on function public.get_public_portfolio() to anon, authenticated;

-- Submit inquiry (quote request)
create or replace function public.submit_inquiry(
  p_name text,
  p_phone text default null,
  p_email text default null,
  p_line_id text default null,
  p_team_name text default null,
  p_product_type text default null,
  p_quantity int default null,
  p_budget numeric default null,
  p_message text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_name is null or trim(p_name) = '' then
    raise exception 'name_required';
  end if;
  if (p_phone is null or trim(p_phone) = '')
     and (p_email is null or trim(p_email) = '')
     and (p_line_id is null or trim(p_line_id) = '')
  then
    raise exception 'contact_required';
  end if;

  insert into public.inquiries
    (name, phone, email, line_id, team_name, product_type, quantity, budget, message)
  values
    (trim(p_name),
     nullif(trim(p_phone), ''),
     nullif(trim(p_email), ''),
     nullif(trim(p_line_id), ''),
     nullif(trim(p_team_name), ''),
     nullif(trim(p_product_type), ''),
     p_quantity,
     p_budget,
     nullif(trim(p_message), ''))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.submit_inquiry(text, text, text, text, text, text, int, numeric, text) from public;
grant execute on function public.submit_inquiry(text, text, text, text, text, text, int, numeric, text) to anon, authenticated;


-- ==================== 0020_job_discount.sql ====================
-- =========================================================================
-- เพิ่ม discount (ส่วนลด) ใน JOB
-- net = sale_price - discount
-- =========================================================================

alter table public.jobs
  add column if not exists discount numeric(10,2) not null default 0
    check (discount >= 0);

comment on column public.jobs.discount is 'Discount amount in baht (subtract from sale_price)';


-- ==================== 0021_job_delivery_address.sql ====================
-- =========================================================================
-- เพิ่มที่อยู่จัดส่ง — ใช้ในข้อความแจ้งโรงงาน + ใบงาน
-- =========================================================================

alter table public.jobs
  add column if not exists delivery_address text;

comment on column public.jobs.delivery_address is 'ที่อยู่จัดส่งของลูกค้า (แสดงให้โรงงาน + ใบงาน)';


-- ==================== 0022_job_production_options.sql ====================
-- =========================================================================
-- ออปชั่นการผลิต (production options / add-ons)
-- เช่น ปกทอ, ปกสำเร็จ, ปกลูกฟูก, ต่อปลายแขน, โลโก้ 3D ฯลฯ
-- เก็บเป็น text[] — มี preset + พิมพ์เพิ่มเองได้
-- =========================================================================

alter table public.jobs
  add column if not exists production_options text[] not null default '{}';

comment on column public.jobs.production_options is 'ออปชั่นการผลิตที่สั่งโรงงาน เช่น ปกทอ, โลโก้ 3D, ต่อปลายแขน';


-- ==================== 0023_portal_production_options.sql ====================
-- =========================================================================
-- เพิ่ม production_options + delivery_address ใน factory portal RPC
-- =========================================================================

create or replace function public.get_factory_portal(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'factory_job_id', fj.id,
    'job_id', j.id,
    'job_code', j.job_code,
    'job_label', j.job_label,
    'product_type', j.product_type,
    'due_date', j.due_date,
    'note', j.note,
    'priority', j.priority,
    'job_status', j.status,
    'factory_status', fj.status,
    'factory_name', f.name,
    'factory_cost', fj.cost,
    'factory_note', fj.note,
    'sent_at', fj.sent_at,
    'returned_at', fj.returned_at,
    'delivery_address', j.delivery_address,
    'production_options', to_jsonb(coalesce(j.production_options, '{}')),
    'layout_progress', j.layout_progress,
    'print_progress', j.print_progress,
    'sew_progress', j.sew_progress,
    'ship_progress', j.ship_progress,
    'items_total', (select coalesce(sum(quantity), 0) from public.job_items where job_id = j.id),
    'items_produced', (select coalesce(sum(quantity), 0) from public.job_items where job_id = j.id and produced = true),
    'items_by_size', (
      select coalesce(jsonb_agg(jsonb_build_object('size', size, 'count', cnt) order by size), '[]'::jsonb)
      from (
        select coalesce(upper(trim(size)), 'ไม่ระบุ') as size, sum(quantity) as cnt
        from public.job_items where job_id = j.id
        group by 1
      ) s
    ),
    'items_by_type', (
      select coalesce(jsonb_agg(jsonb_build_object('item_type', it, 'count', cnt) order by it), '[]'::jsonb)
      from (
        select coalesce(trim(item_type), 'ไม่ระบุ') as it, sum(quantity) as cnt
        from public.job_items where job_id = j.id
        group by 1
      ) t
    ),
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'number', number,
        'size', size,
        'sponsor', sponsor,
        'item_type', item_type,
        'quantity', quantity,
        'note', note,
        'produced', produced,
        'produced_at', produced_at
      ) order by position), '[]'::jsonb)
      from public.job_items where job_id = j.id
    ),
    'files', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'kind', kind,
        'storage_path', storage_path,
        'file_name', file_name,
        'file_size', file_size,
        'mime_type', mime_type,
        'created_at', created_at
      ) order by created_at desc), '[]'::jsonb)
      from public.job_files
      where job_id = j.id and kind != 'slip'
    ),
    'mockups', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'version', version,
        'title', title,
        'description', description,
        'storage_paths', storage_paths,
        'status', status,
        'decided_at', decided_at,
        'decision_note', decision_note,
        'created_at', created_at
      ) order by version desc), '[]'::jsonb)
      from public.mockups
      where job_id = j.id and status != 'rejected'
    ),
    'messages', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id,
        'author', m.author,
        'author_name', m.author_name,
        'kind', m.kind,
        'message', m.message,
        'stage', m.stage,
        'progress_value', m.progress_value,
        'created_at', m.created_at
      ) order by m.created_at asc), '[]'::jsonb)
      from public.factory_messages m
      where m.factory_job_id = fj.id
    )
  ) into result
  from public.factory_jobs fj
  join public.jobs j on j.id = fj.job_id
  join public.factories f on f.id = fj.factory_id
  where fj.portal_token = p_token;

  if result is null then
    raise exception 'invalid_token';
  end if;

  update public.factory_messages
    set read_by_factory = true
    where factory_job_id = (result->>'factory_job_id')::uuid
      and author = 'admin'
      and read_by_factory = false;

  return result;
end;
$$;


-- ==================== 0024_expenses.sql ====================
-- =========================================================================
-- Expenses — บันทึกเงินออกจริง (จ่ายโรงงาน, วัสดุ, ค่าเช่า, เงินเดือน ฯลฯ)
-- ใช้คู่กับ payments (เงินเข้า) เพื่อทำกระแสเงินสด (cash flow) จริง
-- =========================================================================

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'other'
    check (category in ('factory', 'material', 'shipping', 'rent', 'salary', 'marketing', 'utility', 'equipment', 'other')),
  amount numeric(12,2) not null check (amount >= 0),
  paid_at timestamptz not null default now(),
  note text,
  job_id uuid references public.jobs(id) on delete set null,  -- ผูกกับงาน (ถ้ามี)
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists expenses_paid_at_idx on public.expenses(paid_at desc);
create index if not exists expenses_category_idx on public.expenses(category);
create index if not exists expenses_job_idx on public.expenses(job_id);

alter table public.expenses enable row level security;
drop policy if exists expenses_all on public.expenses;
create policy expenses_all on public.expenses
  for all to authenticated using (public.is_staff()) with check (public.is_staff());


-- ==================== 0025_realtime_dashboard.sql ====================
-- =========================================================================
-- เปิด Realtime ให้ตารางที่ dashboard ใช้ — เพื่อ auto-refresh เมื่อข้อมูลเปลี่ยน
-- (jobs เปิดอยู่แล้วจาก Kanban — เพิ่ม payments + job_timeline)
-- ปลอดภัยถ้ารันซ้ำ: ครอบด้วย exception handler
-- =========================================================================

do $$
begin
  begin
    alter publication supabase_realtime add table public.jobs;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.payments;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.job_timeline;
  exception when duplicate_object then null;
  end;
end $$;


-- ==================== 0026_realtime_all_tables.sql ====================
-- =========================================================================
-- เปิด Realtime ให้ทุกตารางหลัก — เพื่อให้ทุกหน้าใน admin auto-refresh
-- ปลอดภัยถ้ารันซ้ำ (ครอบด้วย exception handler ต่อ table)
-- =========================================================================

do $$
declare
  t text;
  tables text[] := array[
    'jobs',
    'payments',
    'expenses',
    'job_items',
    'job_timeline',
    'factory_jobs',
    'factory_messages',
    'mockups',
    'shipments',
    'customers',
    'factories',
    'inquiries',
    'catalog_items',
    'designs'
  ];
begin
  foreach t in array tables loop
    -- ข้ามถ้าตารางยังไม่มี (เผื่อบาง migration ยังไม่ได้รัน)
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception when duplicate_object then
        null; -- มีอยู่แล้ว ข้าม
      end;
    end if;
  end loop;
end $$;



-- =========================================================================
-- ==================== 0027_digest_recipients.sql ====================
-- =========================================================================
create table if not exists public.digest_recipients (
  id uuid primary key default gen_random_uuid(),
  name text,
  line_user_id text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists digest_recipients_active_idx
  on public.digest_recipients(is_active) where is_active = true;
alter table public.digest_recipients enable row level security;
drop policy if exists digest_recipients_all on public.digest_recipients;
create policy digest_recipients_all on public.digest_recipients
  for all to authenticated using (public.is_staff()) with check (public.is_staff());


-- =========================================================================
-- ==================== 0028_mockup_approval_checklist.sql ====================
-- =========================================================================
-- =========================================================================
-- 0028: Mockup approval checklist + liability agreement
-- ลูกค้าต้องตรวจสอบ โลโก้/ฟอนต์/สี/รายละเอียด และยอมรับข้อตกลง
-- ก่อนอนุมัติ  → เก็บเป็นหลักฐานว่าลูกค้ายืนยันแบบแล้ว
-- =========================================================================

-- เก็บผลการตรวจสอบของลูกค้า (logo/font/color/details/agreed)
alter table public.mockups
  add column if not exists checklist jsonb;

-- Recreate RPC เพื่อรับ checklist (ต้อง drop ก่อนเพราะเปลี่ยน signature)
drop function if exists public.submit_mockup_decision(text, text, text, text);

create or replace function public.submit_mockup_decision(
  p_token text,
  p_decision text,
  p_note text default null,
  p_name text default null,
  p_checklist jsonb default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_mockup record;
  v_new_status mockup_status;
begin
  if p_decision not in ('approve', 'reject') then
    return jsonb_build_object('ok', false, 'error', 'Invalid decision');
  end if;

  select * into v_mockup from public.mockups where approval_token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Mockup not found');
  end if;

  if v_mockup.status != 'awaiting_approval' then
    return jsonb_build_object('ok', false, 'error', 'Mockup is not awaiting approval');
  end if;

  if p_decision = 'reject' and (p_note is null or trim(p_note) = '') then
    return jsonb_build_object('ok', false, 'error', 'Comment required for changes request');
  end if;

  -- อนุมัติ: ต้องยอมรับข้อตกลง + ตรวจครบทุกข้อ
  if p_decision = 'approve' then
    if p_checklist is null
       or coalesce((p_checklist->>'agreed')::boolean, false) = false
       or coalesce((p_checklist->>'logo')::boolean, false) = false
       or coalesce((p_checklist->>'font')::boolean, false) = false
       or coalesce((p_checklist->>'color')::boolean, false) = false
       or coalesce((p_checklist->>'details')::boolean, false) = false
    then
      return jsonb_build_object('ok', false, 'error', 'กรุณาตรวจสอบให้ครบทุกข้อและยอมรับข้อตกลงก่อนอนุมัติ');
    end if;
  end if;

  v_new_status := case p_decision when 'approve' then 'approved'::mockup_status else 'rejected'::mockup_status end;

  update public.mockups
  set
    status = v_new_status,
    decision_note = nullif(trim(coalesce(p_note, '')), ''),
    decided_by_name = nullif(trim(coalesce(p_name, '')), ''),
    checklist = case when p_decision = 'approve' then p_checklist else checklist end,
    decided_at = now()
  where id = v_mockup.id;

  insert into public.job_timeline(job_id, event_type, description, metadata)
  values (
    v_mockup.job_id,
    'mockup_decision',
    case when p_decision = 'approve'
      then 'ลูกค้าอนุมัติ Mockup v' || v_mockup.version || ' (ตรวจสอบ โลโก้/ฟอนต์/สี/รายละเอียด ครบ)'
      else 'ลูกค้าขอแก้ไข Mockup v' || v_mockup.version || ': ' || coalesce(p_note, '')
    end,
    jsonb_build_object(
      'mockup_id', v_mockup.id,
      'version', v_mockup.version,
      'decision', p_decision,
      'decided_by_name', p_name,
      'checklist', p_checklist
    )
  );

  if p_decision = 'approve' then
    update public.jobs set status = 'sent_to_factory' where id = v_mockup.job_id and status in ('designing', 'awaiting_approval');
  else
    update public.jobs set status = 'designing' where id = v_mockup.job_id and status = 'awaiting_approval';
  end if;

  return jsonb_build_object('ok', true, 'status', v_new_status);
end $$;

grant execute on function public.submit_mockup_decision(text, text, text, text, jsonb) to anon, authenticated;

-- อัพเดท get_mockup_for_approval ให้ส่ง checklist กลับด้วย (แสดงเป็นหลักฐาน)
create or replace function public.get_mockup_for_approval(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'id', m.id,
    'job_code', j.job_code,
    'version', m.version,
    'title', m.title,
    'description', m.description,
    'status', m.status,
    'storage_paths', m.storage_paths,
    'decision_note', m.decision_note,
    'decided_at', m.decided_at,
    'decided_by_name', m.decided_by_name,
    'checklist', m.checklist,
    'created_at', m.created_at,
    'customer_name', c.name
  ) into result
  from public.mockups m
  join public.jobs j on j.id = m.job_id
  join public.customers c on c.id = j.customer_id
  where m.approval_token = p_token;
  return result;
end $$;

grant execute on function public.get_mockup_for_approval(text) to anon, authenticated;
