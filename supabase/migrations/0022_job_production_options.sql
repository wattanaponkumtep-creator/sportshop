-- =========================================================================
-- ออปชั่นการผลิต (production options / add-ons)
-- เช่น ปกทอ, ปกสำเร็จ, ปกลูกฟูก, ต่อปลายแขน, โลโก้ 3D ฯลฯ
-- เก็บเป็น text[] — มี preset + พิมพ์เพิ่มเองได้
-- =========================================================================

alter table public.jobs
  add column if not exists production_options text[] not null default '{}';

comment on column public.jobs.production_options is 'ออปชั่นการผลิตที่สั่งโรงงาน เช่น ปกทอ, โลโก้ 3D, ต่อปลายแขน';
