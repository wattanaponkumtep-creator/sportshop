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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Send, MessageCircle, MessageSquare, Phone, Copy, Check, Wallet, Info, ChevronDown } from "lucide-react";
import { formatBaht } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

type Channel = {
  channel_type: string;
  external_id: string | null;
  display_name: string | null;
};

type ShopInfo = {
  shop_name: string | null;
  phone: string | null;
  bank_info: string | null;
};

type Preset = "deposit" | "balance" | "full" | "custom";

const PRESET_META: Record<Preset, { label: string; description: string }> = {
  deposit: { label: "💰 ขอมัดจำ", description: "ขอมัดจำเริ่มงาน (ปกติ 50%)" },
  balance: { label: "💵 ขอส่วนที่เหลือ", description: "ขอส่วนที่ค้างจ่ายทั้งหมด" },
  full: { label: "💯 ขอเต็มจำนวน", description: "ขอเต็มจำนวนรวด" },
  custom: { label: "✏️ กำหนดเอง", description: "ระบุยอดเอง" },
};

type Props = {
  jobCode: string;
  jobLabel: string | null;
  trackToken: string;
  customerName: string;
  phone: string | null;
  channels: Channel[];
  salePrice: number;
  totalPaid: number;
  shopInfo: ShopInfo | null;
};

