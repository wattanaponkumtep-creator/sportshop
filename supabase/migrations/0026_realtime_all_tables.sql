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
