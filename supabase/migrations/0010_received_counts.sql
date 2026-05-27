-- ระบบตรวจรับเสื้อจากโรงงาน
-- เก็บจำนวนที่นับได้จริง แยกตามประเภท + ไซส์ (JSONB)
-- รูปแบบ: { "เป็นชุด": { "M": 5, "L": 10 }, "เฉพาะเสื้อ": { "M": 3 } }

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS received_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS received_check_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_check_note TEXT;
