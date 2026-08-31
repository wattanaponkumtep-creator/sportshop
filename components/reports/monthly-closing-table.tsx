"use client";
import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, ArrowDownToLine, ArrowUpFromLine, Download, Printer, MessageCircle } from "lucide-react";
import { formatBaht, cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { sendMonthlyClosingNow } from "@/app/(admin)/reports/digest-actions";
import type { FinanceMonth } from "@/lib/reports/finance";

const COLS = ["เดือน", "จำนวนงาน", "รายได้", "ต้นทุนงาน", "กำไรขั้นต้น", "ค่าใช้จ่ายร้าน", "กำไรสุทธิ", "Net Margin %", "เงินสดเข้า", "เงินสดออก", "เงินสดสุทธิ"];

function marginOf(m: FinanceMonth) {
  return m.revenue > 0 ? (m.netProfit / m.revenue) * 100 : 0;
}

export function MonthlyClosingTable({ monthly, shopName = "SportShop" }: { monthly: FinanceMonth[]; shopName?: string }) {
  // ใหม่สุดอยู่บน · เดือนแรก (ล่าสุด) = เดือนปัจจุบัน ยังไม่จบเดือน
  const rows = monthly.slice().reverse();
  const [open, setOpen] = useState<string | null>(rows[0]?.label ?? null);
  const [isSending, startSend] = useTransition();

  function sendLineNow() {
    startSend(async () => {
      const r = await sendMonthlyClosingNow();
      if (r.ok) toast({ title: `ส่งสรุปเดือนที่แล้วเข้า LINE แล้ว — สำเร็จ ${r.sent}/${r.total} ราย` });
      else toast({ title: "ส่งไม่สำเร็จ", description: r.error, variant: "destructive" });
    });
  }

  function downloadCSV() {
    const lines = [COLS.join(",")];
    for (const m of rows) {
      lines.push([
        m.label,
        m.jobCount,
        Math.round(m.revenue),
        Math.round(m.cogs),
        Math.round(m.grossProfit),
        Math.round(m.operatingExpenses),
        Math.round(m.netProfit),
        marginOf(m).toFixed(1),
        Math.round(m.cashIn),
        Math.round(m.cashOut),
        Math.round(m.netCash),
      ].join(","));
    }
    // BOM เพื่อให้ Excel อ่านภาษาไทยถูก
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `สรุปบัญชีรายเดือน_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function printPDF() {
    const now = new Date().toLocaleString("th-TH", { dateStyle: "long", timeStyle: "short" });
    const rowsHtml = rows
      .map(
        (m) => `<tr>
          <td>${m.label}${rows.indexOf(m) === 0 ? " (ยังไม่จบเดือน)" : ""}</td>
          <td class="n">${m.jobCount}</td>
          <td class="n">${Math.round(m.revenue).toLocaleString()}</td>
          <td class="n">${Math.round(m.cogs).toLocaleString()}</td>
          <td class="n">${Math.round(m.grossProfit).toLocaleString()}</td>
          <td class="n">${Math.round(m.operatingExpenses).toLocaleString()}</td>
          <td class="n b ${m.netProfit >= 0 ? "" : "neg"}">${Math.round(m.netProfit).toLocaleString()}</td>
          <td class="n">${marginOf(m).toFixed(1)}%</td>
        </tr>`,
      )
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>สรุปบัญชีรายเดือน</title>
      <style>
        body{font-family:'Sarabun','TH Sarabun New',Arial,sans-serif;padding:24px;color:#111}
        h1{font-size:20px;margin:0 0 4px}
        .sub{color:#666;font-size:12px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
        th{background:#f3f4f6;font-weight:600}
        td.n{text-align:right;font-variant-numeric:tabular-nums}
        td.b{font-weight:700}
        td.neg{color:#c0392b}
        .foot{margin-top:12px;font-size:11px;color:#888}
      </style></head><body>
      <h1>สรุปบัญชีรายเดือน — ${shopName}</h1>
      <div class="sub">P&L 6 เดือนล่าสุด · ออกเอกสารเมื่อ ${now}</div>
      <table>
        <thead><tr>
          <th>เดือน</th><th style="text-align:right">งาน</th><th style="text-align:right">รายได้</th>
          <th style="text-align:right">ต้นทุนงาน</th><th style="text-align:right">กำไรขั้นต้น</th>
          <th style="text-align:right">ค่าใช้จ่ายร้าน</th><th style="text-align:right">กำไรสุทธิ</th><th style="text-align:right">Margin</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="foot">งานจัดเข้าเดือนที่เริ่มงาน · ค่าใช้จ่ายร้านตามเดือนที่จ่าย · เดือนล่าสุดยังไม่ปิดจบ ตัวเลขอาจเปลี่ยน</div>
      </body></html>`;

    // ใช้ iframe ซ่อน — เลี่ยงตัวบล็อกป๊อปอัพ
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1000);
    }, 300);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={downloadCSV}>
          <Download className="h-4 w-4" /> ดาวน์โหลด Excel (CSV)
        </Button>
        <Button size="sm" variant="outline" onClick={printPDF}>
          <Printer className="h-4 w-4" /> พิมพ์ / บันทึก PDF
        </Button>
        <Button size="sm" variant="outline" onClick={sendLineNow} disabled={isSending} className="border-green-500/30 hover:border-green-500/60 hover:bg-green-500/5">
          <MessageCircle className="h-4 w-4 text-green-500" /> {isSending ? "กำลังส่ง..." : "ทดสอบส่ง LINE"}
        </Button>
      </div>

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
                  const isOpen = open === m.label;
                  return (
                    <MonthRow
                      key={m.label}
                      m={m}
                      isCurrent={isCurrent}
                      margin={marginOf(m)}
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
    </div>
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
                <div className="text-right text-[11px] text-muted-foreground">Net Margin {margin.toFixed(1)}%</div>
              </div>

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
                <p className="pt-1 text-[10px] text-muted-foreground">* กระแสเงินสด = เงินที่รับ/จ่ายจริงในเดือน (คนละมุมกับกำไร)</p>
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
