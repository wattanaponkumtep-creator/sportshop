"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

type ChecklistItem = {
  id: string;
  title: string;
  hint?: string;
  time?: string;
};

const DEFAULT_ITEMS: ChecklistItem[] = [
  { id: "morning_check", title: "เช็คงานในระบบ + งานที่เลยกำหนด", time: "09:00", hint: "เปิด Dashboard ดูจำนวนงานวันนี้" },
  { id: "reply_msg", title: "ตอบ chat ลูกค้าใหม่ทุกช่อง", time: "09:30", hint: "LINE, FB, โทร — อย่าให้ลูกค้ารอ" },
  { id: "design_review", title: "ตรวจ Mockup งานที่รออนุมัติ", time: "10:30", hint: "ส่งให้ลูกค้ายืนยันแบบเร็วที่สุด" },
  { id: "factory_check", title: "เช็คสถานะโรงงาน — โทรถามความคืบหน้า", time: "13:30", hint: "งานที่อยู่ในขั้น 'ผลิต' / 'QC'" },
  { id: "shipping_prep", title: "ตรวจของก่อนจัดส่ง + ส่ง Tracking ลูกค้า", time: "15:00", hint: "ใช้ Pre-shipping Check ในหน้า JOB" },
  { id: "follow_up", title: "ส่ง follow-up ลูกค้าค้างชำระ", time: "16:00", hint: "ดูใน Reports → เงินรอเก็บ" },
  { id: "daily_summary", title: "สรุปยอดวันนี้ + บันทึกรายจ่าย", time: "17:30", hint: "ตรวจตัวเลขใน Reports" },
];

const STORAGE_KEY = "sportshop:daily-checklist";

function todayDateStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

type StoredState = { date: string; checked: Record<string, boolean> };

export function DailyChecklist() {
  const [collapsed, setCollapsed] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const today = todayDateStr();
      if (raw) {
        const parsed: StoredState = JSON.parse(raw);
        if (parsed.date === today) {
          setChecked(parsed.checked ?? {});
        } else {
          // new day, reset
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, checked: {} }));
          setChecked({});
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  function toggleItem(id: string) {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayDateStr(), checked: next }));
    } catch {
      // ignore
    }
  }

  const doneCount = Object.values(checked).filter(Boolean).length;
  const total = DEFAULT_ITEMS.length;
  const allDone = hydrated && doneCount === total;

  return (
    <Card className={cn("border-border", allDone && "border-emerald-500/40 bg-emerald-500/5")}>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <h3 className="text-sm font-semibold">รายการที่ต้องทำวันนี้</h3>
            <Badge variant={allDone ? "success" : "outline"} className="text-[10px]">
              {hydrated ? `${doneCount}/${total}` : `0/${total}`}
            </Badge>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>

        {!collapsed && (
          <div className="space-y-1.5">
            {DEFAULT_ITEMS.map((item) => {
              const isChecked = !!checked[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-md border border-border bg-card/40 p-2.5 text-left transition",
                    "hover:border-primary/40",
                    isChecked && "border-emerald-500/30 bg-emerald-500/5"
                  )}
                >
                  {isChecked ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                  ) : (
                    <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-medium", isChecked && "text-muted-foreground line-through")}>
                        {item.title}
                      </span>
                      {item.time && (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {item.time}
                        </Badge>
                      )}
                    </div>
                    {item.hint && (
                      <div className="mt-0.5 text-xs text-muted-foreground">{item.hint}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!collapsed && allDone && (
          <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-center text-xs font-medium text-emerald-400">
            🎉 ทำครบทุกข้อแล้ว!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
