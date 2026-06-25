import type { ChannelType, FactoryJobStatus, FileKind, JobStatus, MockupStatus, PaymentType, PriorityLevel, ShipmentStatus } from "@/lib/types/database";

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  received: "รับงาน",
  designing: "ออกแบบ",
  awaiting_approval: "รออนุมัติ",
  sent_to_factory: "ส่งโรงงาน",
  producing: "ผลิต",
  qc: "QC",
  ready_to_ship: "พร้อมส่ง",
  shipped: "ส่งแล้ว",
  completed: "ปิดงาน",
  cancelled: "ยกเลิก",
};

export const JOB_STATUS_ORDER: JobStatus[] = [
  "received",
  "designing",
  "awaiting_approval",
  "sent_to_factory",
  "producing",
  "qc",
  "ready_to_ship",
  "shipped",
  "completed",
];

export const JOB_STATUS_COLOR: Record<JobStatus, string> = {
  received: "bg-slate-500/20 text-slate-200 border-slate-500/40",
  designing: "bg-blue-500/20 text-blue-200 border-blue-500/40",
  awaiting_approval: "bg-amber-500/20 text-amber-200 border-amber-500/40",
  sent_to_factory: "bg-purple-500/20 text-purple-200 border-purple-500/40",
  producing: "bg-indigo-500/20 text-indigo-200 border-indigo-500/40",
  qc: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40",
  ready_to_ship: "bg-teal-500/20 text-teal-200 border-teal-500/40",
  shipped: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
  completed: "bg-green-600/30 text-green-100 border-green-600/40",
  cancelled: "bg-red-500/20 text-red-200 border-red-500/40",
};

export const CHANNEL_LABEL: Record<ChannelType, string> = {
  phone: "โทรศัพท์",
  line: "LINE ส่วนตัว",
  line_oa: "LINE OA",
  fb: "Facebook ส่วนตัว",
  fb_page: "Facebook Page",
  other: "อื่น ๆ",
};

export const PRIORITY_LABEL: Record<PriorityLevel, string> = {
  normal: "ปกติ",
  urgent: "ด่วน",
  rush: "ด่วนมาก",
};

export const PRIORITY_COLOR: Record<PriorityLevel, string> = {
  normal: "bg-slate-600 text-white",
  urgent: "bg-amber-500 text-white",
  rush: "bg-red-500 text-white",
};

// ใช้ในข้อความแจ้งโรงงาน — banner เด่นๆ บอกความด่วน
export const PRIORITY_BANNER: Record<PriorityLevel, string> = {
  normal: "🟢 งานปกติ",
  urgent: "🟠⚠️ งานด่วน — รบกวนเร่งให้หน่อยครับ ⚠️🟠",
  rush: "🔴🚨 ด่วนมาก!! ต้องรีบที่สุด 🚨🔴",
};

export const FACTORY_STATUS_LABEL: Record<FactoryJobStatus, string> = {
  sent: "ส่งไฟล์แล้ว",
  producing: "กำลังผลิต",
  sewing: "กำลังเย็บ",
  qc: "QC",
  returned: "ส่งกลับร้านแล้ว",
};

export const FILE_KIND_LABEL: Record<FileKind, string> = {
  artwork: "ไฟล์อาร์ตเวิร์ก",
  mockup: "Mockup",
  slip: "สลิป",
  reference: "อ้างอิง",
  other: "อื่น ๆ",
};

export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  deposit: "มัดจำ",
  full: "ชำระเต็ม",
  refund: "คืนเงิน",
};

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  preparing: "เตรียมจัดส่ง",
  shipped: "ส่งออกแล้ว",
  in_transit: "อยู่ระหว่างขนส่ง",
  delivered: "ส่งถึงแล้ว",
  returned: "ตีกลับ",
};

export const MOCKUP_STATUS_LABEL: Record<MockupStatus, string> = {
  draft: "ฉบับร่าง",
  awaiting_approval: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ขอแก้ไข",
};

export const MOCKUP_STATUS_COLOR: Record<MockupStatus, string> = {
  draft: "bg-slate-500/20 text-slate-200 border-slate-500/40",
  awaiting_approval: "bg-amber-500/20 text-amber-200 border-amber-500/40",
  approved: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
  rejected: "bg-red-500/20 text-red-200 border-red-500/40",
};

