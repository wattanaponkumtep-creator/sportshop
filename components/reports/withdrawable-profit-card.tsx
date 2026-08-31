import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownToLine, RefreshCw, CheckCircle2, Info } from "lucide-react";
import { formatBaht, cn } from "@/lib/utils";

export function WithdrawableProfitCard({
  withdrawableNow,
  realizedProfit,
  realizedCount,
  tiedUpAsCapital,
  effectiveCash,
  factoryPayable,
}: {
  withdrawableNow: number;
  realizedProfit: number;
  realizedCount: number;
  tiedUpAsCapital: number;
  effectiveCash: number;
  factoryPayable: number;
}) {
  const freeCash = effectiveCash - factoryPayable;
  const canWithdraw = withdrawableNow > 0;

  return (
    <div className="space-y-3">
      {/* ถอนได้จริงตอนนี้ */}
      <Card className={cn("border-2", canWithdraw ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5")}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowDownToLine className={cn("h-4 w-4", canWithdraw ? "text-emerald-400" : "text-amber-400")} />
                💰 ถอนออกมาใช้ได้จริง (ตอนนี้)
              </div>
              <div className={cn("mt-1 font-display text-3xl font-bold tabular-nums sm:text-4xl", canWithdraw ? "text-emerald-400" : "text-amber-400")}>
                {formatBaht(withdrawableNow)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                กำไรจากงานที่จบครบวงจร (ส่ง+เก็บครบ) โดยไม่กระทบทุนหมุน
              </div>
            </div>
            {canWithdraw ? (
              <CheckCircle2 className="hidden h-10 w-10 shrink-0 text-emerald-400/50 sm:block" />
            ) : (
              <RefreshCw className="hidden h-10 w-10 shrink-0 text-amber-400/50 sm:block" />
            )}
          </div>

          {/* เหตุผลว่าทำไมถอนได้เท่านี้ */}
          <div className="mt-3 rounded-lg border border-border bg-card/40 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">เงินสดตอนนี้</span>
              <span className="font-mono tabular-nums">{formatBaht(effectiveCash)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">− กันไว้สำรองจ่ายโรงงาน</span>
              <span className="font-mono tabular-nums text-rose-400">−{formatBaht(factoryPayable)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-border pt-1 font-medium">
              <span>= เงินสดเหลือ (ถอนได้)</span>
              <span className={cn("font-mono tabular-nums", freeCash >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {freeCash < 0 ? "-" : ""}{formatBaht(Math.abs(freeCash))}
              </span>
            </div>
            {freeCash < 0 && (
              <p className="mt-1.5 text-[11px] text-amber-300">
                ⚠️ เงินสดยังไม่พอสำรองจ่ายโรงงานด้วยซ้ำ — ต้องเก็บเงินลูกค้า/หาทุนหมุนก่อน ยังถอนไม่ได้
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* กำไรสะสม vs หมุนเป็นทุน */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="text-xs text-muted-foreground">✅ กำไรที่ทำได้แล้ว (งานจบครบวงจร)</div>
          <div className="mt-0.5 font-display text-xl font-bold tabular-nums text-emerald-400">{formatBaht(realizedProfit)}</div>
          <div className="text-[11px] text-muted-foreground">จาก {realizedCount} งานที่ส่งของ + ลูกค้าจ่ายครบ</div>
        </div>
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
          <div className="text-xs text-muted-foreground">🔄 กำลังหมุนเป็นทุน (ยังถอนไม่ได้)</div>
          <div className="mt-0.5 font-display text-xl font-bold tabular-nums text-cyan-400">{formatBaht(tiedUpAsCapital)}</div>
          <div className="text-[11px] text-muted-foreground">สำรองจ่ายโรงงาน / รอลูกค้าจ่ายกลับ</div>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-border bg-card/40 p-3 text-[11px] text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          โมเดลของคุณคือ <span className="font-medium">สำรองจ่ายโรงงานก่อน → ส่งของ → ลูกค้าจ่ายส่วนที่เหลือ</span> ·
          กำไรจะกลายเป็นเงินถอนได้ก็ต่อเมื่องานนั้นส่งของเสร็จและลูกค้าจ่ายครบ · ระหว่างนั้นกำไรจะหมุนเป็นทุนผลิตงานถัดไป
        </span>
      </div>
    </div>
  );
}
