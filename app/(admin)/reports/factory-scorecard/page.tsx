import Link from "next/link";
import { ArrowLeft, Factory, Clock, CalendarCheck, FlaskConical } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type TLRow = { job_id: string; event_type: string; metadata: { to?: string } | null; created_at: string };
type JobRow = { id: string; factory_id: string | null; due_date: string | null; status: string };

export default async function FactoryScorecardPage() {
  const supabase = await createClient();
  const [{ data: factories }, { data: jobs }, { data: timeline }] = await Promise.all([
    supabase.from("factories").select("id, name"),
    supabase.from("jobs").select("id, factory_id, due_date, status"),
    supabase
      .from("job_timeline")
      .select("job_id, event_type, metadata, created_at")
      .in("event_type", ["status_changed", "sample_rejected"]),
  ]);

  const sent = new Map<string, number>();
  const done = new Map<string, number>();
  const rejects = new Map<string, number>();
  for (const ev of (timeline ?? []) as TLRow[]) {
    const ts = new Date(ev.created_at).getTime();
    if (ev.event_type === "sample_rejected") {
      rejects.set(ev.job_id, (rejects.get(ev.job_id) ?? 0) + 1);
      continue;
    }
    const to = ev.metadata?.to;
    if (to === "sent_to_factory") {
      if (!sent.has(ev.job_id) || ts < sent.get(ev.job_id)!) sent.set(ev.job_id, ts);
    } else if (to === "ready_to_ship" || to === "shipped" || to === "completed") {
      if (!done.has(ev.job_id) || ts < done.get(ev.job_id)!) done.set(ev.job_id, ts);
    }
  }

  type Row = { id: string; name: string; total: number; turns: number[]; onTime: number; measurable: number; rejects: number };
  const byFactory = new Map<string, Row>();
  for (const f of (factories ?? []) as { id: string; name: string }[]) {
    byFactory.set(f.id, { id: f.id, name: f.name, total: 0, turns: [], onTime: 0, measurable: 0, rejects: 0 });
  }
  for (const j of (jobs ?? []) as JobRow[]) {
    if (!j.factory_id) continue;
    const row = byFactory.get(j.factory_id);
    if (!row) continue;
    row.total++;
    row.rejects += rejects.get(j.id) ?? 0;
    const ts = sent.get(j.id);
    const td = done.get(j.id);
    if (ts && td) {
      row.turns.push((td - ts) / 86_400_000);
      if (j.due_date) {
        row.measurable++;
        if (td <= new Date(j.due_date + "T23:59:59").getTime()) row.onTime++;
      }
    }
  }

  const rows = Array.from(byFactory.values())
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
  const avg = (arr: number[]) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);

  return (
    <div className="container max-w-3xl space-y-5 p-3 sm:p-4 md:p-8">
      <Link href="/reports" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> รายงาน
      </Link>

      <header>
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
          <Factory className="h-6 w-6 text-violet-400" /> คะแนนโรงงาน (Scorecard)
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          วัดผลโรงงานจากข้อมูลจริง — ใช้เป็นหลักฐานคุยกับโรงงานด้วยตัวเลข (เถียงยาก)
        </p>
      </header>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูลงานที่ผูกกับโรงงาน</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const onTimePct = r.measurable > 0 ? Math.round((r.onTime / r.measurable) * 100) : null;
            const turnAvg = avg(r.turns);
            const pctColor =
              onTimePct === null ? "text-muted-foreground"
                : onTimePct >= 80 ? "text-emerald-400"
                : onTimePct >= 60 ? "text-amber-400"
                : "text-rose-400";
            return (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 font-semibold">
                      <Factory className="h-4 w-4 text-violet-400" /> {r.name}
                    </div>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{r.total} งาน</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <Metric
                      icon={<CalendarCheck className="h-4 w-4" />}
                      label="ส่งตรงเวลา"
                      value={onTimePct === null ? "—" : `${onTimePct}%`}
                      sub={onTimePct === null ? "ยังไม่มีข้อมูล" : `${r.onTime}/${r.measurable} งาน`}
                      valueClass={pctColor}
                    />
                    <Metric
                      icon={<Clock className="h-4 w-4" />}
                      label="turnaround เฉลี่ย"
                      value={turnAvg === null ? "—" : `${turnAvg.toFixed(1)} วัน`}
                      sub="ส่งโรงงาน→พร้อมส่ง"
                    />
                    <Metric
                      icon={<FlaskConical className="h-4 w-4" />}
                      label="ตัวอย่างตีกลับ"
                      value={`${r.rejects}`}
                      sub="ครั้ง"
                      valueClass={r.rejects > 0 ? "text-amber-400" : "text-emerald-400"}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        * &quot;ส่งตรงเวลา&quot; เทียบวันเสร็จจริงกับ &quot;กำหนดส่ง&quot; ที่บันทึกไว้ · ตัวเลขจะแม่นขึ้นเมื่อบันทึกข้อมูลครบทุกงาน
      </p>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  sub,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-2.5">
      <div className="mb-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        {icon} {label}
      </div>
      <div className={`text-lg font-bold ${valueClass ?? ""}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}
