"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, ArrowUpDown, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { JOB_STATUS_LABEL } from "@/lib/constants";
import { formatBaht, cn } from "@/lib/utils";
import type { JobProfitRow } from "@/lib/reports/finance";
import type { JobStatus } from "@/lib/types/database";

type SortKey = "profit" | "revenue" | "margin" | "cost";

export function JobProfitTable({ rows }: { rows: JobProfitRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("profit");
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      switch (sortKey) {
        case "revenue": return b.revenue - a.revenue;
        case "cost": return b.totalCost - a.totalCost;
        case "margin": return b.margin - a.margin;
        default: return b.profit - a.profit;
      }
    });
    return arr;
  }, [rows, sortKey]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        revenue: acc.revenue + r.revenue,
        totalCost: acc.totalCost + r.totalCost,
        profit: acc.profit + r.profit,
        factoryCost: acc.factoryCost + r.factoryCost,
        shippingCost: acc.shippingCost + r.shippingCost,
        otherCost: acc.otherCost + r.otherCost,
      }),
      { revenue: 0, totalCost: 0, profit: 0, factoryCost: 0, shippingCost: 0, otherCost: 0 },
    );
  }, [rows]);

  const avgMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;
  const best = sorted.length > 0 ? [...rows].sort((a, b) => b.profit - a.profit)[0] : null;
  const worst = sorted.length > 0 ? [...rows].sort((a, b) => a.profit - b.profit)[0] : null;

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          ยังไม่มีงานที่ปิด (ส่งแล้ว/เสร็จ) ในช่วงนี้ — กำไรจะขึ้นเมื่องานถูกเปลี่ยนสถานะเป็น &quot;จัดส่งแล้ว&quot; หรือ &quot;เสร็จสมบูรณ์&quot;
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Highlights */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <MiniTile label="รายได้รวม" value={formatBaht(totals.revenue)} tone="text-emerald-400" />
        <MiniTile label="ต้นทุนรวม" value={formatBaht(totals.totalCost)} tone="text-rose-400" />
        <MiniTile label="กำไรรวม" value={formatBaht(totals.profit)} tone={totals.profit >= 0 ? "text-emerald-400" : "text-rose-400"} />
        <MiniTile label="Margin เฉลี่ย" value={`${avgMargin.toFixed(1)}%`} tone="text-cyan-400" />
      </div>

      {best && worst && best.id !== worst.id && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs">
            <TrendingUp className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="text-muted-foreground">กำไรสูงสุด:</span>
            <span className="truncate font-medium">{best.jobLabel || best.jobCode}</span>
            <span className="ml-auto shrink-0 font-mono font-bold text-emerald-400">{formatBaht(best.profit)}</span>
          </div>
          <div className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
            worst.profit < 0 ? "border-rose-500/30 bg-rose-500/5" : "border-border bg-card/40",
          )}>
            {worst.profit < 0 ? <TrendingDown className="h-4 w-4 shrink-0 text-rose-400" /> : <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <span className="text-muted-foreground">{worst.profit < 0 ? "ขาดทุนสุด:" : "กำไรน้อยสุด:"}</span>
            <span className="truncate font-medium">{worst.jobLabel || worst.jobCode}</span>
            <span className={cn("ml-auto shrink-0 font-mono font-bold", worst.profit < 0 ? "text-rose-400" : "text-muted-foreground")}>{formatBaht(worst.profit)}</span>
          </div>
        </div>
      )}

      {/* Sort chips */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="inline-flex items-center gap-1 text-muted-foreground"><ArrowUpDown className="h-3 w-3" /> เรียงตาม:</span>
        {([
          ["profit", "กำไร"],
          ["revenue", "รายได้"],
          ["cost", "ต้นทุน"],
          ["margin", "Margin"],
        ] as [SortKey, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSortKey(key)}
            className={cn(
              "rounded-full border px-2.5 py-1 transition",
              sortKey === key ? "border-primary bg-primary/15 font-medium text-primary" : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="p-2 pl-3 text-left font-medium">งาน / ลูกค้า</th>
                  <th className="p-2 text-right font-medium">รายได้</th>
                  <th className="p-2 text-right font-medium">ต้นทุน</th>
                  <th className="p-2 text-right font-medium">กำไร</th>
                  <th className="hidden p-2 pr-3 text-right font-medium sm:table-cell">Margin</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const isOpen = expanded === r.id;
                  return (
                    <FragmentRow
                      key={r.id}
                      r={r}
                      isOpen={isOpen}
                      onToggle={() => setExpanded(isOpen ? null : r.id)}
                    />
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-card/40 font-semibold">
                  <td className="p-2 pl-3">รวม {rows.length} งาน</td>
                  <td className="p-2 text-right font-mono tabular-nums text-emerald-400">{formatBaht(totals.revenue)}</td>
                  <td className="p-2 text-right font-mono tabular-nums text-rose-400">{formatBaht(totals.totalCost)}</td>
                  <td className={cn("p-2 text-right font-mono tabular-nums", totals.profit >= 0 ? "text-emerald-400" : "text-rose-400")}>{formatBaht(totals.profit)}</td>
                  <td className="hidden p-2 pr-3 text-right font-mono tabular-nums text-cyan-400 sm:table-cell">{avgMargin.toFixed(1)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
      <p className="text-center text-[11px] text-muted-foreground">
        แตะที่งานเพื่อดูรายละเอียดต้นทุน · กำไรนี้เป็น &quot;กำไรขั้นต้น&quot; (ยังไม่หักค่าใช้จ่ายร้าน เช่น ค่าเช่า/เงินเดือน)
      </p>
    </div>
  );
}

function FragmentRow({ r, isOpen, onToggle }: { r: JobProfitRow; isOpen: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="cursor-pointer border-b border-border/60 hover:bg-accent/40" onClick={onToggle}>
        <td className="p-2 pl-3">
          <div className="flex items-start gap-1.5">
            {isOpen ? <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            <div className="min-w-0">
              <div className="truncate font-medium">{r.jobLabel || r.jobCode}</div>
              <div className="truncate text-xs text-muted-foreground">
                <span className="font-mono">{r.jobCode}</span> · {r.customerName}
              </div>
            </div>
          </div>
        </td>
        <td className="p-2 text-right font-mono tabular-nums text-emerald-400">{formatBaht(r.revenue)}</td>
        <td className="p-2 text-right font-mono tabular-nums text-rose-400">{formatBaht(r.totalCost)}</td>
        <td className={cn("p-2 text-right font-mono tabular-nums font-semibold", r.profit >= 0 ? "text-emerald-400" : "text-rose-400")}>
          {r.profit < 0 ? "-" : ""}{formatBaht(Math.abs(r.profit))}
        </td>
        <td className="hidden p-2 pr-3 text-right font-mono tabular-nums sm:table-cell">
          <span className={cn(r.margin >= 20 ? "text-emerald-400" : r.margin >= 0 ? "text-amber-400" : "text-rose-400")}>
            {r.margin.toFixed(0)}%
          </span>
        </td>
      </tr>
      {isOpen && (
        <tr className="border-b border-border/60 bg-background/40">
          <td colSpan={5} className="p-3 pl-8">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 text-xs">
                <div className="mb-1 font-medium text-muted-foreground">รายละเอียดต้นทุน</div>
                <Line label="ต้นทุนโรงงาน" value={r.factoryCost} />
                <Line label="ค่าจัดส่ง" value={r.shippingCost} />
                <Line label="ค่าอื่น ๆ" value={r.otherCost} />
                <div className="flex justify-between border-t border-border pt-1 font-medium">
                  <span>รวมต้นทุน</span>
                  <span className="font-mono text-rose-400">{formatBaht(r.totalCost)}</span>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{JOB_STATUS_LABEL[r.status as JobStatus] ?? r.status}</Badge>
                  <span className="text-muted-foreground">
                    รายได้ {formatBaht(r.revenue)} − ต้นทุน {formatBaht(r.totalCost)} =
                    <span className={cn("ml-1 font-semibold", r.profit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {formatBaht(r.profit)}
                    </span>
                  </span>
                </div>
                <Link
                  href={`/jobs/${r.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> เปิดงานนี้
                </Link>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{formatBaht(value)}</span>
    </div>
  );
}

function MiniTile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-lg bg-card/60 p-3">
      <div className="text-[11px] text-muted-foreground sm:text-xs">{label}</div>
      <div className={cn("mt-0.5 font-display text-base font-bold tabular-nums sm:text-lg", tone)}>{value}</div>
    </div>
  );
}
