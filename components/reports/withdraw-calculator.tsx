"use client";
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Wallet, Factory, Lock, ArrowDownToLine, Info, ShieldCheck } from "lucide-react";
import { formatBaht, cn } from "@/lib/utils";

export function WithdrawCalculator({
  cashOnHand,
  factoryPayable,
  factoryPayableCount,
  heldForOpen,
}: {
  cashOnHand: number;
  factoryPayable: number;
  factoryPayableCount: number;
  heldForOpen: number;
}) {
  // ให้ผู้ใช้ใส่ยอดเงินในบัญชีจริงได้ (default = ที่ระบบคำนวณ)
  const [override, setOverride] = useState<string>("");
  const base = override.trim() === "" ? cashOnHand : Math.max(0, Number(override) || 0);

  const safeAfterFactory = base - factoryPayable;
  const safeConservative = base - heldForOpen;

  return (
    <div className="space-y-3">
      {/* ยอดเงินฐาน */}
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm text-muted-foreground">💵 เงินในบัญชีตอนนี้</div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tabular-nums sm:text-3xl">{formatBaht(base)}</span>
                {override.trim() === "" && (
                  <span className="text-xs text-muted-foreground">(ประมาณจากระบบ)</span>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ปรับเป็นยอดจริงในบัญชี (ถ้ารู้)</label>
              <Input
                type="number"
                inputMode="numeric"
                value={override}
                onChange={(e) => setOverride(e.target.value)}
                placeholder={String(Math.round(cashOnHand))}
                className="h-9 w-full sm:w-44"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Waterfall */}
      <Card>
        <CardContent className="space-y-2.5 p-4 sm:p-5">
          <Row icon={Wallet} label="เงินในบัญชี" value={base} tone="text-foreground" />
          <Row
            icon={Factory}
            label={`กันไว้จ่ายโรงงาน (${factoryPayableCount} งาน)`}
            value={-factoryPayable}
            tone="text-rose-400"
            sign="−"
            href="/reports/factory-payables"
          />
          <div className="border-t border-border pt-2.5">
            <div className="flex items-center justify-between rounded-lg border-2 border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="h-5 w-5 text-emerald-400" />
                <span className="font-display text-base font-bold">เอาออกมาใช้ได้ (หลังกันค่าผลิต)</span>
              </div>
              <span className={cn("font-display text-xl font-bold tabular-nums sm:text-2xl", safeAfterFactory >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {safeAfterFactory < 0 ? "-" : ""}{formatBaht(Math.abs(safeAfterFactory))}
              </span>
            </div>
          </div>

          {/* ปลอดภัยสุด */}
          <div className="flex items-start gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
            <div className="flex-1 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">🛡️ แบบปลอดภัยสุด (เอาเฉพาะเงินงานที่ปิดแล้ว)</span>
                <span className={cn("shrink-0 font-mono font-bold", safeConservative >= 0 ? "text-cyan-300" : "text-rose-400")}>
                  {safeConservative < 0 ? "-" : ""}{formatBaht(Math.abs(safeConservative))}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">
                <Lock className="mr-1 inline h-3 w-3" />
                กันเงินลูกค้าของงานที่ยังไม่ปิดไว้อีก {formatBaht(heldForOpen)} เผื่อคืนเงิน/ต้นทุนที่เหลือ —
                เหมาะถ้ายังมีงานค้างเยอะ
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-1 text-[11px] text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              ตัวเลข &quot;เงินในบัญชี (ประมาณ)&quot; = เงินรับจากลูกค้าทั้งหมด − เงินออกที่บันทึกในระบบ ·
              ถ้ายังลงเงินออกไม่ครบ ให้พิมพ์ยอดจริงในช่องด้านบน แล้วระบบจะคำนวณให้ใหม่
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  tone,
  sign,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: string;
  sign?: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className={cn("font-mono tabular-nums", tone)}>
        {sign && value !== 0 ? `${sign} ` : ""}{formatBaht(Math.abs(value))}
      </span>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block rounded-md px-1 py-0.5 transition hover:bg-accent/40">
        {inner}
      </Link>
    );
  }
  return <div className="px-1">{inner}</div>;
}
