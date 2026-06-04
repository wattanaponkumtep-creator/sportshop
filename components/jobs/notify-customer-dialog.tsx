"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Send, MessageCircle, MessageSquare, Phone, Copy, Check, Info, Wallet, Sparkles } from "lucide-react";
import { JOB_STATUS_LABEL } from "@/lib/constants";
import type { JobStatus } from "@/lib/types/database";
import { formatBaht, cn } from "@/lib/utils";
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

// Statuses where bundling a payment request feels natural:
//   - received: ask for deposit before starting
//   - ready_to_ship: ask for balance before shipping
//   - completed: final receipt / settle remaining
const NATURAL_PAYMENT_STATUSES: JobStatus[] = ["received", "ready_to_ship", "completed"];

type Preset = "deposit" | "balance" | "full" | "custom";

const PRESET_META: Record<Preset, { label: string; tone: string }> = {
  deposit: { label: "💰 มัดจำ 50%", tone: "ขอมัดจำเริ่มงาน" },
  balance: { label: "💵 ที่ค้าง", tone: "ส่วนที่เหลือก่อนส่งของ" },
  full: { label: "💯 เต็มจำนวน", tone: "ขอเต็มจำนวนรวด" },
  custom: { label: "✏️ กำหนดเอง", tone: "ระบุยอดเอง" },
};

function suggestPresetForStatus(status: JobStatus, totalPaid: number): Preset {
  if (status === "received" && totalPaid === 0) return "deposit";
  if (status === "ready_to_ship" || status === "completed") return "balance";
  return "deposit";
}

type Channel = {
  channel_type: string;
  external_id: string | null;
  display_name: string | null;
};

type ShopInfo = {
  shop_name: string | null;
  bank_info: string | null;
};

