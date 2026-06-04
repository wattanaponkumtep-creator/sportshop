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
        'filename', filename,
        'size_bytes', size_bytes,
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
