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
