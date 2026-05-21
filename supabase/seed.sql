-- Seed: example factories (run after first login so RLS allows insert)
insert into public.factories (name, strengths, lead_time_days, quality_score, base_price, notes) values
  ('โรงงาน A - ปทุมธานี', 'พิมพ์ซับลิเมชั่นคุณภาพสูง สีสด', 10, 8.5, 180, 'งานออเดอร์ใหญ่ราคาดี ขั้นต่ำ 20 ตัว'),
  ('โรงงาน B - นนทบุรี', 'งานเร่ง 5 วันเสร็จ ตัวอย่างเร็ว', 5, 7.5, 220, 'รับงานด่วน แต่ราคาสูงกว่าตลาด ~15%'),
  ('โรงงาน C - สมุทรปราการ', 'งานเย็บประณีต ผ้าเกรดพรีเมียม', 14, 9.0, 250, 'เหมาะกับทีมระดับสโมสร')
on conflict do nothing;
