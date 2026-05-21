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
