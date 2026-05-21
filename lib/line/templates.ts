import { JOB_STATUS_LABEL } from "@/lib/constants";
import type { JobStatus } from "@/lib/types/database";

export function buildStatusUpdateMessage(params: {
  jobCode: string;
  productType?: string | null;
  status: JobStatus;
  trackUrl: string;
}): string {
  const { jobCode, productType, status, trackUrl } = params;
  const statusText = JOB_STATUS_LABEL[status];

  const lines: string[] = [
    `📦 อัปเดตงาน ${jobCode}`,
    "",
  ];
  if (productType) lines.push(`📋 ${productType}`);
  lines.push(`🔔 สถานะ: ${statusText}`);
  lines.push("");

  const extraMessage = STATUS_EXTRA_MESSAGE[status];
  if (extraMessage) lines.push(extraMessage, "");

  lines.push(`🔗 ติดตามสถานะ: ${trackUrl}`);
  return lines.join("\n");
}

const STATUS_EXTRA_MESSAGE: Partial<Record<JobStatus, string>> = {
  received: "ทางร้านได้รับงานของคุณแล้ว เริ่มดำเนินการเร็ว ๆ นี้ ✨",
  designing: "กำลังออกแบบงานของคุณ 🎨",
  awaiting_approval: "มี Mockup ใหม่ส่งให้คุณอนุมัติแล้ว — เปิดลิงก์เพื่อดูและตอบกลับ",
  sent_to_factory: "ส่งงานเข้าโรงงานเรียบร้อย — รอผลิต 🏭",
  producing: "โรงงานกำลังผลิตเสื้อของคุณ 🧵",
  qc: "ตรวจสอบคุณภาพก่อนส่ง 🔍",
  ready_to_ship: "เสื้อพร้อมส่งแล้ว — รอจัดส่ง 📦",
  shipped: "ส่งของแล้ว! รอติดตามจากเลข Tracking ✈️",
  completed: "งานนี้เสร็จสมบูรณ์ — ขอบคุณที่ใช้บริการครับ 🙏",
  cancelled: "งานนี้ถูกยกเลิก — ติดต่อร้านหากมีข้อสงสัย",
};

export function buildMockupApprovalMessage(params: {
  jobCode: string;
  version: number;
  approveUrl: string;
}): string {
  return [
    `🎨 มี Mockup ใหม่ให้คุณดู`,
    ``,
    `งาน: ${params.jobCode}`,
    `Mockup v${params.version}`,
    ``,
    `กดลิงก์เพื่อดูและอนุมัติ:`,
    params.approveUrl,
  ].join("\n");
}
