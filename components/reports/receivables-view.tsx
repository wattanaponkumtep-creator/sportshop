"use client";
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, CircleDollarSign, CircleDashed, CheckCircle2, ExternalLink, Factory, AlertTriangle } from "lucide-react";
import { JOB_STATUS_LABEL } from "@/lib/constants";
import { formatBaht, formatDateTH, cn } from "@/lib/utils";
import type { ReceivableJob } from "@/lib/reports/receivables";

type Totals = {
  unpaidCount: number;
  partialCount: number;
  paidCount: number;
  unpaidRemaining: number;
  partialRemaining: number;
  partialCollected: number;
  outstandingTotal: number;
  collectedTotal: number;
};

export function ReceivablesView({
  unpaid,
  partial,
  paid,
  totals,
}: {
  unpaid: ReceivableJob[];
  partial: ReceivableJob[];
  paid: ReceivableJob[];
  totals: Totals;
}) {
  const paidFullTotal = paid.reduce((s, r) => s + r.paid, 0);
  const fullNoDeposit = paid.filter((r) => !r.hasDeposit); // จ่ายเต็มเลย ไม่มัดจำ
  const fullWithDeposit = paid.filter((r) => r.hasDeposit); // มัดจำแล้วจ่ายครบ
  // เก็บครบจากลูกค้าแล้ว แต่ยังไม่จ่ายโรงงาน — เงินก้อนนี้ยังต้องกันไว้จ่ายค่าผลิต
  const paidButFactoryUnpaid = paid.filter((r) => r.factoryHasCost && !r.factoryPaid);
  return (
    <div className="space-y-4">
      {/* แถบสรุป: เก็บได้จริง vs ค้างเก็บ */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <div className="sm:border-r sm:border-border sm:pr-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> 💵 เก็บเงินได้จริงแล้ว
            </div>
            <div className="mt-1 font-display text-3xl font-bold tabular-nums text-emerald-400 sm:text-4xl">
              {formatBaht(totals.collectedTotal)}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>มัดจำ (บางส่วน) <span className="font-medium text-foreground">{formatBaht(totals.partialCollected)}</span></span>
              <span>เต็มจำนวน <span className="font-medium text-foreground">{formatBaht(paidFullTotal)}</span></span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CircleDashed className="h-4 w-4 text-rose-400" /> ⏳ ยังค้างเก็บอีก
            </div>
            <div className="mt-1 font-display text-3xl font-bold tabular-nums text-rose-400 sm:text-4xl">
              {formatBaht(totals.outstandingTotal)}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>ยังไม่เก็บ <span className="font-medium text-foreground">{formatBaht(totals.unpaidRemaining)}</span></span>
              <span>มัดจำค้าง <span className="font-medium text-foreground">{formatBaht(totals.partialRemaining)}</span></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* สรุป */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Tile label="ค้างเก็บทั้งหมด" value={formatBaht(totals.outstandingTotal)} sub={`ยังไม่เก็บ ${totals.unpaidCount} · มัดจำ ${totals.partialCount} งาน`} tone="text-rose-400" big />
        <Tile label="ยังไม่ได้เก็บ" value={`${totals.unpaidCount} งาน`} sub={`ค้าง ${formatBaht(totals.unpaidRemaining)}`} tone="text-rose-400" />
        <Tile
          label={`เก็บมัดจำแล้ว (${totals.partialCount} งาน)`}
          value={formatBaht(totals.partialCollected)}
          sub={`ค้างอีก ${formatBaht(totals.partialRemaining)}`}
          tone="text-emerald-400"
        />
        <Tile
          label={`เก็บครบแล้ว (${totals.paidCount} งาน)`}
          value={formatBaht(paidFullTotal)}
          sub={`จ่ายเต็มเลย ${fullNoDeposit.length} · มัดจำ→ครบ ${fullWithDeposit.length} งาน`}
          tone="text-emerald-400"
        />
      </div>

      <Group
        title="ยังไม่ได้เก็บ"
        icon={CircleDashed}
        tone="rose"
        rows={unpaid}
        defaultOpen
        emptyText="ไม่มีงานที่ยังไม่ได้เก็บเงิน 🎉"
      />
      <Group
        title="เก็บมัดจำ / บางส่วน"
        icon={CircleDollarSign}
        tone="amber"
        rows={partial}
        defaultOpen
        emptyText="ไม่มีงานที่เก็บมัดจำค้างอยู่"
      />
      {paidButFactoryUnpaid.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span>
            <span className="font-medium text-amber-300">{paidButFactoryUnpaid.length} งาน</span> เก็บเงินครบจากลูกค้าแล้ว
            แต่<span className="font-medium">ยังไม่ได้จ่ายค่าผลิตให้โรงงาน</span> — เงินก้อนนี้ต้องกันไว้จ่ายโรงงานก่อน ยังไม่ใช่กำไรเต็ม
          </span>
        </div>
      )}

      <Group
        title="เก็บครบแล้ว"
        icon={CheckCircle2}
        tone="emerald"
        rows={paid}
        defaultOpen
        emptyText="ยังไม่มีงานที่เก็บครบ"
      />
    </div>
  );
}

