"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Send, MessageCircle, MessageSquare, Phone, Copy, Check, Info } from "lucide-react";
import { JOB_STATUS_LABEL } from "@/lib/constants";
import type { JobStatus } from "@/lib/types/database";
import { toast } from "@/components/ui/use-toast";

const STATUS_MESSAGES: Partial<Record<JobStatus, string>> = {
  received: "ทางร้านได้รับงานของคุณแล้วครับ จะเริ่มดำเนินการเร็ว ๆ นี้ ✨",
  designing: "กำลังออกแบบ Mockup ให้ครับ จะส่งให้ดูเร็ว ๆ นี้ 🎨",
  awaiting_approval: "ส่ง Mockup ให้ดูแล้วครับ รบกวนเปิดลิงก์เพื่ออนุมัติด้วยนะครับ",
  sent_to_factory: "ส่งงานเข้าโรงงานเรียบร้อยครับ 🏭 ใช้เวลาผลิต ~7-14 วัน",
  producing: "โรงงานกำลังผลิตอยู่ครับ จะอัปเดตเป็นระยะ 🧵",
  qc: "ตรวจสอบคุณภาพก่อนส่งครับ 🔍",
  ready_to_ship: "เสื้อพร้อมส่งแล้วครับ! รบกวนยืนยันที่อยู่จัดส่งด้วยนะครับ 📦",
  shipped: "จัดส่งแล้วครับ ✈️ จะส่งเลข Tracking ตามมา",
  completed: "งานเสร็จสมบูรณ์แล้วครับ ขอบคุณที่ใช้บริการ 🙏",
};

type Channel = {
  channel_type: string;
  external_id: string | null;
  display_name: string | null;
};

