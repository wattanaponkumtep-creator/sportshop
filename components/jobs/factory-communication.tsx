"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Factory, Copy, Check, Send, Loader2, MessageCircle, ExternalLink, MessageSquare, ListChecks, FileText } from "lucide-react";
import { cn, formatDateTH, formatThaiFullDate } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { PRODUCTION_STAGE_LABEL, FACTORY_MESSAGE_KIND_META, PRIORITY_BANNER, PRIORITY_LABEL, PRIORITY_COLOR } from "@/lib/constants";
import { replyToFactory, markFactoryMessagesRead } from "@/app/(admin)/jobs/factory-message-actions";
import type { FactoryMessage, JobItem, PriorityLevel } from "@/lib/types/database";

type Props = {
  jobId: string;
  jobCode: string;
  jobLabel?: string | null;
  productType?: string | null;
  priority?: PriorityLevel;
  productionOptions?: string[];
  dueDate?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  shopName?: string | null;
  factoryJobId: string;
  factoryName: string;
  portalToken: string;
  messages: FactoryMessage[];
  items?: JobItem[];
};

export function FactoryCommunication({
  jobId,
  jobCode,
  jobLabel,
  productType,
  priority = "normal",
  productionOptions = [],
  dueDate,
  customerName,
  customerPhone,
  deliveryAddress,
  shopName,
  factoryJobId,
  factoryName,
  portalToken,
  messages,
  items = [],
}: Props) {
  const [copied, setCopied] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [reply, setReply] = useState("");
  const [isPending, startTransition] = useTransition();

  const portalUrl =
    typeof window !== "undefined" ? `${window.location.origin}/factory/${portalToken}` : `/factory/${portalToken}`;

  const unreadFromFactory = messages.filter((m) => m.author === "factory" && !m.read_by_admin).length;

  const itemTotal = items.reduce((s, it) => s + (it.quantity ?? 1), 0);
  const itemProduced = items.filter((it) => it.produced).reduce((s, it) => s + (it.quantity ?? 1), 0);
  const itemPct = itemTotal > 0 ? Math.round((itemProduced / itemTotal) * 100) : 0;

  // สรุปจำนวนตามประเภทสินค้า (สำหรับใบสั่งงาน)
  const typeSummary = (() => {
    const m = new Map<string, number>();
    for (const it of items) {
      const t = (it.item_type ?? "").trim() || "ไม่ระบุประเภท";
      m.set(t, (m.get(t) ?? 0) + (it.quantity ?? 1));
    }
    return Array.from(m.entries());
  })();

  // ---------- สร้างข้อความใบสั่งงานครบ ----------
  function buildBriefMessage(): string {
    const lines: (string | null)[] = [
      `🏭 ใบสั่งงาน — ${shopName ?? "SportShop"}`,
      "━━━━━━━━━━━━━━━━━━",
    ];

    // Priority banner — เด่นๆ บนสุด (เฉพาะ urgent/rush ทำกรอบเด่น)
    if (priority === "rush" || priority === "urgent") {
      lines.push("");
      lines.push(PRIORITY_BANNER[priority]);
      lines.push("");
    }

    lines.push(`📋 งาน: ${jobCode}`);
    lines.push(jobLabel ? `📦 ${jobLabel}` : productType ? `📦 ${productType}` : null);
    lines.push("");

    if (dueDate) {
      const urgentMark = priority === "rush" ? " ‼️" : priority === "urgent" ? " ❗" : "";
      lines.push(`📅 ลูกค้าต้องการใช้: ${formatThaiFullDate(dueDate)}${urgentMark}`);
      lines.push("");
    }

    if (itemTotal > 0) {
      lines.push(`👕 จำนวนผลิต: ${itemTotal} ตัว`);
      if (typeSummary.length > 1) {
        for (const [type, count] of typeSummary) {
          lines.push(`   • ${type}: ${count} ตัว`);
        }
      }
      lines.push("");
    }

    if (productionOptions.length > 0) {
      lines.push("🧵 ออปชั่นการผลิต:");
      for (const opt of productionOptions) {
        lines.push(`   ✔️ ${opt}`);
      }
      lines.push("");
    }

    if (customerName) {
      lines.push(`👤 ลูกค้า: ${customerName}${customerPhone ? ` (${customerPhone})` : ""}`);
    }
    if (deliveryAddress?.trim()) {
      lines.push(`📍 ที่อยู่จัดส่ง:`);
      lines.push(deliveryAddress.trim());
    }

    lines.push("");
    lines.push("━━━━━━━━━━━━━━━━━━");
    lines.push("🔗 รายละเอียดงาน + รายชื่อ/ไซส์ + ใบงาน + แบบเสื้อ:");
    lines.push(portalUrl);
    lines.push("");
    lines.push("👆 คลิกลิงก์เพื่อดูรายละเอียดครบ + อัพเดทสถานะ + แจ้งปัญหากลับมาได้เลยครับ");

    return lines.filter((l) => l !== null).join("\n");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      toast({ title: "Copy ลิงก์แล้ว — ส่งให้โรงงานได้เลย" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy ไม่สำเร็จ — ใช้วิธี select + copy", variant: "destructive" });
    }
  }

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(buildBriefMessage());
      setCopiedBrief(true);
      toast({ title: "Copy ใบสั่งงานแล้ว — paste ใน LINE ได้เลย ✅" });
      setTimeout(() => setCopiedBrief(false), 2000);
    } catch {
      toast({ title: "Copy ไม่สำเร็จ", variant: "destructive" });
    }
  }

  function shareBriefLINE() {
    const url = `https://line.me/R/share?text=${encodeURIComponent(buildBriefMessage())}`;
    window.open(url, "_blank");
  }

  function handleReply() {
    if (!reply.trim()) {
      toast({ title: "กรุณาใส่ข้อความ", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const res = await replyToFactory({
        factory_job_id: factoryJobId,
        job_id: jobId,
        message: reply,
      });
      if (res.ok) {
        toast({ title: "ส่งข้อความถึงโรงงานแล้ว ✅" });
        setReply("");
      } else {
        toast({ title: "ส่งไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  function handleMarkRead() {
    startTransition(async () => {
      const res = await markFactoryMessagesRead(factoryJobId, jobId);
      if (res.ok) toast({ title: "ทำเครื่องหมายอ่านแล้ว" });
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="inline-flex flex-wrap items-center gap-2 text-base">
            <Factory className="h-4 w-4 text-orange-400" />
            สื่อสารกับโรงงาน — {factoryName}
            {priority !== "normal" && (
              <Badge className={PRIORITY_COLOR[priority]}>
                {priority === "rush" ? "🚨 " : "⚠️ "}{PRIORITY_LABEL[priority]}
              </Badge>
            )}
            {unreadFromFactory > 0 && (
              <Badge className="bg-rose-500/20 text-rose-300">{unreadFromFactory} ข้อความใหม่</Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Production checklist progress */}
        {itemTotal > 0 && (
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                <ListChecks className="h-3.5 w-3.5" /> เช็คลิสต์การผลิต (โรงงานติ๊ก)
              </span>
              <Badge className={cn(itemPct === 100 ? "bg-emerald-500/30 text-emerald-200" : "bg-cyan-500/20 text-cyan-200")}>
                {itemProduced} / {itemTotal} ตัว ({itemPct}%)
              </Badge>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full transition-all", itemPct === 100 ? "bg-emerald-400" : "bg-cyan-400")}
                style={{ width: `${itemPct}%` }}
              />
            </div>
          </div>
        )}

        {/* ใบสั่งงาน — ส่งข้อความครบให้โรงงานทีเดียว */}
        <div className="rounded-lg border-2 border-orange-500/40 bg-orange-500/5 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-orange-300">
            <FileText className="h-4 w-4" /> ส่งใบสั่งงานให้โรงงาน
          </div>

          {/* Preview ข้อความ */}
          <pre className="mb-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-card/60 p-2.5 font-sans text-[11px] leading-relaxed text-foreground/90">
            {buildBriefMessage()}
          </pre>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={shareBriefLINE} className="flex-1 bg-[#06C755] text-white hover:bg-[#05a647]">
              <MessageCircle className="h-3.5 w-3.5" /> ส่งทาง LINE
            </Button>
            <Button size="sm" onClick={copyBrief} variant="outline" className="flex-1">
              {copiedBrief ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedBrief ? "Copy แล้ว!" : "Copy ข้อความ"}
            </Button>
          </div>

          {(!dueDate || !deliveryAddress?.trim()) && (
            <p className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-200">
              💡 ใส่{!dueDate ? " กำหนดส่ง" : ""}{!dueDate && !deliveryAddress?.trim() ? " และ" : ""}
              {!deliveryAddress?.trim() ? " ที่อยู่จัดส่ง" : ""} ใน tab &quot;รายละเอียด&quot; เพื่อให้ข้อความครบขึ้น
            </p>
          )}
        </div>

        {/* Portal link (compact) */}
        <div className="rounded-lg border border-border bg-card/40 p-3">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">🔗 ลิงก์โรงงาน (ถ้าอยากส่งแค่ลิงก์)</div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={portalUrl}
              readOnly
              onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
              className="flex-1 font-mono text-xs"
            />
            <Button size="sm" onClick={copyLink} variant="outline">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>

        {/* Message thread */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4 text-cyan-400" /> ประวัติการสนทนา ({messages.length})
            </div>
            {unreadFromFactory > 0 && (
              <Button size="sm" variant="ghost" onClick={handleMarkRead} disabled={isPending}>
                ทำเครื่องหมายอ่านแล้ว
              </Button>
            )}
          </div>

          {messages.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              ยังไม่มีข้อความ — ส่งลิงก์ให้โรงงานแล้วรอเขาอัพเดท
            </div>
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto rounded-md border border-border bg-muted/20 p-3">
              {messages.map((m) => (
                <AdminMessageBubble key={m.id} message={m} factoryName={factoryName} />
              ))}
            </div>
          )}
        </div>

        {/* Reply box */}
        <div className="space-y-2">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            placeholder="พิมพ์ตอบโรงงาน..."
            className="text-sm"
          />
          <Button onClick={handleReply} disabled={isPending} className="w-full sm:w-auto">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isPending ? "กำลังส่ง..." : "ส่งตอบโรงงาน"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminMessageBubble({ message, factoryName }: { message: FactoryMessage; factoryName: string }) {
  const fromFactory = message.author === "factory";
  const meta = FACTORY_MESSAGE_KIND_META[message.kind];
  const unread = fromFactory && !message.read_by_admin;
  return (
    <div className={cn("flex", fromFactory ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg border p-2.5 text-sm",
          fromFactory
            ? "border-cyan-500/40 bg-cyan-500/10"
            : "border-orange-500/40 bg-orange-500/10",
          unread && "ring-2 ring-rose-400/60",
        )}
      >
        <div className="mb-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>{meta.emoji}</span>
          <span className="font-semibold">
            {fromFactory ? (message.author_name || factoryName) : (message.author_name || "ร้าน")}
          </span>
          <span>•</span>
          <span>{formatDateTH(message.created_at, "d MMM yy HH:mm")}</span>
          {unread && <Badge className="ml-1 h-4 bg-rose-500/30 px-1 text-[9px] text-rose-200">ใหม่</Badge>}
        </div>
        {message.kind === "progress" && message.stage ? (
          <div className="font-medium">
            📊 อัพเดท <span className="text-cyan-400">{PRODUCTION_STAGE_LABEL[message.stage]}</span> = <span className="font-mono">{message.progress_value}%</span>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{message.message ?? meta.label}</div>
        )}
      </div>
    </div>
  );
}
