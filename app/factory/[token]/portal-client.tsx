"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Palette, Printer, Scissors, Truck, MessageSquare, AlertTriangle, CheckCircle2, HelpCircle, Send, Loader2 } from "lucide-react";
import { cn, formatDateTH } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { PRODUCTION_STAGE_LABEL, FACTORY_MESSAGE_KIND_META } from "@/lib/constants";
import { postFactoryMessage, updateFactoryStage } from "./actions";
import type { FactoryMessage, FactoryMessageKind, FactoryProductionStage } from "@/lib/types/database";

const STAGES: { key: FactoryProductionStage; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { key: "layout", icon: Palette, color: "text-purple-400" },
  { key: "print", icon: Printer, color: "text-orange-400" },
  { key: "sew", icon: Scissors, color: "text-blue-400" },
  { key: "ship", icon: Truck, color: "text-emerald-400" },
];

const QUICK_VALUES = [0, 25, 50, 75, 100];

const MESSAGE_PRESETS: { kind: FactoryMessageKind; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { kind: "issue", icon: AlertTriangle, label: "แจ้งปัญหา" },
  { kind: "question", icon: HelpCircle, label: "ถามคำถาม" },
  { kind: "complete", icon: CheckCircle2, label: "ทำเสร็จแล้ว" },
  { kind: "text", icon: MessageSquare, label: "ข้อความทั่วไป" },
];

type Props = {
  token: string;
  factoryName: string;
  stages: Record<FactoryProductionStage, number>;
  messages: FactoryMessage[];
};

const NAME_KEY = "factory-portal-author-name";

export function FactoryPortalClient({ token, factoryName, stages: initialStages, messages }: Props) {
  const [stages, setStages] = useState(initialStages);
  const [name, setName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(NAME_KEY) ?? "";
  });
  const [isPending, startTransition] = useTransition();

  function persistName(v: string) {
    setName(v);
    if (typeof window !== "undefined") window.localStorage.setItem(NAME_KEY, v);
  }

  function setStage(key: FactoryProductionStage, value: number) {
    const prev = stages[key];
    setStages((s) => ({ ...s, [key]: value })); // optimistic
    startTransition(async () => {
      const res = await updateFactoryStage(token, key, value, name);
      if (res.ok) {
        toast({ title: `อัพเดท ${PRODUCTION_STAGE_LABEL[key]} = ${value}% แล้ว ✅` });
      } else {
        setStages((s) => ({ ...s, [key]: prev }));
        toast({ title: "ไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  return (
    <>
      {/* Name input — persistent */}
      <Card>
        <CardContent className="space-y-1.5 p-3 sm:p-4">
          <Label htmlFor="author" className="text-xs">ชื่อผู้บันทึก (ไม่บังคับ — แต่ช่วยให้ร้านรู้ว่าใครอัพเดท)</Label>
          <Input
            id="author"
            value={name}
            onChange={(e) => persistName(e.target.value)}
            placeholder="เช่น พี่แดง (ฝ่ายผลิต)"
            className="text-sm"
          />
        </CardContent>
      </Card>

      {/* Production stages */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📊 อัพเดทขั้นตอนการผลิต</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {STAGES.map((s) => {
            const Icon = s.icon;
            const value = stages[s.key];
            return (
              <div key={s.key} className="space-y-2 rounded-lg border border-border bg-card/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", s.color)} />
                    <span className="text-sm font-medium">{PRODUCTION_STAGE_LABEL[s.key]}</span>
                  </div>
                  <span className={cn("font-mono text-lg font-bold", value === 100 ? "text-emerald-400" : value > 0 ? "text-cyan-400" : "text-muted-foreground")}>
                    {value}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full transition-all", value === 100 ? "bg-emerald-400" : "bg-cyan-400")}
                    style={{ width: `${value}%` }}
                  />
                </div>
                {/* Quick value buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_VALUES.map((v) => (
                    <Button
                      key={v}
                      type="button"
                      variant={value === v ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStage(s.key, v)}
                      disabled={isPending}
                      className="h-7 flex-1 text-xs"
                    >
                      {v}%
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
          <p className="text-center text-[11px] text-muted-foreground">
            💡 กดตัวเลขเปอร์เซ็นต์เพื่ออัพเดท — ร้านจะเห็นทันที
          </p>
        </CardContent>
      </Card>

      {/* Message thread */}
      <MessagePanel token={token} factoryName={factoryName} authorName={name} messages={messages} />
    </>
  );
}

function MessagePanel({
  token,
  factoryName,
  authorName,
  messages,
}: {
  token: string;
  factoryName: string;
  authorName: string;
  messages: FactoryMessage[];
}) {
  const [selectedKind, setSelectedKind] = useState<FactoryMessageKind>("text");
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    if (!text.trim() && selectedKind !== "complete") {
      toast({ title: "กรุณาใส่ข้อความ", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const res = await postFactoryMessage(token, selectedKind, text, authorName);
      if (res.ok) {
        toast({ title: "ส่งข้อความให้ร้านแล้ว ✅" });
        setText("");
        setSelectedKind("text");
      } else {
        toast({ title: "ส่งไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">💬 ส่งข้อความถึงร้าน</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Message kind selector */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MESSAGE_PRESETS.map((p) => {
            const Icon = p.icon;
            const meta = FACTORY_MESSAGE_KIND_META[p.kind];
            const active = selectedKind === p.kind;
            return (
              <button
                key={p.kind}
                type="button"
                onClick={() => setSelectedKind(p.kind)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-lg border-2 p-2.5 text-xs transition",
                  active
                    ? `border-primary ${meta.color}`
                    : "border-border bg-card/40 text-muted-foreground hover:border-primary/40",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{p.label}</span>
              </button>
            );
          })}
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={
            selectedKind === "issue" ? "เช่น ผ้าหมดสต็อค คาดว่าจะส่งช้า 2 วัน..."
            : selectedKind === "question" ? "เช่น สีดำเข้มแค่ไหน? มีตัวอย่างให้ดูมั้ย?"
            : selectedKind === "complete" ? "หมายเหตุ (ไม่บังคับ) — เช่น เตรียมไว้ให้รับวันพรุ่งนี้"
            : "พิมพ์ข้อความ..."
          }
          className="text-sm"
        />

        <Button onClick={handleSend} disabled={isPending} className="w-full">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {isPending ? "กำลังส่ง..." : "ส่งให้ร้าน"}
        </Button>

        {/* Message history */}
        {messages.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            <div className="text-xs font-semibold text-muted-foreground">ประวัติการสนทนา</div>
            <div className="space-y-2">
              {messages.slice().reverse().map((m) => (
                <MessageBubble key={m.id} message={m} factoryName={factoryName} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MessageBubble({ message, factoryName }: { message: FactoryMessage; factoryName: string }) {
  const fromFactory = message.author === "factory";
  const meta = FACTORY_MESSAGE_KIND_META[message.kind];
  return (
    <div className={cn("flex", fromFactory ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg border p-2.5 text-sm",
          fromFactory ? "border-cyan-500/40 bg-cyan-500/10" : "border-orange-500/40 bg-orange-500/10",
        )}
      >
        <div className="mb-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>{meta.emoji}</span>
          <span className="font-medium">
            {fromFactory ? (message.author_name || factoryName) : "ร้าน"}
          </span>
          <span>•</span>
          <span>{formatDateTH(message.created_at, "d MMM HH:mm")}</span>
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
