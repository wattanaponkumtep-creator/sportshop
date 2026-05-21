import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, Factory, TrendingUp, Plus, ArrowRight } from "lucide-react";
import { cn, formatBaht } from "@/lib/utils";
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
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">ภาพรวมร้าน</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight md:text-3xl">สวัสดี 👋</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/customers/new"><Plus className="h-4 w-4" /> ลูกค้าใหม่</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/jobs/new"><Plus className="h-4 w-4" /> JOB ใหม่</Link>
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatCard label="งานที่กำลังทำ" value={jobCount ?? 0} icon={Briefcase} accent="orange" href="/jobs" />
        <StatCard label="ลูกค้าทั้งหมด" value={customerCount ?? 0} icon={Users} accent="blue" href="/customers" />
        <StatCard label="โรงงานใช้งาน" value={factoryCount ?? 0} icon={Factory} accent="purple" href="/factories" />
        <StatCard label="ยอดขายรวม" value={formatBaht(monthSale)} icon={TrendingUp} accent="emerald" href="/reports" />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold sm:text-lg">บอร์ดงาน (Kanban)</h2>
          <Link href="/jobs" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            ดูทั้งหมด <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <KanbanBoard initialJobs={jobs ?? []} />
      </section>
    </div>
  );
}

const ACCENTS = {
  orange: { bg: "bg-orange-500/10", text: "text-orange-400", ring: "ring-orange-500/20" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", ring: "ring-blue-500/20" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", ring: "ring-purple-500/20" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", ring: "ring-emerald-500/20" },
} as const;

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent: keyof typeof ACCENTS;
  href?: string;
}) {
  const a = ACCENTS[accent];
  const inner = (
    <Card className="transition hover:border-primary/40">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2.5">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", a.bg)}>
            <Icon className={cn("h-5 w-5", a.text)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-muted-foreground sm:text-xs">{label}</div>
            <div className="mt-0.5 truncate text-base font-bold sm:text-xl">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}
