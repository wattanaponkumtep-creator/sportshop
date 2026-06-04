"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Factory, Copy, Check, Send, Loader2, MessageCircle, ExternalLink, MessageSquare, ListChecks } from "lucide-react";
import { cn, formatDateTH } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { PRODUCTION_STAGE_LABEL, FACTORY_MESSAGE_KIND_META } from "@/lib/constants";
import { replyToFactory, markFactoryMessagesRead } from "@/app/(admin)/jobs/factory-message-actions";
import type { FactoryMessage, JobItem } from "@/lib/types/database";

type Props = {
  jobId: string;
  jobCode: string;
  factoryJobId: string;
  factoryName: string;
  portalToken: string;
  messages: FactoryMessage[];
  items?: JobItem[];
};

export function FactoryCommunication({ jobId, jobCode, factoryJobId, factoryName, portalToken, messages, items = [] }: Props) {
  const [copied, setCopied] = useState(false);
  const [reply, setReply] = useState("");
  const [isPending, startTransition] = useTransition();

  const portalUrl =
    typeof window !== "undefined" ? `${window.location.origin}/factory/${portalToken}` : `/factory/${portalToken}`;

  const unreadFromFactory = messages.filter((m) => m.author === "factory" && !m.read_by_admin).length;

  const itemTotal = items.reduce((s, it) => s + (it.quantity ?? 1), 0);
  const itemProduced = items.filter((it) => it.produced).reduce((s, it) => s + (it.quantity ?? 1), 0);
  const itemPct = itemTotal > 0 ? Math.round((itemProduced / itemTotal) * 100) : 0;

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

  function shareLINE() {
    const text = `📦 งาน ${jobCode}\nคลิกลิงก์เพื่ออัพเดทสถานะการผลิต + ส่งข้อความถึงร้านได้เลย:\n${portalUrl}`;
    const url = `https://line.me/R/share?text=${encodeURIComponent(text)}`;
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
          <CardTitle className="inline-flex items-center gap-2 text-base">
            <Factory className="h-4 w-4 text-orange-400" />
            สื่อสารกับโรงงาน — {factoryName}
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

        {/* Portal link */}
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
          <div className="mb-2 text-xs font-semibold text-orange-300">🔗 ลิงก์สำหรับโรงงาน (ส่งให้โรงงานเปิด)</div>
          <div className="space-y-2">
            <Input
              value={portalUrl}
              readOnly
              onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
              className="font-mono text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={copyLink} variant="outline" className="flex-1">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copy แล้ว!" : "Copy ลิงก์"}
              </Button>
              <Button size="sm" onClick={shareLINE} className="flex-1 bg-[#06C755] text-white hover:bg-[#05a647]">
                <MessageCircle className="h-3.5 w-3.5" /> ส่งทาง LINE
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> เปิดดู
                </a>
              </Button>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            💡 โรงงานคลิกลิงก์เพื่ออัพเดทเปอร์เซ็นต์การผลิต + แจ้งปัญหา/คำถาม — ไม่ต้องสมัครสมาชิก
          </p>
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
