import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Briefcase, AlertTriangle, Users, Factory } from "lucide-react";
import { getReportData, pctChange } from "@/lib/reports/queries";
import { formatBaht } from "@/lib/utils";
import { BarChart } from "@/components/reports/bar-chart";
import { StatusDistribution } from "@/components/reports/status-distribution";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const data = await getReportData();

  const revChange = pctChange(data.thisMonth.revenue, data.lastMonth.revenue);
  const profitChange = pctChange(data.thisMonth.profit, data.lastMonth.profit);
  const margin = data.thisMonth.revenue > 0 ? (data.thisMonth.profit / data.thisMonth.revenue) * 100 : 0;

  return (
    <div className="container space-y-6 p-4 md:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">รายงาน / Analytics</h1>
        <p className="text-sm text-muted-foreground">ภาพรวมยอดขายและการดำเนินงาน 6 เดือนล่าสุด</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="ยอดขายเดือนนี้"
          value={formatBaht(data.thisMonth.revenue)}
          changeText={`${revChange >= 0 ? "+" : ""}${revChange.toFixed(1)}%`}
          changePositive={revChange >= 0}
          icon={DollarSign}
          iconColor="text-emerald-400"
        />
        <KpiCard
          label="กำไรเดือนนี้"
          value={formatBaht(data.thisMonth.profit)}
          changeText={`${profitChange >= 0 ? "+" : ""}${profitChange.toFixed(1)}%`}
          changePositive={profitChange >= 0}
          icon={TrendingUp}
          iconColor="text-orange-400"
          hint={`Margin: ${margin.toFixed(1)}%`}
        />
        <KpiCard
          label="งานเดือนนี้"
          value={data.thisMonth.count.toString()}
          changeText={`เทียบเดือนที่แล้ว ${data.lastMonth.count} งาน`}
          icon={Briefcase}
          iconColor="text-blue-400"
        />
        <KpiCard
          label="งานเลยกำหนด"
          value={data.overdueCount.toString()}
          changeText={data.overdueCount > 0 ? "ต้องเร่ง" : "ไม่มี"}
          changePositive={data.overdueCount === 0}
          icon={AlertTriangle}
          iconColor="text-red-400"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ยอดขาย vs กำไร 6 เดือน</CardTitle>
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
            <CardTitle>การกระจายของสถานะงาน</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusDistribution data={data.statusDistribution} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" /> Top 5 ลูกค้า
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topCustomers.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">ยังไม่มีข้อมูล</p>
            ) : (
              <ol className="space-y-3">
                {data.topCustomers.map((c, i) => (
                  <li key={c.id}>
                    <Link
                      href={`/customers/${c.id}`}
                      className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3 transition hover:border-primary/50"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="tabular-nums">#{i + 1}</Badge>
                        <div>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.count} งาน</div>
                        </div>
                      </div>
                      <div className="text-right tabular-nums font-semibold">{formatBaht(c.revenue)}</div>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Factory className="h-5 w-5 text-purple-400" /> Top 5 โรงงานที่ใช้บ่อย
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topFactories.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">ยังไม่มีข้อมูล</p>
            ) : (
              <ol className="space-y-3">
                {data.topFactories.map((f, i) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="tabular-nums">#{i + 1}</Badge>
                      <div>
                        <div className="font-medium">{f.name}</div>
                        <div className="text-xs text-muted-foreground">{f.jobs} งาน · ต้นทุนรวม {formatBaht(f.cost)}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </section>

      <footer className="text-center text-xs text-muted-foreground">
        ข้อมูล {data.totalJobsLast6Months} งานในช่วง 6 เดือนล่าสุด
      </footer>
    </div>
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {changeText && (
          <div
            className={`mt-1 inline-flex items-center gap-1 text-xs ${
              changePositive === true ? "text-emerald-400" : changePositive === false ? "text-red-400" : "text-muted-foreground"
            }`}
          >
            {changePositive === true && <TrendingUp className="h-3 w-3" />}
            {changePositive === false && <TrendingDown className="h-3 w-3" />}
            {changeText}
          </div>
        )}
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