const TONE = {
  rose: { text: "text-rose-400", border: "border-rose-500/25", chip: "bg-rose-500/15 text-rose-300" },
  amber: { text: "text-amber-400", border: "border-amber-500/25", chip: "bg-amber-500/15 text-amber-300" },
  emerald: { text: "text-emerald-400", border: "border-emerald-500/25", chip: "bg-emerald-500/15 text-emerald-300" },
} as const;

function Group({
  title,
  icon: Icon,
  tone,
  rows,
  defaultOpen,
  emptyText,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof TONE;
  rows: ReceivableJob[];
  defaultOpen: boolean;
  emptyText: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const t = TONE[tone];
  const collectedSum = rows.reduce((s, r) => s + r.paid, 0);
  const remainingSum = rows.reduce((s, r) => s + r.remaining, 0);

  return (
    <Card className={cn("border", t.border)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <span className="inline-flex items-center gap-2 font-semibold">
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <Icon className={cn("h-4 w-4", t.text)} />
          {title}
          <Badge variant="outline" className="ml-1">{rows.length} งาน</Badge>
        </span>
        <span className="shrink-0 text-right font-mono text-sm tabular-nums">
          {tone === "emerald" ? (
            <span className="font-bold text-emerald-400">เก็บแล้ว {formatBaht(collectedSum)}</span>
          ) : tone === "amber" ? (
            <span>
              <span className="font-bold text-emerald-400">เก็บแล้ว {formatBaht(collectedSum)}</span>
              <span className="text-muted-foreground"> · </span>
              <span className="font-bold text-amber-400">ค้าง {formatBaht(remainingSum)}</span>
            </span>
          ) : (
            <span className="font-bold text-rose-400">ค้าง {formatBaht(remainingSum)}</span>
          )}
        </span>
      </button>

      {open && (
        <CardContent className="space-y-1.5 pt-0">
          {rows.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            rows.map((r) => <RowItem key={r.id} r={r} tone={tone} />)
          )}
        </CardContent>
      )}
    </Card>
  );
}

function RowItem({ r, tone }: { r: ReceivableJob; tone: keyof typeof TONE }) {
  const t = TONE[tone];
  const todayISO = new Date().toISOString().slice(0, 10);
  const overdue = r.dueDate && r.dueDate < todayISO && r.collect !== "paid";
  const pct = r.net > 0 ? Math.min(100, Math.round((r.paid / r.net) * 100)) : 0;

  return (
    <Link
      href={`/jobs/${r.id}`}
      className="block rounded-md border border-border bg-card/40 p-2.5 transition hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{r.jobLabel || r.jobCode}</span>
            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className="font-mono">{r.jobCode}</span>
            <span>· {r.customerName}</span>
            <Badge variant="outline" className="text-[10px]">{JOB_STATUS_LABEL[r.status]}</Badge>
            {r.collect === "paid" && (
              <Badge
                variant="outline"
                className={cn("text-[10px]", r.hasDeposit ? "border-emerald-500/40 text-emerald-300" : "border-cyan-500/40 text-cyan-300")}
              >
                {r.hasDeposit ? "มัดจำ→จ่ายครบ" : "จ่ายเต็มเลย"}
              </Badge>
            )}
            {r.factoryHasCost && (
              <Badge
                variant="outline"
                className={cn("text-[10px]", r.factoryPaid ? "border-emerald-500/40 text-emerald-300" : "border-amber-500/40 text-amber-300")}
              >
                <Factory className="mr-0.5 h-2.5 w-2.5" />
                {r.factoryPaid ? "จ่ายโรงงานแล้ว" : "ยังไม่จ่ายโรงงาน"}
              </Badge>
            )}
            {overdue && <span className="font-medium text-rose-400">· เลยกำหนด {formatDateTH(r.dueDate, "d MMM")}</span>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          {r.collect === "paid" ? (
            <div className="font-mono text-sm font-semibold tabular-nums text-emerald-400">{formatBaht(r.paid)}</div>
          ) : (
            <>
              <div className={cn("font-mono text-sm font-semibold tabular-nums", t.text)}>
                ค้าง {formatBaht(r.remaining)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                จาก {formatBaht(r.net)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* progress bar เก็บเงิน */}
      {r.collect !== "unpaid" && (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", r.collect === "paid" ? "bg-emerald-500" : "bg-amber-500")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            เก็บแล้ว {formatBaht(r.paid)} ({pct}%)
            {r.hasDeposit && r.collect === "partial" && " · มีมัดจำ"}
          </span>
        </div>
      )}
    </Link>
  );
}

function Tile({ label, value, sub, tone, big }: { label: string; value: string; sub?: string; tone: string; big?: boolean }) {
  return (
    <div className="rounded-lg bg-card/60 p-3">
      <div className="text-[11px] text-muted-foreground sm:text-xs">{label}</div>
      <div className={cn("mt-0.5 font-display font-bold tabular-nums", big ? "text-xl sm:text-2xl" : "text-base sm:text-lg", tone)}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