export function NotifyCustomerDialog({
  jobCode,
  jobLabel,
  productType,
  status,
  trackToken,
  customerName,
  phone,
  channels,
  salePrice,
  totalPaid,
  shopInfo,
}: {
  jobCode: string;
  jobLabel?: string | null;
  productType: string | null;
  status: JobStatus;
  trackToken: string;
  customerName: string;
  phone: string | null;
  channels: Channel[];
  salePrice?: number;
  totalPaid?: number;
  shopInfo?: ShopInfo | null;
}) {
  const [open, setOpen] = useState(false);

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const trackUrl = `${siteUrl}/track/${trackToken}`;

  // Payment context
  const sale = Number(salePrice ?? 0);
  const paid = Number(totalPaid ?? 0);
  const outstanding = Math.max(0, sale - paid);
  const hasOutstanding = outstanding > 0;
  const isNaturalForPayment = NATURAL_PAYMENT_STATUSES.includes(status);

  // Smart default: include payment if there's outstanding AND status is "natural"
  const [includePayment, setIncludePayment] = useState(hasOutstanding && isNaturalForPayment);
  const [preset, setPreset] = useState<Preset>(suggestPresetForStatus(status, paid));
  const [depositPct, setDepositPct] = useState(50);
  const [customAmount, setCustomAmount] = useState(outstanding.toString());

  const requestedAmount = useMemo(() => {
    switch (preset) {
      case "deposit":
        return Math.round((sale * depositPct) / 100);
      case "balance":
        return outstanding;
      case "full":
        return sale;
      case "custom":
        return Math.max(0, Number(customAmount) || 0);
    }
  }, [preset, sale, outstanding, depositPct, customAmount]);

  // Status part of message
  const statusBlock = useMemo(
    () =>
      [
        `📦 อัปเดตงาน ${jobCode}`,
        "",
        jobLabel ? `📌 ${jobLabel}` : null,
        productType ? `📋 ${productType}` : null,
        `🔔 สถานะ: ${JOB_STATUS_LABEL[status]}`,
        "",
        STATUS_MESSAGES[status] ?? "อัปเดตสถานะงานของคุณครับ",
        "",
        `🔗 ติดตามได้ที่: ${trackUrl}`,
      ]
        .filter((l) => l !== null)
        .join("\n"),
    [jobCode, jobLabel, productType, status, trackUrl],
  );

  // Payment block — only built if includePayment + hasOutstanding
  const paymentBlock = useMemo(() => {
    if (!includePayment || !hasOutstanding) return "";
    const lines: string[] = [];
    lines.push("━━━━━━━━━━━━━━━━━━");
    if (preset === "deposit" && paid === 0) {
      lines.push(`💰 ขอมัดจำ: ${formatBaht(requestedAmount)} (${depositPct}% จาก ${formatBaht(sale)})`);
    } else if (preset === "balance") {
      lines.push(`💵 ขอเก็บส่วนที่เหลือ: ${formatBaht(requestedAmount)}`);
      if (paid > 0) lines.push(`(ยอดรวม ${formatBaht(sale)} • ชำระแล้ว ${formatBaht(paid)})`);
    } else if (preset === "full") {
      lines.push(`💯 ขอเก็บเต็มจำนวน: ${formatBaht(requestedAmount)}`);
    } else {
      lines.push(`💰 ขอเก็บ: ${formatBaht(requestedAmount)}`);
    }
    lines.push("");
    lines.push("💳 ช่องทางชำระ:");
    if (shopInfo?.bank_info?.trim()) {
      lines.push(shopInfo.bank_info.trim());
    } else {
      lines.push("(ยังไม่ได้ตั้งข้อมูลบัญชี — Settings → ข้อมูลร้าน)");
    }
    lines.push("");
    lines.push("📩 หลังโอนกรุณาส่งสลิปกลับมาด้วยครับ");
    return lines.join("\n");
  }, [includePayment, hasOutstanding, preset, paid, sale, requestedAmount, depositPct, shopInfo]);

  const defaultMessage = paymentBlock ? `${statusBlock}\n\n${paymentBlock}` : statusBlock;

  const [message, setMessage] = useState(defaultMessage);
  const [messageDirty, setMessageDirty] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-sync message when user changes preset/checkbox AND hasn't edited manually
  if (!messageDirty && message !== defaultMessage) {
    setMessage(defaultMessage);
  }

  function handleCopy() {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast({ title: "Copy แล้ว — paste ใน chat ได้เลย" });
    setTimeout(() => setCopied(false), 2000);
  }

  function openLineShare() {
    const encoded = encodeURIComponent(message);
    window.open(`https://line.me/R/msg/text/?${encoded}`, "_blank");
  }

  function openMessenger() {
    const fbChannels = channels.filter((c) => c.channel_type === "fb" || c.channel_type === "fb_page");
    if (fbChannels.length === 0) {
      toast({ title: "ลูกค้ายังไม่ได้เชื่อม Facebook", variant: "destructive" });
      return;
    }
    navigator.clipboard.writeText(message);
    toast({ title: "Copy ข้อความแล้ว — paste ใน Messenger ที่เปิดให้" });
    const id = fbChannels[0].external_id;
    window.open(id ? `https://m.me/${id}` : "https://m.me/", "_blank");
  }

  function openSMS() {
    if (!phone) {
      toast({ title: "ลูกค้าไม่มีเบอร์โทร", variant: "destructive" });
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    window.location.href = `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;
  }

  function openWhatsApp() {
    if (!phone) {
      toast({ title: "ลูกค้าไม่มีเบอร์โทร", variant: "destructive" });
      return;
    }
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "66" + cleanPhone.slice(1);
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank");
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
          {/* Include payment checkbox (only if there's outstanding) */}
          {hasOutstanding && (
            <div
              className={cn(
                "rounded-lg border p-3 transition",
                includePayment
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-border bg-card/40",
              )}
            >
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={includePayment}
                  onChange={(e) => {
                    setIncludePayment(e.target.checked);
                    setMessageDirty(false);
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                    <Wallet className="h-3.5 w-3.5 text-emerald-400" />
                    รวมแจ้งขอเก็บเงิน ({formatBaht(outstanding)} ค้าง)
                    {isNaturalForPayment && (
                      <Badge className="bg-amber-500/20 text-[10px] text-amber-300">
                        <Sparkles className="mr-0.5 h-2.5 w-2.5" /> แนะนำ
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {isNaturalForPayment
                      ? `สถานะ "${JOB_STATUS_LABEL[status]}" เป็นจังหวะที่เหมาะแจ้งชำระ`
                      : "ติ๊กเพื่อรวมข้อมูลชำระเงินในข้อความเดียวกัน"}
                  </div>
                </div>
              </label>

              {/* Preset selector + amount config */}
              {includePayment && (
                <div className="mt-3 space-y-2 border-t border-emerald-500/20 pt-3">
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {(Object.keys(PRESET_META) as Preset[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPreset(p);
                          setMessageDirty(false);
                        }}
                        className={cn(
                          "rounded-md border-2 px-2 py-1.5 text-[11px] transition",
                          preset === p
                            ? "border-emerald-400 bg-emerald-500/15 font-semibold"
                            : "border-border bg-card/60 text-muted-foreground hover:border-emerald-400/40",
                        )}
                      >
                        {PRESET_META[p].label}
                      </button>
                    ))}
                  </div>

                  {preset === "deposit" && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">มัดจำ:</span>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={depositPct}
                        onChange={(e) => {
                          setDepositPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)));
                          setMessageDirty(false);
                        }}
                        className="h-7 w-16 text-center"
                      />
                      <span className="text-muted-foreground">% =</span>
                      <span className="font-mono font-bold text-emerald-400">{formatBaht(requestedAmount)}</span>
                    </div>
                  )}
                  {preset === "custom" && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">จำนวน:</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={customAmount}
                        onChange={(e) => {
                          setCustomAmount(e.target.value);
                          setMessageDirty(false);
                        }}
                        className="h-7 flex-1"
                      />
                      <span className="text-xs text-muted-foreground">บาท</span>
                    </div>
                  )}

                  {!shopInfo?.bank_info?.trim() && (
                    <div className="rounded border border-amber-500/30 bg-amber-500/10 p-1.5 text-[10px] text-amber-200">
                      ⚠️ ยังไม่ได้ตั้งข้อมูลบัญชี — ไปที่ <strong>Settings → ข้อมูลร้าน</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">ข้อความที่จะส่ง (แก้ได้)</Label>
            <Textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setMessageDirty(true);
              }}
              rows={includePayment ? 14 : 9}
              className="text-xs"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{message.length} ตัวอักษร</span>
              <button
                type="button"
                onClick={() => {
                  setMessage(defaultMessage);
                  setMessageDirty(false);
                }}
                className="hover:text-foreground"
              >
                รีเซ็ตเป็นค่าเริ่มต้น
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">เลือกช่องทางส่ง</Label>
            <div className="grid gap-2 sm:grid-cols-2">
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

              {phone && (
                <Button variant="outline" onClick={openSMS} className="justify-start">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500/15">
                    <MessageSquare className="h-4 w-4 text-orange-400" />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm">SMS</span>
                    <span className="text-[10px] text-muted-foreground">{phone}</span>
                  </div>
                </Button>
              )}

              {phone && (
                <Button variant="outline" onClick={callPhone} className="justify-start">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/15">
                    <Phone className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm">โทร</span>
                    <span className="text-[10px] text-muted-foreground">{phone}</span>
                  </div>
                </Button>
              )}

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
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>ปิด</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