export function PaymentRequestDialog({
  jobCode,
  jobLabel,
  trackToken,
  customerName,
  phone,
  channels,
  salePrice,
  totalPaid,
  shopInfo,
}: Props) {
  const [open, setOpen] = useState(false);
  const outstanding = Math.max(0, salePrice - totalPaid);

  const [preset, setPreset] = useState<Preset>(outstanding > 0 && totalPaid === 0 ? "deposit" : "balance");
  const [customAmount, setCustomAmount] = useState<string>(outstanding.toString());
  const [depositPct, setDepositPct] = useState<number>(50);
  const [copied, setCopied] = useState(false);

  const requestedAmount = useMemo(() => {
    switch (preset) {
      case "deposit":
        return Math.round((salePrice * depositPct) / 100);
      case "balance":
        return outstanding;
      case "full":
        return salePrice;
      case "custom":
        return Math.max(0, Number(customAmount) || 0);
    }
  }, [preset, salePrice, outstanding, depositPct, customAmount]);

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const trackUrl = `${siteUrl}/track/${trackToken}`;

  const defaultMessage = useMemo(() => {
    const lines: (string | null)[] = [
      `💰 แจ้งชำระเงิน — งาน ${jobCode}`,
      jobLabel ? `📦 ${jobLabel}` : null,
      "",
      `ยอดที่ขอเก็บ: ${formatBaht(requestedAmount)}`,
    ];

    if (preset === "deposit" && totalPaid === 0) {
      lines.push(`(มัดจำ ${depositPct}% จาก ${formatBaht(salePrice)})`);
    } else if (preset === "balance" && totalPaid > 0) {
      lines.push(`(ยอดรวม ${formatBaht(salePrice)} • ชำระแล้ว ${formatBaht(totalPaid)})`);
    }

    lines.push("");
    lines.push("💳 ช่องทางชำระ:");
    if (shopInfo?.bank_info?.trim()) {
      lines.push(shopInfo.bank_info.trim());
    } else {
      lines.push("(ยังไม่ได้ตั้งค่าข้อมูลบัญชี — ไป Settings → ข้อมูลร้าน)");
    }

    lines.push("");
    lines.push("📩 หลังโอนกรุณาส่งสลิปกลับมาด้วยครับ");
    lines.push(`🔗 ดูสถานะงาน: ${trackUrl}`);
    if (shopInfo?.shop_name) {
      lines.push("");
      lines.push(`ขอบคุณครับ — ${shopInfo.shop_name}`);
    }

    return lines.filter((l) => l !== null).join("\n");
  }, [jobCode, jobLabel, requestedAmount, preset, totalPaid, salePrice, depositPct, shopInfo, trackUrl]);

  const [message, setMessage] = useState(defaultMessage);

  // Reset message when preset changes
  useState(() => {
    setMessage(defaultMessage);
  });
  const [messageDirty, setMessageDirty] = useState(false);
  if (!messageDirty && message !== defaultMessage) {
    // Only auto-update if user hasn't edited yet
    setMessage(defaultMessage);
  }

  function handleCopy() {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast({ title: "Copy ข้อความแล้ว ✅" });
    setTimeout(() => setCopied(false), 2000);
  }

  function openLine() {
    const lineChannel = channels.find(
      (c) => (c.channel_type === "line" || c.channel_type === "line_oa") && c.external_id,
    );
    if (lineChannel?.external_id) {
      handleCopy();
      window.open(`https://line.me/R/ti/p/${lineChannel.external_id}`, "_blank");
    } else {
      handleCopy();
      window.open(`https://line.me/R/share?text=${encodeURIComponent(message)}`, "_blank");
    }
  }

  function openSMS() {
    if (!phone) {
      toast({ title: "ลูกค้าไม่มีเบอร์โทร", variant: "destructive" });
      return;
    }
    handleCopy();
    window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
  }

  function openCall() {
    if (!phone) {
      toast({ title: "ลูกค้าไม่มีเบอร์โทร", variant: "destructive" });
      return;
    }
    window.location.href = `tel:${phone}`;
  }

  const lineId = channels.find((c) => c.channel_type === "line" || c.channel_type === "line_oa")?.external_id;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10">
          <Wallet className="h-4 w-4" /> แจ้งขอชำระเงิน
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-400" /> แจ้งขอชำระเงิน — {customerName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 rounded-md border border-border bg-muted/30 p-3 text-center">
            <div>
              <div className="text-[10px] text-muted-foreground">ยอดรวม</div>
              <div className="font-mono text-sm font-bold">{formatBaht(salePrice)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">ชำระแล้ว</div>
              <div className="font-mono text-sm font-bold text-emerald-400">{formatBaht(totalPaid)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">คงเหลือ</div>
              <div className={`font-mono text-sm font-bold ${outstanding > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                {formatBaht(outstanding)}
              </div>
            </div>
          </div>

          {/* Preset selector */}
          <div className="space-y-2">
            <Label className="text-xs">เลือกประเภทการขอเก็บ</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(PRESET_META) as Preset[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPreset(p);
                    setMessageDirty(false);
                  }}
                  className={`rounded-md border-2 p-2 text-left text-xs transition ${
                    preset === p
                      ? "border-emerald-400 bg-emerald-500/10"
                      : "border-border bg-card/40 hover:border-emerald-400/40"
                  }`}
                >
                  <div className="font-semibold">{PRESET_META[p].label}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{PRESET_META[p].description}</div>
                </button>
              ))}
            </div>

            {/* Sub-options based on preset */}
            {preset === "deposit" && (
              <div className="flex items-center gap-2 rounded-md border border-border bg-card/40 p-2">
                <Label className="text-xs whitespace-nowrap">มัดจำ:</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={depositPct}
                  onChange={(e) => {
                    setDepositPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)));
                    setMessageDirty(false);
                  }}
                  className="h-8 w-20"
                />
                <span className="text-xs">% = </span>
                <span className="font-mono text-sm font-bold text-emerald-400">{formatBaht(requestedAmount)}</span>
              </div>
            )}
            {preset === "custom" && (
              <div className="flex items-center gap-2 rounded-md border border-border bg-card/40 p-2">
                <Label className="text-xs whitespace-nowrap">จำนวนเงิน (บาท):</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setMessageDirty(false);
                  }}
                  className="h-8 flex-1"
                />
              </div>
            )}
          </div>

          {/* Warning if no bank info */}
          {!shopInfo?.bank_info?.trim() && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-200">
              <Info className="mr-1 inline h-3 w-3" /> ยังไม่ได้ตั้งข้อมูลบัญชีธนาคาร — ไปเพิ่มที่ <strong>Settings → ข้อมูลร้าน</strong>
            </div>
          )}

          {/* Message editor */}
          <div className="space-y-1.5">
            <Label className="text-xs">ข้อความที่จะส่ง (แก้ไขได้)</Label>
            <Textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setMessageDirty(true);
              }}
              rows={10}
              className="font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              💡 ข้อความจะ reset เมื่อเปลี่ยน preset — แก้แล้วจะคงไว้
            </p>
          </div>

          {/* Channels available */}
          {channels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
              <Info className="h-3 w-3" /> ลูกค้ามี:
              {channels.map((c, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">
                  {c.channel_type}{c.display_name ? `: ${c.display_name}` : ""}
                </Badge>
              ))}
            </div>
          )}

          {/* Quick send buttons */}
          <div className="space-y-2">
            <Label className="text-xs">ส่งผ่าน</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button onClick={handleCopy} variant="outline" className="w-full">
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copy แล้ว!" : "Copy"}
              </Button>
              <Button onClick={openLine} className="w-full bg-[#06C755] text-white hover:bg-[#05a647]">
                <MessageCircle className="h-4 w-4" />
                {lineId ? "LINE" : "แชร์ LINE"}
              </Button>
              <Button onClick={openSMS} disabled={!phone} variant="outline" className="w-full">
                <MessageSquare className="h-4 w-4" /> SMS
              </Button>
              <Button onClick={openCall} disabled={!phone} variant="outline" className="w-full">
                <Phone className="h-4 w-4" /> โทร
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>ปิด</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
