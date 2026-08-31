"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { formatBaht, cn } from "@/lib/utils";
import type { FinanceMonth } from "@/lib/reports/finance";

export function MonthlyClosingTable({ monthly }: { monthly: FinanceMonth[] }) {
  // ใหม่สุดอยู่บน · เดือนแรก (ล่าสุด) = เดือนปัจจุบัน ยังไม่จบเดือน
  const rows = monthly.slice().reverse();
  const [open, setOpen] = useState<string | null>(rows[0]?.label ?? null);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="p-2 pl-3 text-left font-medium">เดือน</th>
                <th className="p-2 text-right font-medium">รายได้</th>
                <th className="p-2 text-right font-medium">ต้นทุนงาน</th>
                <th className="p-2 text-right font-medium">กำไรขั้นต้น</th>
                <th className="p-2 text-right font-medium">ค่าใช้จ่ายร้าน</th>
                <th className="p-2 pr-3 text-right font-medium">กำไรสุทธิ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m, i) => {
                const isCurrent = i === 0;
                const margin = m.revenue > 0 ? (m.netProfit / m.revenue) * 100 : 0;
                const isOpen = open === m.label;
                return (
                  <MonthRow
                    key={m.label}
                    m={m}
                    isCurrent={isCurrent}
                    margin={margin}
                    isOpen={isOpen}
                    onToggle={() => setOpen(isOpen ? null : m.label)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          💡 งานถูกจัดเข้า <span className="font-medium">เดือนที่เริ่มงาน</span> · ค่าใช้จ่ายร้านตามเดือนที่จ่าย ·
          เดือนล่าสุดยังไม่จบ ตัวเลขจะเปลี่ยนจนกว่างานที่เริ่มเดือนนั้นจะปิดครบ
        </p>
      </CardContent>
    </Card>
  );
}

function MonthRow({
  m,
  isCurrent,
  margin,
  isOpen,
  onToggle,
}: {
  m: FinanceMonth;
  isCurrent: boolean;
  margin: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className={cn("cursor-pointer border-b border-border/60 hover:bg-accent/40", isCurrent && "bg-primary/5")} onClick={onToggle}>
        <td className="p-2 pl-3">
          <div className="flex items-center gap-1.5">
            {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className="font-medium">{m.label}</span>
            {isCurrent ? (
              <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">ยังไม่จบเดือน</Badge>
            ) : (
              <Badge variant="outline" className="border-emerald-500/30 text-[10px] text-emerald-300">ปิดแล้ว</Badge>
            )}
          </div>
          <div className="mt-0.5 pl-5 text-[11px] text-muted-foreground">{m.jobCount} งาน</div>
        </td>
        <td className="p-2 text-right font-mono tabular-nums text-emerald-400">{formatBaht(m.revenue)}</td>
        <td className="p-2 text-right font-mono tabular-nums text-rose-400">{formatBaht(m.cogs)}</td>
        <td className="p-2 text-right font-mono tabular-nums">{formatBaht(m.grossProfit)}</td>
        <td className="p-2 text-right font-mono tabular-nums text-rose-400">{formatBaht(m.operatingExpenses)}</td>
        <td className={cn("p-2 pr-3 text-right font-mono font-bold tabular-nums", m.netProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
          {m.netProfit < 0 ? "-" : ""}{formatBaht(Math.abs(m.netProfit))}
        </td>
      </tr>
      {isOpen && (
        <tr className="border-b border-border/60 bg-background/40">
          <td colSpan={6} className="p-3 pl-8">
            <div className="grid gap-3 sm:grid-cols-2">
              {/* สูตรกำไร */}
              <div className="space-y-1 text-xs">
                <div className="mb-1 font-medium text-muted-foreground">การคำนวณกำไร</div>
                <Line label="รายได้ (ยอดขายสุทธิ)" value={m.revenue} tone="text-emerald-400" sign="+" />
                <Line label="ต้นทุนงาน (ผลิต+ส่ง+อื่น)" value={m.cogs} tone="text-rose-400" sign="−" />
                <div className="flex justify-between border-t border-border pt-1">
                  <span className="text-muted-foreground">= กำไรขั้นต้น</span>
                  <span className="font-mono font-medium">{formatBaht(m.grossProfit)}</span>
                </div>
                <Line label="ค่าใช้จ่ายร้าน (เช่า/เงินเดือน ฯลฯ)" value={m.operatingExpenses} tone="text-rose-400" sign="−" />
                <div className="flex justify-between border-t border-border pt-1 font-semibold">
                  <span>= กำไรสุทธิ</span>
                  <span className={cn("font-mono", m.netProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {m.netProfit < 0 ? "-" : ""}{formatBaht(Math.abs(m.netProfit))}
                  </span>
                </div>
                <div className="text-right text-[11px] text-muted-foreground">
                  Net Margin {margin.toFixed(1)}%
                </div>
              </div>

              {/* กระแสเงินสด */}
              <div className="space-y-1 text-xs">
                <div className="mb-1 font-medium text-muted-foreground">กระแสเงินสดเดือนนี้</div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <ArrowDownToLine className="h-3 w-3 text-emerald-400" /> เงินสดเข้า
                  </span>
                  <span className="font-mono text-emerald-400">{formatBaht(m.cashIn)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <ArrowUpFromLine className="h-3 w-3 text-rose-400" /> เงินสดออก
                  </span>
                  <span className="font-mono text-rose-400">{formatBaht(m.cashOut)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 font-medium">
                  <span>เงินสดสุทธิ</span>
                  <span className={cn("font-mono", m.netCash >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {m.netCash < 0 ? "-" : ""}{formatBaht(Math.abs(m.netCash))}
                  </span>
                </div>
                <p className="pt-1 text-[10px] text-muted-foreground">
                  * กระแสเงินสด = เงินที่รับ/จ่ายจริงในเดือน (คนละมุมกับกำไร)
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Line({ label, value, tone, sign }: { label: string; value: number; tone?: string; sign?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-mono tabular-nums", tone)}>
        {sign && value !== 0 ? `${sign} ` : ""}{formatBaht(value)}
      </span>
    </div>
  );
}
