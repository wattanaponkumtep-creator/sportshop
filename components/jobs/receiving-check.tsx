"use client";
import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PackageCheck, CheckCircle2, AlertTriangle, AlertCircle, RotateCcw, Save } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { updateReceivingCounts } from "@/app/(admin)/jobs/actions";
import { sortSizes } from "@/lib/constants";
import type { JobItem } from "@/lib/types/database";

type Props = {
  jobId: string;
  items: JobItem[];
  receivedCounts: Record<string, number>;
  receivedCheckAt: string | null;
  receivedCheckNote: string | null;
};

export function ReceivingCheck({ jobId, items, receivedCounts, receivedCheckAt, receivedCheckNote }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>(receivedCounts ?? {});
  const [note, setNote] = useState<string>(receivedCheckNote ?? "");
  const [isPending, startTransition] = useTransition();

  // คำนวณ expected (สั่งไป) จาก items
  const expected = useMemo(() => {
    const grouped = new Map<string, Map<string, number>>(); // type → size → count
    const allSizes = new Set<string>();
    const allTypes = new Set<string>();
    let total = 0;

    for (const it of items) {
      const qty = it.quantity ?? 1;
      total += qty;
      const type = (it.item_type ?? "").trim() || "ไม่ระบุประเภท";
      const size = (it.size ?? "").trim().toUpperCase() || "ไม่ระบุ";
      allTypes.add(type);
      allSizes.add(size);
      if (!grouped.has(type)) grouped.set(type, new Map());
      const m = grouped.get(type)!;
      m.set(size, (m.get(size) ?? 0) + qty);
    }

    return {
      types: Array.from(allTypes),
      sizes: sortSizes(Array.from(allSizes)),
      get: (t: string, s: string) => grouped.get(t)?.get(s) ?? 0,
      total,
    };
  }, [items]);

  const keyOf = (type: string, size: string) => `${type}.${size}`;

  const totals = useMemo(() => {
    let received = 0;
    for (const v of Object.values(counts)) received += Number(v) || 0;
    return {
      received,
      diff: received - expected.total,
    };
  }, [counts, expected.total]);

  function setCount(type: string, size: string, value: number) {
    const key = keyOf(type, size);
    setCounts((prev) => {
      const next = { ...prev };
      if (value <= 0) delete next[key];
      else next[key] = Math.floor(value);
      return next;
    });
  }

  function reset() {
    setCounts({});
  }

  function fillExpected() {
    // เติมค่าทั้งหมด = expected (สมมติว่าได้ครบทุกตัว)
    const next: Record<string, number> = {};
    for (const t of expected.types) {
      for (const s of expected.sizes) {
        const n = expected.get(t, s);
        if (n > 0) next[keyOf(t, s)] = n;
      }
    }
    setCounts(next);
  }

  function handleSave() {
    startTransition(async () => {
      const res = await updateReceivingCounts(jobId, counts, note);
      if (res.ok) {
        toast({ title: "บันทึกตรวจรับแล้ว ✅" });
      } else {
        toast({ title: "บันทึกไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          📝 ยังไม่มีรายชื่อ — เพิ่มรายชื่อ + ไซส์ก่อน แล้วค่อยกลับมาตรวจรับ
        </CardContent>
      </Card>
    );
  }

  // สถานะรวม
  let overallStatus: "complete" | "short" | "over" | "empty" = "empty";
  if (totals.received === 0) overallStatus = "empty";
  else if (totals.diff === 0) overallStatus = "complete";
  else if (totals.diff < 0) overallStatus = "short";
  else overallStatus = "over";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-emerald-400" /> ตรวจรับเสื้อจากโรงงาน
          </span>
          <Badge variant="outline" className="text-xs">
            สั่งไว้ {expected.total} ตัว
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
          💡 <strong>วิธีใช้:</strong> เมื่อโรงงานส่งเสื้อมา — นับจริงแล้วใส่ตัวเลขในตารางด้านล่าง ระบบจะเช็คให้ว่าครบ/ขาด/เกิน
        </div>

        {/* ตารางตรวจรับ */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground">ประเภท</th>
                {expected.sizes.map((s) => (
                  <th key={s} className="px-1 py-2 text-center text-xs font-semibold uppercase text-cyan-400">
                    {s}
                  </th>
                ))}
                <th className="px-2 py-2 text-right text-xs font-semibold text-orange-400">รวม</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {expected.types.map((t) => {
                let expRow = 0;
                let recRow = 0;
                for (const s of expected.sizes) {
                  expRow += expected.get(t, s);
                  recRow += counts[keyOf(t, s)] ?? 0;
                }
                const rowDiff = recRow - expRow;
                return (
                  <tr key={t} className="border-b border-border/50">
                    <td className="px-2 py-2 align-top">
                      <Badge variant="outline" className="text-xs">{t}</Badge>
                    </td>
                    {expected.sizes.map((s) => {
                      const exp = expected.get(t, s);
                      const rec = counts[keyOf(t, s)] ?? 0;
                      if (exp === 0 && rec === 0) {
                        return (
                          <td key={s} className="px-1 py-2 text-center text-xs text-muted-foreground">-</td>
                        );
                      }
                      const cellStatus =
                        rec === 0 ? "empty" :
                        rec === exp ? "complete" :
                        rec < exp ? "short" : "over";
                      const cellColor =
                        cellStatus === "complete" ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" :
                        cellStatus === "short" ? "border-amber-500/50 bg-amber-500/10 text-amber-400" :
                        cellStatus === "over" ? "border-rose-500/50 bg-rose-500/10 text-rose-400" :
                        "border-border";
                      return (
                        <td key={s} className="px-1 py-2 text-center align-top">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] text-muted-foreground">/{exp}</span>
                            <Input
                              type="number"
                              min={0}
                              value={rec || ""}
                              onChange={(e) => setCount(t, s, parseInt(e.target.value) || 0)}
                              className={`h-8 w-14 text-center font-mono text-sm ${cellColor}`}
                              placeholder="0"
                            />
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-right align-top">
                      <div className="font-mono text-sm">
                        <span className={rowDiff === 0 ? "text-emerald-400" : rowDiff < 0 ? "text-amber-400" : "text-rose-400"}>
                          {recRow}
                        </span>
                        <span className="text-muted-foreground"> / {expRow}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center align-top">
                      {recRow === 0 ? (
                        <span className="text-xs text-muted-foreground">รอนับ</span>
                      ) : rowDiff === 0 ? (
                        <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-400" />
                      ) : rowDiff < 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                          <AlertTriangle className="h-4 w-4" /> ขาด {Math.abs(rowDiff)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-rose-400">
                          <AlertCircle className="h-4 w-4" /> เกิน {rowDiff}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-orange-500/40 bg-orange-500/5">
                <td className="px-2 py-2 text-xs font-bold uppercase">รวมทั้งหมด</td>
                {expected.sizes.map((s) => {
                  const exp = expected.types.reduce((sum, t) => sum + expected.get(t, s), 0);
                  const rec = expected.types.reduce((sum, t) => sum + (counts[keyOf(t, s)] ?? 0), 0);
                  return (
                    <td key={s} className="px-1 py-2 text-center font-mono text-xs">
                      <span className={rec === exp ? "text-emerald-400" : rec < exp ? "text-amber-400" : "text-rose-400"}>
                        {rec}
                      </span>
                      <span className="text-muted-foreground">/{exp}</span>
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-right font-mono">
                  <span className={totals.diff === 0 ? "text-emerald-400" : totals.diff < 0 ? "text-amber-400" : "text-rose-400"}>
                    {totals.received}
                  </span>
                  <span className="text-muted-foreground"> / {expected.total}</span>
                </td>
                <td className="px-2 py-2 text-center">
                  {overallStatus === "complete" && (
                    <Badge className="bg-emerald-500/20 text-emerald-400">✅ ครบ</Badge>
                  )}
                  {overallStatus === "short" && (
                    <Badge className="bg-amber-500/20 text-amber-400">⚠️ ขาด {Math.abs(totals.diff)}</Badge>
                  )}
                  {overallStatus === "over" && (
                    <Badge className="bg-rose-500/20 text-rose-400">🔴 เกิน {totals.diff}</Badge>
                  )}
                  {overallStatus === "empty" && (
                    <Badge variant="outline">รอนับ</Badge>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* แจ้งเตือนสรุป */}
        {overallStatus === "short" && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
              <div>
                <div className="font-semibold text-amber-400">⚠️ ของขาด {Math.abs(totals.diff)} ตัว</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  ตรวจสอบกับโรงงานก่อนปิดงาน เพื่อไม่ให้โดนเก็บเงินย้อนหลังภายหลัง
                </div>
              </div>
            </div>
          </div>
        )}
        {overallStatus === "over" && (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-400" />
              <div>
                <div className="font-semibold text-rose-400">🔴 ของเกิน {totals.diff} ตัว</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  ของเกินจากที่สั่ง — เช็คว่าเป็นของ JOB อื่นหรือเปล่า
                </div>
              </div>
            </div>
          </div>
        )}
        {overallStatus === "complete" && (
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-semibold">✅ ได้รับครบทุกตัว — พร้อมส่งให้ลูกค้า</span>
            </div>
          </div>
        )}

        {/* หมายเหตุ */}
        <div className="space-y-1.5">
          <Label htmlFor="receiving-note" className="text-xs">หมายเหตุ (เช่น โรงงานบอกจะส่งของขาดมาเพิ่มวันที่ ...)</Label>
          <Textarea
            id="receiving-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="เช่น ขาดเสื้อ L 2 ตัว — โรงงานจะส่งเพิ่มภายในศุกร์นี้"
            className="text-sm"
          />
        </div>

        {/* ปุ่ม */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {receivedCheckAt && (
              <>ตรวจรับล่าสุด: {new Date(receivedCheckAt).toLocaleString("th-TH")}</>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={fillExpected} disabled={isPending}>
              <CheckCircle2 className="h-3.5 w-3.5" /> เติมครบทุกตัว
            </Button>
            <Button variant="outline" size="sm" onClick={reset} disabled={isPending}>
              <RotateCcw className="h-3.5 w-3.5" /> ล้าง
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              <Save className="h-3.5 w-3.5" /> {isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