export function NotifyCustomerDialog({
  jobCode,
  productType,
  status,
  trackToken,
  customerName,
  phone,
  channels,
}: {
  jobCode: string;
  productType: string | null;
  status: JobStatus;
  trackToken: string;
  customerName: string;
  phone: string | null;
  channels: Channel[];
}) {
  const [open, setOpen] = useState(false);

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const trackUrl = `${siteUrl}/track/${trackToken}`;

  const defaultMessage = [
    `📦 อัปเดตงาน ${jobCode}`,
    "",
    productType ? `📋 ${productType}` : null,
    `🔔 สถานะ: ${JOB_STATUS_LABEL[status]}`,
    "",
    STATUS_MESSAGES[status] ?? "อัปเดตสถานะงานของคุณครับ",
    "",
    `🔗 ติดตามได้ที่: ${trackUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const [message, setMessage] = useState(defaultMessage);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast({ title: "Copy แล้ว — paste ใน chat ได้เลย" });
    setTimeout(() => setCopied(false), 2000);
  }

  function openLineShare() {
    const encoded = encodeURIComponent(message);
    // LINE share URL — opens LINE app to pick recipient
    const url = `https://line.me/R/msg/text/?${encoded}`;
    window.open(url, "_blank");
  }

  function openMessenger() {
    const fbChannels = channels.filter((c) => c.channel_type === "fb" || c.channel_type === "fb_page");
    if (fbChannels.length === 0) {
      toast({ title: "ลูกค้ายังไม่ได้เชื่อม Facebook", variant: "destructive" });
      return;
    }
    // Copy message first, then open chat
    navigator.clipboard.writeText(message);
    toast({ title: "Copy ข้อความแล้ว — paste ใน Messenger ที่เปิดให้" });
    const id = fbChannels[0].external_id;
    const url = id ? `https://m.me/${id}` : "https://m.me/";
    window.open(url, "_blank");
  }

  function openSMS() {
    if (!phone) {
      toast({ title: "ลูกค้าไม่มีเบอร์โทร", variant: "destructive" });
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    const encoded = encodeURIComponent(message);
    const url = `sms:${cleanPhone}?body=${encoded}`;
    window.location.href = url;
  }

  function openWhatsApp() {
    if (!phone) {
      toast({ title: "ลูกค้าไม่มีเบอร์โทร", variant: "destructive" });
      return;
    }
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "66" + cleanPhone.slice(1); // TH country code
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, "_blank");
  }

  function callPhone() {
    if (!phone) return;
    window.location.href = `tel:${phone.replace(/\D/g, "")}`;
  }

  const hasLine = channels.some((c) => c.channel_type === "line" || c.channel_type === "line_oa");
  const hasFB = channels.some((c) => c.channel_type === "fb" || c.channel_type === "fb_page");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Send className="h-4 w-4" /> แจ้งลูกค้า
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>แจ้งลูกค้า — {customerName}</DialogTitle>
          <DialogDescription>
            <span className="inline-flex items-center gap-1 text-xs">
              <Info className="h-3 w-3" />
              เลือกแอปส่งจากด้านล่าง → แอปจะเปิดพร้อมข้อความ → กดส่ง
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">ข้อความที่จะส่ง (แก้ได้)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={9}
              className="text-xs"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{message.length} ตัวอักษร</span>
              <button
                type="button"
                onClick={() => setMessage(defaultMessage)}
                className="hover:text-foreground"
              >
                รีเซ็ตเป็นค่าเริ่มต้น
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">เลือกช่องทางส่ง</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {/* LINE - always available (share dialog lets pick recipient) */}
              <Button
                variant="outline"
                onClick={openLineShare}
                className="justify-start border-green-500/30 hover:border-green-500/60 hover:bg-green-500/5"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-500/15">
                  <MessageCircle className="h-4 w-4 text-green-400" />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm">LINE</span>
                  <span className="text-[10px] text-muted-foreground">
                    {hasLine ? "เปิดแอป + เลือกลูกค้า" : "เปิดแอป + เลือกคนรับ"}
                  </span>
                </div>
              </Button>

              {/* WhatsApp (uses phone) */}
              {phone && (
                <Button
                  variant="outline"
                  onClick={openWhatsApp}
                  className="justify-start border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/5"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/15">
                    <MessageCircle className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm">WhatsApp</span>
                    <span className="text-[10px] text-muted-foreground">{phone}</span>
                  </div>
                </Button>
              )}

              {/* Messenger (if customer has FB linked) */}
              {hasFB && (
                <Button
                  variant="outline"
                  onClick={openMessenger}
                  className="justify-start border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/5"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/15">
                    <MessageSquare className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm">Messenger</span>
                    <span className="text-[10px] text-muted-foreground">Copy + เปิดแอป</span>
                  </div>
                </Button>
              )}

              {/* SMS */}
              {phone && (
                <Button
                  variant="outline"
                  onClick={openSMS}
                  className="justify-start"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500/15">
                    <MessageSquare className="h-4 w-4 text-orange-400" />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm">SMS</span>
                    <span className="text-[10px] text-muted-foreground">{phone}</span>
                  </div>
                </Button>
              )}

              {/* Call */}
              {phone && (
                <Button
                  variant="outline"
                  onClick={callPhone}
                  className="justify-start"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/15">
                    <Phone className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm">โทร</span>
                    <span className="text-[10px] text-muted-foreground">{phone}</span>
                  </div>
                </Button>
              )}

              {/* Copy */}
              <Button
                variant="outline"
                onClick={handleCopy}
                className={`justify-start ${copied ? "border-emerald-500/60 bg-emerald-500/5" : ""}`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm">Copy</span>
                  <span className="text-[10px] text-muted-foreground">paste ที่อื่นได้</span>
                </div>
              </Button>
            </div>

            {!hasLine && !hasFB && !phone && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">
                ⚠️ ลูกค้าคนนี้ยังไม่มีข้อมูลติดต่อใด ๆ — ไปที่โปรไฟล์ลูกค้าเพื่อเพิ่ม LINE / Facebook / เบอร์โทรก่อน
              </div>
            )}
          </div>

          <details className="rounded-md border border-border bg-card/30 p-3 text-xs">
            <summary className="cursor-pointer font-medium">💡 วิธีใช้แต่ละช่องทาง</summary>
            <ul className="mt-3 space-y-1.5 text-muted-foreground">
              <li>
                <strong className="text-foreground">LINE:</strong> เปิด LINE app → เลือกห้องแชทกับลูกค้า → กดส่ง
              </li>
              <li>
                <strong className="text-foreground">WhatsApp:</strong> เปิด chat กับเบอร์ลูกค้าทันที → กดส่ง
              </li>
              <li>
                <strong className="text-foreground">Messenger:</strong> ข้อความถูก copy ให้แล้ว → paste ในแอป Messenger
              </li>
              <li>
                <strong className="text-foreground">SMS:</strong> เปิดแอป SMS พร้อมข้อความ → กดส่ง
              </li>
            </ul>
          </details>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>ปิด</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
