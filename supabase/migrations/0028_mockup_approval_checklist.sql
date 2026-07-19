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
