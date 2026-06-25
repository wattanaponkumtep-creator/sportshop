import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  TrendingUp,
  HandCoins,
  Receipt,
  Wallet,
  Scale,
  ArrowDownToLine,
  ArrowUpFromLine,
  PiggyBank,
  FileClock,
  PieChart,
  Sparkles,
  Palette,
  Truck,
} from "lucide-react";
import { getFinanceData } from "@/lib/reports/finance";
import { pctChange, formatPct, type FinanceRange } from "@/lib/reports/queries";
import { formatBaht, cn } from "@/lib/utils";
import { TrendChart } from "@/components/reports/trend-chart";
import { DonutChart } from "@/components/reports/donut-chart";
import { FinanceRangeTabs } from "@/components/reports/finance-range-tabs";
import { ExpenseManager } from "@/components/reports/expense-manager";
import { EXPENSE_CATEGORY_LABEL, EXPENSE_CATEGORY_EMOJI } from "@/lib/constants";

export const dynamic = "force-dynamic";

// สีสำหรับ donut
const EXPENSE_COLORS: Record<string, string> = {
  factory: "#fb923c", material: "#22d3ee", shipping: "#60a5fa", rent: "#a78bfa",
  salary: "#34d399", marketing: "#f472b6", utility: "#fbbf24", equipment: "#94a3b8", other: "#64748b",
};
const INCOME_PALETTE = ["#f97316", "#06b6d4", "#22c55e", "#a855f7", "#ec4899", "#eab308", "#3b82f6", "#64748b"];

