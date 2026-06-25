import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  HandCoins,
  Receipt,
  Wallet,
  Scale,
  ArrowDownToLine,
  ArrowUpFromLine,
  PiggyBank,
} from "lucide-react";
import { getFinanceData } from "@/lib/reports/finance";
import { pctChange, formatPct } from "@/lib/reports/queries";
import { formatBaht, cn } from "@/lib/utils";
import { TrendChart } from "@/components/reports/trend-chart";
import { ExpenseManager } from "@/components/reports/expense-manager";
import { EXPENSE_CATEGORY_LABEL, EXPENSE_CATEGORY_EMOJI } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function FinanceReportPage() {
  const data = await getFinanceData();
  const { thisMonth, lastMonth, totals } = data;

  const cashInChange = pctChange(thisMonth.cashIn, lastMonth.cashIn);
  const cashOutChange = pctChange(thisMonth.cashOut, lastMonth.cashOut);
  const grossMargin = thisMonth.revenue > 0 ? (thisMonth.grossProfit / thisMonth.revenue) * 100 : 0;
  const totalExpenseSum = data.expenseByCategory.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="container space-y-6 p-3 sm:space-y-8 sm:p-4 md:p-8">
      <header>
        <Link href="/reports" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> รายงานภาพรวม
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
          <Wallet className="h-7 w-7 text-emerald-400" /> รายงานการเงิน
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          เงินเข้า · เงินออก · กำไรขาดทุน — ข้อมูล 6 เดือนล่าสุด
        </p>
      </header>

      {/* ============ 1. กระแสเงินสดเดือนนี้ ============ */}
      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-bold sm:text-xl">💰 กระแสเงินสดเดือนนี้ (Cash Flow)</h2>
          <p className="text-xs text-muted-foreground">เงินที่เข้า-ออกจริง จากการรับเงิน + บันทึกค่าใช้จ่าย</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <BigCard
            label="เงินเข้า"
            value={formatBaht(thisMonth.cashIn)}
            sub={`${formatPct(cashInChange)} เทียบเดือนก่อน`}
            subPositive={cashInChange >= 0}
            icon={ArrowDownToLine}
            tone="emerald"
          />
          <BigCard
            label="เงินออก"
            value={formatBaht(thisMonth.cashOut)}
            sub={`${formatPct(cashOutChange)} เทียบเดือนก่อน`}
            subPositive={cashOutChange <= 0}
            icon={ArrowUpFromLine}
            tone="rose"
          />
          <BigCard
            label="กระแสเงินสดสุทธิ"
            value={formatBaht(thisMonth.netCash)}
            sub={thisMonth.netCash >= 0 ? "เงินสดเพิ่มขึ้น 📈" : "เงินสดลดลง 📉"}
            subPositive={thisMonth.netCash >= 0}
            icon={Scale}
            tone={thisMonth.netCash >= 0 ? "emerald" : "rose"}
            highlight
          />
        </div>
      </section>

      {/* ============ 2. กำไรขาดทุน (P&L) เดือนนี้ ============ */}
      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-bold sm:text-xl">📊 กำไรขาดทุนเดือนนี้ (P&amp;L)</h2>
          <p className="text-xs text-muted-foreground">คำนวณจากงานที่ปิด (ส่ง/เสร็จ) ในเดือนนี้</p>
        </div>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="mx-auto max-w-md space-y-2.5">
              <PnlRow label="รายได้ (ยอดขายสุทธิ)" value={thisMonth.revenue} tone="text-emerald-400" sign="+" />
              <PnlRow label="ต้นทุนขาย (ผ้า+ผลิต+ส่ง+อื่น)" value={thisMonth.cogs} tone="text-rose-400" sign="−" />
              <div className="border-t border-border pt-2.5">
                <PnlRow
                  label="กำไรขั้นต้น (Gross Profit)"
                  value={thisMonth.grossProfit}
                  tone={thisMonth.grossProfit >= 0 ? "text-emerald-400" : "text-rose-400"}
                  bold
                />
              </div>
              <div className="mt-2 flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">อัตรากำไรขั้นต้น (Margin)</span>
                <Badge
                  className={cn(
                    grossMargin >= 30 ? "bg-emerald-500/20 text-emerald-300"
                    : grossMargin >= 15 ? "bg-amber-500/20 text-amber-300"
                    : "bg-rose-500/20 text-rose-300",
                  )}
                >
                  {grossMargin.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ============ 3. แนวโน้ม 6 เดือน ============ */}
      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-bold sm:text-xl">📈 แนวโน้ม 6 เดือน</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <HandCoins className="h-4 w-4 text-cyan-400" /> เงินเข้า vs เงินออก
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                labels={data.monthly.map((m) => m.label)}
                series={[
                  {
                    key: "in",
                    label: "เงินเข้า",
                    color: "bg-emerald-500",
                    textColor: "text-emerald-400",
                    values: data.monthly.map((m) => m.cashIn),
                  },
                  {
                    key: "out",
                    label: "เงินออก",
                    color: "bg-rose-500",
                    textColor: "text-rose-400",
                    values: data.monthly.map((m) => m.cashOut),
                  },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-orange-400" /> รายได้ vs ต้นทุน vs กำไร
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                labels={data.monthly.map((m) => m.label)}
                series={[
                  {
                    key: "rev",
                    label: "รายได้",
                    color: "bg-orange-500",
                    textColor: "text-orange-400",
                    values: data.monthly.map((m) => m.revenue),
                  },
                  {
                    key: "cogs",
                    label: "ต้นทุน",
                    color: "bg-rose-500",
                    textColor: "text-rose-400",
                    values: data.monthly.map((m) => m.cogs),
                  },
                  {
                    key: "gp",
                    label: "กำไร",
                    color: "bg-emerald-500",
                    textColor: "text-emerald-400",
                    values: data.monthly.map((m) => m.grossProfit),
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============ 4. สรุป 6 เดือน + ค่าใช้จ่ายแยกหมวด ============ */}
      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-bold sm:text-xl">🧾 สรุป 6 เดือน</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* 6-month totals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ยอดรวม 6 เดือน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <PnlRow label="เงินเข้ารวม" value={totals.cashIn} tone="text-emerald-400" sign="+" />
              <PnlRow label="เงินออกรวม" value={totals.cashOut} tone="text-rose-400" sign="−" />
              <div className="border-t border-border pt-2.5">
                <PnlRow
                  label="กระแสเงินสดสุทธิรวม"
                  value={totals.netCash}
                  tone={totals.netCash >= 0 ? "text-emerald-400" : "text-rose-400"}
                  bold
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-center">
                <div>
                  <div className="text-[10px] text-muted-foreground">รายได้รวม (P&amp;L)</div>
                  <div className="font-mono text-sm font-bold">{formatBaht(totals.revenue)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">กำไรขั้นต้นรวม</div>
                  <div className={cn("font-mono text-sm font-bold", totals.grossProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {formatBaht(totals.grossProfit)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expense by category */}
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <Receipt className="h-4 w-4 text-rose-400" /> เงินออกแยกหมวด (6 เดือน)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.expenseByCategory.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  ยังไม่มีบันทึกค่าใช้จ่าย — เพิ่มด้านล่าง
                </p>
              ) : (
                <div className="space-y-2">
                  {data.expenseByCategory.map((c) => {
                    const pct = totalExpenseSum > 0 ? (c.amount / totalExpenseSum) * 100 : 0;
                    return (
                      <div key={c.category}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span>{EXPENSE_CATEGORY_EMOJI[c.category]} {EXPENSE_CATEGORY_LABEL[c.category]}</span>
                          <span className="font-mono">{formatBaht(c.amount)} <span className="text-xs text-muted-foreground">({pct.toFixed(0)}%)</span></span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-rose-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============ 5. บันทึกเงินออก ============ */}
      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-bold sm:text-xl">✍️ บันทึกเงินออก</h2>
          <p className="text-xs text-muted-foreground">
            บันทึกทุกครั้งที่จ่ายเงิน (จ่ายโรงงาน, ค่าผ้า, ค่าเช่า ฯลฯ) เพื่อให้กระแสเงินสดแม่นยำ
          </p>
        </div>
        <ExpenseManager recent={data.recentExpenses} />
      </section>

      <footer className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        <PiggyBank className="h-4 w-4" />
        💡 ยิ่งบันทึกเงินออกครบ กระแสเงินสด + กำไรขาดทุนยิ่งแม่นยำ
      </footer>
    </div>
  );
}

function BigCard({
  label,
  value,
  sub,
  subPositive,
  icon: Icon,
  tone,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  subPositive?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  tone: "emerald" | "rose";
  highlight?: boolean;
}) {
  const toneText = tone === "emerald" ? "text-emerald-400" : "text-rose-400";
  return (
    <Card className={cn(highlight && "border-2", highlight && (tone === "emerald" ? "border-emerald-500/40" : "border-rose-500/40"))}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className={cn("h-5 w-5", toneText)} />
        </div>
        <div className={cn("mt-1 font-display text-2xl font-bold tabular-nums sm:text-3xl", toneText)}>{value}</div>
        {sub && (
          <div className={cn("mt-1 text-xs", subPositive === false ? "text-rose-400" : "text-muted-foreground")}>
            {sub}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PnlRow({
  label,
  value,
  tone,
  sign,
  bold,
}: {
  label: string;
  value: number;
  tone?: string;
  sign?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-sm", bold ? "font-semibold" : "text-muted-foreground")}>{label}</span>
      <span className={cn("font-mono tabular-nums", bold ? "text-lg font-bold" : "text-sm", tone)}>
        {sign && value !== 0 ? `${sign} ` : ""}
        {formatBaht(Math.abs(value))}
      </span>
    </div>
  );
}
