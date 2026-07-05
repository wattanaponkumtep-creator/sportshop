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
