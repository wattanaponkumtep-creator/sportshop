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
