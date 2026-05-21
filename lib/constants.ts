import type { ChannelType, FactoryJobStatus, FileKind, JobStatus, PaymentType, PriorityLevel, ShipmentStatus } from "@/lib/types/database";

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