// ---------- Sizes (CS → 10XL) ----------
// ลำดับไซส์มาตรฐานของร้าน — ใช้ร่วมกันทุก component (size summary, receiving, factory portal)
export const SIZE_ORDER = [
  "CS",   // เด็กเล็ก
  "CM",   // เด็กกลาง
  "CL",   // เด็กโต
  "XS",
  "SS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL",
  "4XL",
  "5XL",
  "6XL",
  "7XL",
  "8XL",
  "9XL",
  "10XL",
] as const;

const SIZE_INDEX: Record<string, number> = Object.fromEntries(
  SIZE_ORDER.map((s, i) => [s, i]),
);

/** Normalize a size string: trim + uppercase + map common variants */
export function normalizeSize(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = raw.trim().toUpperCase();
  // common variants → canonical
  s = s
    .replace(/^XXL$/, "2XL")
    .replace(/^XXXL$/, "3XL")
    .replace(/^XXXXL$/, "4XL")
    .replace(/\s+/g, "");
  // "2XL" style: if it's like "XXL...", convert repeated X
  const repeatX = s.match(/^(X{2,})L$/);
  if (repeatX) s = `${repeatX[1].length}XL`;
  return s;
}

/** Sort size strings by the canonical SIZE_ORDER; unknowns go last alphabetically */
export function sortSizes(sizes: string[]): string[] {
  return sizes.slice().sort((a, b) => {
    const ai = SIZE_INDEX[a.toUpperCase()] ?? Infinity;
    const bi = SIZE_INDEX[b.toUpperCase()] ?? Infinity;
    if (ai !== bi) return ai - bi;
    return a.localeCompare(b);
  });
}

// ---------- Design Library ----------
function indexBy<T, K extends keyof T, V extends keyof T>(
  arr: readonly T[],
  keyField: K,
  valueField: V,
): Record<string, T[V]> {
  return Object.fromEntries(arr.map((x) => [x[keyField] as unknown as string, x[valueField]]));
}

export const SPORT_TYPES = [
  { value: "football", label: "⚽ ฟุตบอล" },
  { value: "basketball", label: "🏀 บาสเก็ตบอล" },
  { value: "volleyball", label: "🏐 วอลเลย์บอล" },
  { value: "badminton", label: "🏸 แบดมินตัน" },
  { value: "rugby", label: "🏉 รักบี้" },
  { value: "running", label: "🏃 วิ่ง / มาราธอน" },
  { value: "takraw", label: "🥎 ตะกร้อ" },
  { value: "esports", label: "🎮 E-Sports" },
  { value: "polo", label: "👕 เสื้อโปโล" },
  { value: "other", label: "✨ อื่นๆ" },
] as const;

export const SPORT_LABEL = indexBy(SPORT_TYPES, "value", "label");

export const DESIGN_COLOR_OPTIONS = [
  { value: "red", label: "แดง", hex: "#ef4444" },
  { value: "orange", label: "ส้ม", hex: "#f97316" },
  { value: "yellow", label: "เหลือง", hex: "#eab308" },
  { value: "green", label: "เขียว", hex: "#22c55e" },
  { value: "cyan", label: "ฟ้า", hex: "#06b6d4" },
  { value: "blue", label: "น้ำเงิน", hex: "#3b82f6" },
  { value: "purple", label: "ม่วง", hex: "#a855f7" },
  { value: "pink", label: "ชมพู", hex: "#ec4899" },
  { value: "black", label: "ดำ", hex: "#0f172a" },
  { value: "white", label: "ขาว", hex: "#f8fafc" },
  { value: "gray", label: "เทา", hex: "#64748b" },
  { value: "brown", label: "น้ำตาล", hex: "#92400e" },
] as const;

export const DESIGN_COLOR_HEX = indexBy(DESIGN_COLOR_OPTIONS, "value", "hex");
export const DESIGN_COLOR_LABEL = indexBy(DESIGN_COLOR_OPTIONS, "value", "label");

