"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Sun, Coffee, Briefcase, Users, Factory as FactoryIcon, Moon, Sparkles } from "lucide-react";

type ScheduleItem = {
  time: string;
  title: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
};

const SCHEDULE: ScheduleItem[] = [
  {
    time: "09:00",
    title: "เริ่มต้นวัน",
    detail: "เปิด Dashboard ดูงานทั้งหมด + งานเลยกำหนด",
    icon: Sun,
    color: "text-amber-400",
  },
  {
    time: "09:30",
    title: "ตอบ Chat ลูกค้า",
    detail: "เช็ค LINE / FB / โทรที่ไม่ได้รับ — ตอบให้หมดก่อนเที่ยง",
    icon: Coffee,
    color: "text-orange-400",
  },
  {
    time: "10:30",
    title: "งานออกแบบ",
    detail: "ทำ Mockup งานใหม่ + ส่งให้ลูกค้าอนุมัติ",
    icon: Sparkles,
    color: "text-purple-400",
  },
  {
    time: "13:00",
    title: "เช็คโรงงาน",
    detail: "โทรถามความคืบหน้างานที่อยู่ขั้น 'ผลิต' / 'QC'",
    icon: FactoryIcon,
    color: "text-blue-400",
  },
  {
    time: "14:30",
    title: "ติดตามลูกค้า",
    detail: "โทร/LINE ตามใบเสนอราคา + เก็บมัดจำ",
    icon: Users,
    color: "text-cyan-400",
  },
  {
    time: "15:30",
    title: "ตรวจของก่อนส่ง",
    detail: "ใช้ Pre-shipping Check ในแต่ละ JOB",
    icon: Briefcase,
    color: "text-emerald-400",
  },
  {
    time: "17:30",
    title: "สรุปวัน",
    detail: "เช็คยอดขาย + บันทึกรายจ่าย + วางแผนพรุ่งนี้",
    icon: Moon,
    color: "text-indigo-400",
  },
];

function getCurrentTimeIndex(): number {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentMins = hour * 60 + minute;

  for (let i = SCHEDULE.length - 1; i >= 0; i--) {
    const [h, m] = SCHEDULE[i].time.split(":").map(Number);
    if (currentMins >= h * 60 + m) return i;
  }
  return -1;
}

export function DailySchedule() {
  const [collapsed, setCollapsed] = useState(false);
  const currentIdx = getCurrentTimeIndex();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📅</span>
            <h3 className="text-sm font-semibold">ตารางทำงานแนะนำวันนี้</h3>
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
          <div className="relative space-y-2 border-l-2 border-border pl-4">
            {SCHEDULE.map((item, idx) => {
              const Icon = item.icon;
              const isCurrent = idx === currentIdx;
              const isPast = idx < currentIdx;
              return (
                <div
                  key={item.time}
                  className={`relative rounded-md border p-2.5 transition ${
                    isCurrent
                      ? "border-primary/40 bg-primary/5"
                      : isPast
                      ? "border-border bg-card/30 opacity-60"
                      : "border-border bg-card/40"
                  }`}
                >
                  <div
                    className={`absolute -left-[21px] top-3 flex h-4 w-4 items-center justify-center rounded-full ${
                      isCurrent ? "bg-primary ring-2 ring-primary/30" : "bg-card border border-border"
                    }`}
                  >
                    <div className={`h-2 w-2 rounded-full ${isCurrent ? "bg-primary-foreground" : "bg-muted-foreground"}`} />
                  </div>
                  <div className="flex items-start gap-2">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${item.color}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">{item.time}</span>
                        <span className="text-sm font-medium">{item.title}</span>
                        {isCurrent && <span className="text-[10px] text-primary">● ตอนนี้</span>}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{item.detail}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
