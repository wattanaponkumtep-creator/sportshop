import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  AlertTriangle,
  Users,
  Factory,
  Wallet,
  HandCoins,
  Tag,
  Receipt,
  Percent,
  CalendarRange,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { getReportData, pctChange, formatPct } from "@/lib/reports/queries";
import { formatBaht, cn } from "@/lib/utils";
import { BarChart } from "@/components/reports/bar-chart";
import { StatusDistribution } from "@/components/reports/status-distribution";
import { AgingCard } from "@/components/reports/aging-card";
import { TrendChart } from "@/components/reports/trend-chart";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const data = await getReportData();

  const revChange = pctChange(data.thisMonth.revenue, data.lastMonth.revenue);
  const profitChange = pctChange(data.thisMonth.profit, data.lastMonth.profit);
  const cashChange = pctChange(data.thisMonth.cashIn, data.lastMonth.cashIn);
  const margin =
    data.thisMonth.revenue > 0 ? (data.thisMonth.profit / data.thisMonth.revenue) * 100 : 0;
  const ytdMargin = data.ytd.revenue > 0 ? (data.ytd.profit / data.ytd.revenue) * 100 : 0;
  const avgOrderValue =
    data.thisMonth.closedCount > 0 ? data.thisMonth.revenue / data.thisMonth.closedCount : 0;

  return (
    <div className="container space-y-6 p-3 sm:space-y-8 sm:p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">วิเคราะห์ธุรกิจ</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight md:text-3xl">รายงาน / Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ภาพรวมยอดขาย กำไร เงินสด และผลการดำเนินงาน — ข้อมูล 6 เดือนล่าสุด
          </p>
        </div>
        <Link
          href="/reports/finance"
          className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:shadow-emerald-500/40"
        >
          <Wallet className="h-4 w-4" /> รายงานการเงิน (เงินเข้า-ออก)
        </Link>
      </header>

      {/* ============================== */}
      {/* 1. ภาพรวมเดือนนี้ (KPIs)         */}
      {/* ============================== */}
      <Section title="ภาพรวมเดือนนี้" subtitle="KPI หลัก เทียบกับเดือนก่อน">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <KpiCard
            label="ยอดขายสุทธิ"
            value={formatBaht(data.thisMonth.revenue)}
            changeText={formatPct(revChange)}
            changePositive={revChange >= 0}
            icon={DollarSign}
            iconColor="text-emerald-400"
            hint={`เดือนก่อน ${formatBaht(data.lastMonth.revenue)}`}
          />
          <KpiCard
            label="กำไรสุทธิ"
            value={formatBaht(data.thisMonth.profit)}
            changeText={formatPct(profitChange)}
            changePositive={profitChange >= 0}
            icon={TrendingUp}
            iconColor="text-orange-400"
            hint={`Margin: ${margin.toFixed(1)}%`}
          />
          <KpiCard
            label="เงินสดเข้า"
            value={formatBaht(data.thisMonth.cashIn)}
            changeText={formatPct(cashChange)}
            changePositive={cashChange >= 0}
            icon={HandCoins}
            iconColor="text-cyan-400"
            hint={`เดือนก่อน ${formatBaht(data.lastMonth.cashIn)}`}
          />
          <KpiCard
            label="งานปิด"
            value={data.thisMonth.closedCount.toString()}
            changeText={`งานใหม่ ${data.thisMonth.newCount} · ก่อน ${data.lastMonth.closedCount}`}
            icon={Briefcase}
            iconColor="text-blue-400"
          />
        </div>
      </Section>

      {/* ============================== */}
      {/* 2. ค่าใช้จ่าย & รายละเอียดเดือนนี้ */}
      {/* ============================== */}
      <Section title="รายละเอียดต้นทุน & ยอด" subtitle="แยกค่าใช้จ่ายและตัวเลขสำคัญ">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <KpiCard
            label="ต้นทุนรวม"
            value={formatBaht(data.thisMonth.cost)}
            icon={Receipt}
            iconColor="text-rose-400"
            hint="ต้นทุน+ค่าส่ง+ค่าอื่น"
          />
          <KpiCard
            label="ส่วนลดที่ให้"
            value={formatBaht(data.thisMonth.discount)}
            icon={Tag}
            iconColor="text-purple-400"
          />
          <KpiCard
            label="มูลค่าเฉลี่ย/งาน"
            value={formatBaht(avgOrderValue)}
            icon={Percent}
            iconColor="text-amber-400"
            hint="Average Order Value"
          />
          <KpiCard
            label="งานเลยกำหนด"
            value={data.overdueCount.toString()}
            changeText={data.overdueCount > 0 ? "ต้องเร่ง" : "ไม่มี"}
            changePositive={data.overdueCount === 0}
            icon={AlertTriangle}
            iconColor="text-red-400"
          />
        </div>
      </Section>

      {/* ============================== */}
      {/* 3. ภาพรวมตั้งแต่ต้นปี (YTD)      */}
      {/* ============================== */}
      <Section title="ผลประกอบการตั้งแต่ต้นปี" subtitle="Year-to-Date">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <KpiCard
            label="ยอดขาย YTD"
            value={formatBaht(data.ytd.revenue)}
            icon={CalendarRange}
            iconColor="text-emerald-400"
          />
          <KpiCard
            label="กำไร YTD"
            value={formatBaht(data.ytd.profit)}
            icon={TrendingUp}
            iconColor="text-orange-400"
            hint={`Margin: ${ytdMargin.toFixed(1)}%`}
          />
          <KpiCard
            label="เงินสดเข้า YTD"
            value={formatBaht(data.ytd.cashIn)}
            icon={HandCoins}
            iconColor="text-cyan-400"
          />
          <KpiCard
            label="งานปิด YTD"
            value={data.ytd.closedCount.toString()}
            icon={Briefcase}
            iconColor="text-blue-400"
          />
        </div>
      </Section>

      {/* ============================== */}
      {/* 4. แนวโน้ม 6 เดือน (Charts)      */}
      {/* ============================== */}
      <Section title="แนวโน้ม 6 เดือน" subtitle="เปรียบเทียบยอดขาย กำไร และเงินสด">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-orange-400" /> ยอดขาย vs กำไร
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                data={data.monthly.map((m) => ({
                  label: m.label,
                  value: m.revenue,
                  secondaryValue: m.profit,
                }))}
                primaryColor="bg-orange-500"
                secondaryColor="bg-emerald-500"
                primaryLabel="ยอดขาย"
                secondaryLabel="กำไร"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <HandCoins className="h-4 w-4 text-cyan-400" /> เงินสดเข้า vs ต้นทุน vs ส่วนลด
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                labels={data.monthly.map((m) => m.label)}
                series={[
                  {
                    key: "cashIn",
                    label: "เงินสดเข้า",
                    color: "bg-cyan-500",
                    textColor: "text-cyan-400",
                    values: data.monthly.map((m) => m.cashIn),
                  },
                  {
                    key: "cost",
                    label: "ต้นทุน",
                    color: "bg-rose-500",
                    textColor: "text-rose-400",
                    values: data.monthly.map((m) => m.cost),
                  },
                  {
                    key: "discount",
                    label: "ส่วนลด",
                    color: "bg-purple-500",
                    textColor: "text-purple-400",
                    values: data.monthly.map((m) => m.discount),
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* ============================== */}
      {/* 5. เงินรอเก็บ + อายุหนี้         */}
      {/* ============================== */}
      <Section title="เงินค้างชำระ" subtitle="แยกตามอายุหนี้ + ลูกค้าที่ค้างมากที่สุด">
        <div className="grid gap-4 lg:grid-cols-2">
          <AgingCard
            total={data.outstanding.total}
            aging={data.outstanding.aging}
            customers={data.outstanding.customers}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">การกระจายของสถานะงาน</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusDistribution data={data.statusDistribution} />
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* ============================== */}
      {/* 6. การดำเนินงาน                  */}
      {/* ============================== */}
      <Section title="การดำเนินงาน" subtitle="ประสิทธิภาพการทำงาน">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <KpiCard
            label="งานที่กำลังทำ"
            value={data.operations.activeJobs.toString()}
            icon={Activity}
            iconColor="text-cyan-400"
            hint="ยังไม่ปิด/ส่ง"
          />
          <KpiCard
            label="อัตราการปิดงาน"
            value={`${data.operations.completionRate.toFixed(1)}%`}
            changePositive={data.operations.completionRate >= 80}
            icon={CheckCircle2}
            iconColor="text-emerald-400"
            hint="ปิด ÷ (ปิด+ยกเลิก) YTD"
          />
          <KpiCard
            label="เวลาผลิตเฉลี่ย"
            value={`${data.operations.avgProductionDays.toFixed(1)} วัน`}
            icon={Clock}
            iconColor="text-blue-400"
            hint="รับ → ปิดงาน"
          />
          <KpiCard
            label="ยกเลิก YTD"
            value={data.operations.cancelledYtd.toString()}
            changePositive={data.operations.cancelledYtd === 0}
            icon={XCircle}
            iconColor="text-rose-400"
          />
        </div>
      </Section>

      {/* ============================== */}
      {/* 7. ลูกค้า & โรงงาน               */}
      {/* ============================== */}
      <Section title="ลูกค้า & โรงงาน" subtitle="Top 5">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-blue-400" /> Top 5 ลูกค้า — ยอดขาย
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TopList
                items={data.topCustomers.map((c) => ({
                  id: c.id,
                  name: c.name,
                  primary: formatBaht(c.revenue),
                  secondary: `${c.count} งาน · กำไร ${formatBaht(c.profit)}`,
                  href: `/customers/${c.id}`,
                }))}
                emptyText="ยังไม่มีข้อมูลลูกค้า"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-emerald-400" /> Top 5 ลูกค้า — กำไรสูงสุด
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TopList
                items={data.topCustomersByProfit.map((c) => ({
                  id: c.id,
                  name: c.name,
                  primary: formatBaht(c.profit),
                  secondary: `ยอดขาย ${formatBaht(c.revenue)} · ${c.count} งาน`,
                  href: `/customers/${c.id}`,
                  accent: "text-emerald-400",
                }))}
                emptyText="ยังไม่มีข้อมูล"
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <Factory className="h-4 w-4 text-purple-400" /> Top 5 โรงงาน
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.topFactories.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground">ยังไม่มีข้อมูล</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-2">#</th>
                        <th className="pb-2 pr-2">โรงงาน</th>
                        <th className="pb-2 pr-2 text-right">งาน</th>
                        <th className="pb-2 pr-2 text-right">ต้นทุนรวม</th>
                        <th className="pb-2 pr-2 text-right">ยอดขาย</th>
                        <th className="pb-2 pr-2 text-right">กำไร</th>
                        <th className="pb-2 text-right">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topFactories.map((f, i) => (
                        <tr key={f.id} className="border-b border-border/40">
                          <td className="py-2 pr-2 text-muted-foreground">{i + 1}</td>
                          <td className="py-2 pr-2 font-medium">{f.name}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{f.jobs}</td>
                          <td className="py-2 pr-2 text-right font-mono tabular-nums text-rose-400">{formatBaht(f.cost)}</td>
                          <td className="py-2 pr-2 text-right font-mono tabular-nums">{formatBaht(f.revenue)}</td>
                          <td className="py-2 pr-2 text-right font-mono tabular-nums text-emerald-400">{formatBaht(f.profit)}</td>
                          <td className="py-2 text-right font-mono tabular-nums">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                f.margin >= 30 ? "border-emerald-500/40 text-emerald-300"
                                : f.margin >= 15 ? "border-amber-500/40 text-amber-300"
                                : "border-rose-500/40 text-rose-300",
                              )}
                            >
                              {f.margin.toFixed(1)}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Section>

      <footer className="text-center text-xs text-muted-foreground">
        ข้อมูล {data.totalJobsLast6Months} งานในช่วง 6 เดือนล่าสุด
      </footer>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function KpiCard({
  label,
  value,
  changeText,
  changePositive,
  icon: Icon,
  iconColor,
  hint,
}: {
  label: string;
  value: string;
  changeText?: string;
  changePositive?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="truncate text-[11px] text-muted-foreground sm:text-xs">{label}</div>
            <div className="truncate text-base font-bold sm:text-xl">{value}</div>
          </div>
          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-current/10", iconColor)}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>
        {changeText && (
          <div
            className={cn(
              "mt-2 inline-flex items-center gap-1 text-[10px] sm:text-xs",
              changePositive === true
                ? "text-emerald-400"
                : changePositive === false
                ? "text-red-400"
                : "text-muted-foreground",
            )}
          >
            {changePositive === true && <TrendingUp className="h-3 w-3" />}
            {changePositive === false && <TrendingDown className="h-3 w-3" />}
            <span className="truncate">{changeText}</span>
          </div>
        )}
        {hint && <div className="mt-1 truncate text-[10px] text-muted-foreground sm:text-xs">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function TopList({
  items,
  emptyText,
}: {
  items: {
    id: string;
    name: string;
    primary: string;
    secondary: string;
    href: string;
    accent?: string;
  }[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-muted-foreground">{emptyText}</p>;
  }
  return (
    <ol className="space-y-2">
      {items.map((it, i) => (
        <li key={it.id}>
          <Link
            href={it.href}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-card/40 p-3 transition hover:border-primary/50"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Badge variant="outline" className="shrink-0 tabular-nums">#{i + 1}</Badge>
              <div className="min-w-0">
                <div className="truncate font-medium">{it.name}</div>
                <div className="truncate text-xs text-muted-foreground">{it.secondary}</div>
              </div>
            </div>
            <span className={cn("shrink-0 font-mono font-semibold tabular-nums", it.accent)}>
              {it.primary}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