export default async function FinanceReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range = (["this_month", "3_months", "ytd", "all"].includes(rangeParam ?? "")
    ? rangeParam
    : "this_month") as FinanceRange;

  const data = await getFinanceData(range);
  const s = data.summary;

  // For this_month, compute MoM change vs last month
  const showMoM = range === "this_month";
  const cashInChange = showMoM ? pctChange(data.monthly[5].cashIn, data.monthly[4].cashIn) : 0;
  const cashOutChange = showMoM ? pctChange(data.monthly[5].cashOut, data.monthly[4].cashOut) : 0;

  const expenseSlices = data.expenseByCategory.map((c) => ({
    label: EXPENSE_CATEGORY_LABEL[c.category] ?? c.category,
    value: c.amount,
    color: EXPENSE_COLORS[c.category] ?? "#64748b",
  }));
  const incomeSlices = data.incomeByType.map((c, i) => ({
    label: c.type,
    value: c.amount,
    color: INCOME_PALETTE[i % INCOME_PALETTE.length],
  }));

  return (
    <div className="container space-y-6 p-3 sm:space-y-8 sm:p-4 md:p-8">
      <header className="space-y-3">
        <Link href="/reports" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> รายงานภาพรวม
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
              <Wallet className="h-7 w-7 text-emerald-400" /> รายงานการเงิน
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              เงินเข้า · เงินออก · กำไรขาดทุน — <span className="font-medium text-foreground">{data.rangeLabel}</span>
            </p>
          </div>
          <FinanceRangeTabs current={range} />
        </div>
      </header>

      {/* ============ 1. เอกสารรอดำเนินการ ============ */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold sm:text-xl">📑 รอดำเนินการ</h2>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <PendingCard
            href="/inquiries"
            icon={Sparkles}
            tone="text-amber-400"
            label="ใบขอราคาใหม่"
            value={`${data.pending.inquiries} ราย`}
          />
          <PendingCard
            href="/jobs?status=awaiting_approval"
            icon={Palette}
            tone="text-purple-400"
            label="รออนุมัติแบบ"
            value={`${data.pending.awaitingApproval} งาน`}
          />
          <PendingCard
            href="/jobs?status=ready_to_ship"
            icon={Truck}
            tone="text-cyan-400"
            label="รอจัดส่ง"
            value={`${data.pending.readyToShip} งาน`}
          />
          <PendingCard
            href="/jobs"
            icon={FileClock}
            tone="text-rose-400"
            label="รอเก็บเงิน"
            value={`${data.pending.unpaidCount} งาน`}
            sub={formatBaht(data.pending.unpaidAmount)}
          />
        </div>
      </section>

      {/* ============ 2. กระแสเงินสด ============ */}
      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-bold sm:text-xl">💰 กระแสเงินสด (Cash Flow)</h2>
          <p className="text-xs text-muted-foreground">เงินเข้า-ออกจริง — {data.rangeLabel}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <BigCard
            label="เงินเข้า" value={formatBaht(s.cashIn)}
            sub={showMoM ? `${formatPct(cashInChange)} เทียบเดือนก่อน` : undefined}
            subPositive={cashInChange >= 0} icon={ArrowDownToLine} tone="emerald"
          />
          <BigCard
            label="เงินออก" value={formatBaht(s.cashOut)}
            sub={showMoM ? `${formatPct(cashOutChange)} เทียบเดือนก่อน` : undefined}
            subPositive={cashOutChange <= 0} icon={ArrowUpFromLine} tone="rose"
          />
          <BigCard
            label="กระแสเงินสดสุทธิ" value={formatBaht(s.netCash)}
            sub={s.netCash >= 0 ? "เงินสดเพิ่มขึ้น 📈" : "เงินสดลดลง 📉"}
            subPositive={s.netCash >= 0} icon={Scale}
            tone={s.netCash >= 0 ? "emerald" : "rose"} highlight
          />
        </div>
      </section>

      {/* ============ 3. กำไรขาดทุน (P&L) ============ */}
      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-bold sm:text-xl">📊 กำไรขาดทุน (P&amp;L)</h2>
          <p className="text-xs text-muted-foreground">รายได้ − ต้นทุนงาน − ค่าใช้จ่ายร้าน = กำไรสุทธิ</p>
        </div>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="mx-auto max-w-lg space-y-2.5">
              <PnlRow label="รายได้ (ยอดขายสุทธิ)" value={s.revenue} tone="text-emerald-400" sign="+" />
              <PnlRow label="ต้นทุนงาน (ผ้า+ผลิต+ส่ง+อื่น)" value={s.cogs} tone="text-rose-400" sign="−" />
              <div className="border-t border-border pt-2.5">
                <PnlRow label="กำไรขั้นต้น (Gross Profit)" value={s.grossProfit}
                  tone={s.grossProfit >= 0 ? "text-emerald-400" : "text-rose-400"} bold />
                <div className="mt-1 text-right text-xs text-muted-foreground">
                  Margin {s.grossMargin.toFixed(1)}%
                </div>
              </div>
              <PnlRow label="ค่าใช้จ่ายร้าน (เช่า/เงินเดือน/การตลาด ฯลฯ)" value={s.operatingExpenses} tone="text-rose-400" sign="−" />
              <div className="mt-1 rounded-lg border-2 border-emerald-500/30 bg-emerald-500/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-display text-base font-bold">กำไรสุทธิ (Net Profit)</span>
                  <span className={cn("font-display text-xl font-bold tabular-nums sm:text-2xl",
                    s.netProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {s.netProfit < 0 ? "-" : ""}{formatBaht(Math.abs(s.netProfit))}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{s.netProfit >= 0 ? "✅ มีกำไร" : "⚠️ ขาดทุน"}</span>
                  <span>Net Margin {s.netMargin.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ============ 4. Donut charts ============ */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold sm:text-xl">🍩 สัดส่วนรายรับ-รายจ่าย</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <PieChart className="h-4 w-4 text-emerald-400" /> รายรับแยกตามประเภท
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart slices={incomeSlices} centerLabel="รายรับ" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <PieChart className="h-4 w-4 text-rose-400" /> รายจ่ายแยกตามหมวด
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart slices={expenseSlices} centerLabel="รายจ่าย" />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============ 5. แนวโน้ม 6 เดือน ============ */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold sm:text-xl">📈 แนวโน้ม 6 เดือน</h2>
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
                  { key: "in", label: "เงินเข้า", color: "bg-emerald-500", textColor: "text-emerald-400", values: data.monthly.map((m) => m.cashIn) },
                  { key: "out", label: "เงินออก", color: "bg-rose-500", textColor: "text-rose-400", values: data.monthly.map((m) => m.cashOut) },
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
                  { key: "rev", label: "รายได้", color: "bg-orange-500", textColor: "text-orange-400", values: data.monthly.map((m) => m.revenue) },
                  { key: "cogs", label: "ต้นทุน", color: "bg-rose-500", textColor: "text-rose-400", values: data.monthly.map((m) => m.cogs) },
                  { key: "gp", label: "กำไร", color: "bg-emerald-500", textColor: "text-emerald-400", values: data.monthly.map((m) => m.grossProfit) },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============ 6. บันทึกเงินออก ============ */}
      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-bold sm:text-xl">✍️ บันทึกเงินออก</h2>
          <p className="text-xs text-muted-foreground">
            บันทึกทุกครั้งที่จ่ายเงิน เพื่อให้กระแสเงินสด + กำไรสุทธิแม่นยำ
          </p>
        </div>
        <ExpenseManager recent={data.recentExpenses} />
      </section>

      <footer className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        <PiggyBank className="h-4 w-4" />
        💡 หมวด &quot;จ่ายโรงงาน/ค่าผ้า/ค่าขนส่ง&quot; ถือเป็นต้นทุนงาน — ส่วนอื่นเป็นค่าใช้จ่ายร้าน (หักจากกำไรสุทธิ)
      </footer>
    </div>
  );
}

function PendingCard({
  href, icon: Icon, tone, label, value, sub,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition hover:border-primary/50">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground sm:text-xs">{label}</span>
            <Icon className={cn("h-4 w-4", tone)} />
          </div>
          <div className="mt-1 text-lg font-bold sm:text-xl">{value}</div>
          {sub && <div className="text-xs text-rose-400">{sub}</div>}
        </CardContent>
      </Card>
    </Link>
  );
}

function BigCard({
  label, value, sub, subPositive, icon: Icon, tone, highlight,
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
          <div className={cn("mt-1 text-xs", subPositive === false ? "text-rose-400" : "text-muted-foreground")}>{sub}</div>
        )}
      </CardContent>
    </Card>
  );
}

function PnlRow({
  label, value, tone, sign, bold,
}: {
  label: string;
  value: number;
  tone?: string;
  sign?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={cn("text-sm", bold ? "font-semibold" : "text-muted-foreground")}>{label}</span>
      <span className={cn("shrink-0 font-mono tabular-nums", bold ? "text-lg font-bold" : "text-sm", tone)}>
        {sign && value !== 0 ? `${sign} ` : ""}{formatBaht(Math.abs(value))}
      </span>
    </div>
  );
}