// ---------- Item Type Presets (for roster editor) ----------
export const ITEM_TYPE_PRESETS = [
  // เฉพาะเสื้อ (แยกตามแขน)
  "เสื้อแขนสั้น",
  "เสื้อแขนยาว",
  "เสื้ออย่างเดียว",
  // เสื้อ+กางเกง (แยกตามแขน)
  "เสื้อแขนสั้น+กางเกง",
  "เสื้อแขนยาว+กางเกง",
  "เสื้อ+กางเกง",
  // ครบชุด
  "เสื้อ+กางเกง+ถุงเท้า",
  // เฉพาะอย่างอื่น
  "กางเกงอย่างเดียว",
  "ถุงเท้า",
  "ปลอกแขน",
  "อื่นๆ",
] as const;

// ---------- Expense Categories (เงินออก) ----------
export const EXPENSE_CATEGORIES = [
  { value: "factory",   label: "จ่ายโรงงาน",   emoji: "🏭", color: "text-orange-400" },
  { value: "material",  label: "ค่าวัสดุ/ผ้า",  emoji: "🧵", color: "text-cyan-400" },
  { value: "shipping",  label: "ค่าขนส่ง",      emoji: "🚚", color: "text-blue-400" },
  { value: "rent",      label: "ค่าเช่า",       emoji: "🏠", color: "text-purple-400" },
  { value: "salary",    label: "เงินเดือน/ค่าแรง", emoji: "👥", color: "text-emerald-400" },
  { value: "marketing", label: "การตลาด/โฆษณา", emoji: "📣", color: "text-pink-400" },
  { value: "utility",   label: "ค่าน้ำ/ไฟ/เน็ต", emoji: "💡", color: "text-amber-400" },
  { value: "equipment", label: "อุปกรณ์/เครื่องมือ", emoji: "🛠️", color: "text-slate-400" },
  { value: "other",     label: "อื่นๆ",         emoji: "📦", color: "text-muted-foreground" },
] as const;

export const EXPENSE_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.value, c.label]),
);
export const EXPENSE_CATEGORY_EMOJI: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.value, c.emoji]),
);

// ---------- Production Options / Add-ons (สั่งโรงงาน) ----------
// จัดกลุ่มให้เลือกง่าย — เลือกหลายอย่าง + พิมพ์เพิ่มเองได้
export const PRODUCTION_OPTION_GROUPS = [
  {
    group: "ปกเสื้อ",
    options: ["ปกธรรมดา (ซับลิเมชั่น)", "ปกทอ", "ปกสำเร็จรูป", "ปกลูกฟูก", "ปกถัก"],
  },
  {
    group: "ปลายแขน",
    options: ["ต่อปลายแขนธรรมดา", "ต่อปลายแขนลูกฟูก", "ต่อปลายแขนทอ"],
  },
  {
    group: "โลโก้ / ตรา",
    options: ["โลโก้ปัก", "โลโก้ 3D (ยาง/ซิลิโคน)", "โลโก้รีด (Heat Transfer)", "เลขปัก", "ชื่อปัก"],
  },
  {
    group: "อื่นๆ",
    options: ["กระเป๋า", "ซิป", "ผ้าตาข่ายใต้วงแขน", "สกรีนสปอนเซอร์"],
  },
] as const;

// แบนรวมทุก option (ใช้ใน datalist autocomplete)
export const PRODUCTION_OPTION_PRESETS = PRODUCTION_OPTION_GROUPS.flatMap((g) => g.options);

// ---------- Factory Portal ----------
export const PRODUCTION_STAGE_LABEL: Record<string, string> = {
  layout: "เลย์เอ้าท์/ดีไซน์",
  print: "พิมพ์ลาย",
  sew: "ตัดเย็บ",
  ship: "เตรียมส่ง",
};

export const FACTORY_MESSAGE_KIND_META: Record<string, { label: string; emoji: string; color: string }> = {
  text: { label: "ข้อความ", emoji: "💬", color: "bg-slate-500/20 text-slate-200 border-slate-500/40" },
  progress: { label: "อัพเดทขั้นตอน", emoji: "📊", color: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40" },
  issue: { label: "แจ้งปัญหา", emoji: "🚨", color: "bg-rose-500/20 text-rose-200 border-rose-500/40" },
  complete: { label: "เสร็จแล้ว", emoji: "✅", color: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40" },
  question: { label: "คำถาม", emoji: "❓", color: "bg-amber-500/20 text-amber-200 border-amber-500/40" },
};
