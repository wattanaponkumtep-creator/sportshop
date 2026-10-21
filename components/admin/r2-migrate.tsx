"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CloudUpload, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

type Result = {
  ok: boolean;
  total?: number;
  migrated?: number;
  skipped?: number;
  failed?: number;
  remaining?: number;
  done?: boolean;
  error?: string;
  errors?: string[];
};

export function R2Migrate() {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [last, setLast] = useState<Result | null>(null);
  const [finished, setFinished] = useState(false);

  async function run() {
    setRunning(true);
    setFinished(false);
    setLog([]);
    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    let rounds = 0;
    for (;;) {
      rounds++;
      let r: Result;
      try {
        const res = await fetch("/api/admin/migrate-r2", { cache: "no-store" });
        r = await res.json();
      } catch (e) {
        setLog((l) => [...l, `❌ เชื่อมต่อไม่สำเร็จ: ${e instanceof Error ? e.message : ""}`]);
        break;
      }
      setLast(r);
      if (!r.ok) {
        setLog((l) => [...l, `❌ ${r.error ?? "ผิดพลาด"}`]);
        break;
      }
      totalMigrated += r.migrated ?? 0;
      totalSkipped += r.skipped ?? 0;
      totalFailed += r.failed ?? 0;
      setLog((l) => [
        ...l,
        `รอบ ${rounds}: ย้าย ${r.migrated ?? 0} · ข้าม(มีแล้ว) ${r.skipped ?? 0} · พลาด ${r.failed ?? 0} · เหลือ ~${r.remaining ?? 0} (จาก ${r.total ?? 0})`,
      ]);
      if (r.done || (r.migrated === 0 && r.failed === 0 && (r.remaining ?? 0) === 0)) {
        setLog((l) => [...l, `✅ เสร็จสิ้น — ย้ายสำเร็จรวม ${totalMigrated} ไฟล์ · พลาด ${totalFailed}`]);
        setFinished(true);
        break;
      }
      // กันลูปไม่รู้จบ
      if (rounds > 200) {
        setLog((l) => [...l, "⚠️ หยุด (เกิน 200 รอบ) — กดเริ่มใหม่เพื่อทำต่อ"]);
        break;
      }
    }
    setRunning(false);
  }

  const pct = last?.total ? Math.round(((last.total - (last.remaining ?? 0)) / last.total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <CloudUpload className="h-5 w-5 text-cyan-400" /> ย้ายรูปเดิม → Cloudflare R2
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          คัดลอกรูป/ไฟล์เดิมทั้งหมดจาก Supabase ไป R2 · กดปุ่มแล้วรอจนเสร็จ (เรียกซ้ำได้ ไม่ทำซ้ำไฟล์เดิม)
        </p>

        <Button onClick={run} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
          {running ? "กำลังย้าย..." : finished ? "ย้ายอีกครั้ง (เช็คไฟล์ใหม่)" : "เริ่มย้ายรูป"}
        </Button>

        {last?.total ? (
          <div className="space-y-1">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-cyan-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-xs text-muted-foreground">{pct}% · ทั้งหมด {last.total} ไฟล์</div>
          </div>
        ) : null}

        {finished && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-sm text-emerald-300">
            <CheckCircle2 className="h-4 w-4" /> ย้ายรูปเสร็จแล้ว — ลองเปิดหน้าที่มีรูปดูว่าขึ้นครบไหม
          </div>
        )}

        {log.length > 0 && (
          <div className="max-h-56 space-y-0.5 overflow-y-auto rounded-md border border-border bg-card/40 p-2.5 font-mono text-[11px]">
            {log.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        )}

        {last?.errors && last.errors.length > 0 && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-200">
            <div className="mb-1 inline-flex items-center gap-1 font-medium">
              <AlertTriangle className="h-3.5 w-3.5" /> ไฟล์ที่พลาด (ตัวอย่าง):
            </div>
            {last.errors.map((e, i) => (
              <div key={i} className="truncate">{e}</div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
