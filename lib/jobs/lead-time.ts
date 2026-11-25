// =========================================================================
// คำนวณเวลาส่งมอบ + ประเมินความเป็นไปได้ (อิงข้อมูลจริง + buffer)
// ตัวเลขตั้งต้นจากการวิเคราะห์งานจริง — ปรับได้ภายหลัง
// =========================================================================

export type Feasibility = "ok" | "rush" | "tight" | "no_date";

// เวลารวม (รับงาน → ส่งมอบ) ตามจำนวน — รวม buffer แล้ว
const TIERS: { maxQty: number; days: number }[] = [
  { maxQty: 60, days: 21 }, // 1–60 ตัว ~20–22 วัน
  { maxQty: 100, days: 35 }, // 61–100 ~35 วัน
  { maxQty: Number.MAX_SAFE_INTEGER, days: 45 }, // 100+ เคสต่อเคส (ตั้งต้น 45)
];

export const RUSH_SURCHARGE_PCT = 25;

export function estimateLeadDays(qty: number): number {
  const q = Math.max(0, Math.round(qty || 0));
  const tier = TIERS.find((t) => q <= t.maxQty) ?? TIERS[TIERS.length - 1];
  return tier.days;
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export type LeadAssessment = {
  leadDays: number;
  suggestedDate: Date;
  minFloorDays: number;
  feasibility: Feasibility;
  daysAvailable: number | null;
};

/**
 * ประเมินเวลาส่ง + ว่าทันวันที่ลูกค้าต้องการใช้ไหม
 * - ok: ส่งทันปกติ
 * - rush: ด่วน (เวลาน้อยกว่าปกติ แต่ยังเกินขั้นต่ำสุด)
 * - tight: กระชั้นเกินไป (ต่ำกว่าขั้นต่ำสุด → แนะนำปฏิเสธ/เลื่อน)
 */
export function assessLeadTime(
  qty: number,
  receivedAt: Date,
  neededBy: Date | null,
): LeadAssessment {
  const leadDays = estimateLeadDays(qty);
  const suggestedDate = addDays(receivedAt, leadDays);
  const minFloorDays = Math.max(5, Math.ceil(leadDays * 0.5));

  if (!neededBy) {
    return { leadDays, suggestedDate, minFloorDays, feasibility: "no_date", daysAvailable: null };
  }

  const daysAvailable = Math.round((neededBy.getTime() - receivedAt.getTime()) / 86_400_000);
  let feasibility: Feasibility;
  if (daysAvailable >= leadDays) feasibility = "ok";
  else if (daysAvailable >= minFloorDays) feasibility = "rush";
  else feasibility = "tight";

  return { leadDays, suggestedDate, minFloorDays, feasibility, daysAvailable };
}
