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
