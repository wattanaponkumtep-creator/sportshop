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
