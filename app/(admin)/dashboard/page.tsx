import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users, Factory, TrendingUp } from "lucide-react";
import { formatBaht } from "@/lib/utils";
import { KanbanBoard } from "@/components/jobs/kanban-board";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ count: jobCount }, { count: customerCount }, { count: factoryCount }, { data: jobs }] = await Promise.all([
    supabase.from("jobs").select("*", { count: "exact", head: true }).neq("status", "completed").neq("status", "cancelled"),
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase.from("factories").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("jobs")
      .select("id, job_code, status, priority, quantity, sale_price, due_date, customers(name)")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const monthSale = (jobs ?? [])
    .filter((j) => j.status !== "cancelled")
    .reduce((sum, j) => sum + Number(j.sale_price ?? 0), 0);

  return (
    <div className="container space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">ภาพรวมงานทั้งหมดของร้าน</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="งานที่กำลังทำ" value={jobCount ?? 0} icon={Briefcase} accent="text-orange-400" />
        <StatCard label="ลูกค้าทั้งหมด" value={customerCount ?? 0} icon={Users} accent="text-blue-400" />
        <StatCard label="โรงงานที่ใช้งาน" value={factoryCount ?? 0} icon={Factory} accent="text-purple-400" />
        <StatCard label="ยอดขายรวม" value={formatBaht(monthSale)} icon={TrendingUp} accent="text-emerald-400" />
      </section>

      <section>
        <KanbanBoard initialJobs={jobs ?? []} />
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-5 w-5 ${accent}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
