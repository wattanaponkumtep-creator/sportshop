import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JOB_STATUS_COLOR, JOB_STATUS_LABEL, PRIORITY_COLOR, PRIORITY_LABEL } from "@/lib/constants";
import { formatBaht, formatDateTH } from "@/lib/utils";
import { Plus, Calendar, AlertTriangle } from "lucide-react";
import { JobsFilterBar } from "@/components/jobs/jobs-filter-bar";
import type { JobStatus, PriorityLevel } from "@/lib/types/database";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  status?: string;
  priority?: string;
  factory?: string;
  overdue?: string;
};

export default async function JobsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = sp.status ?? "all";
  const priority = sp.priority ?? "all";
  const factory = sp.factory ?? "all";
  const overdue = sp.overdue === "true";

  const supabase = await createClient();

  // Build the query with all filters
  let query = supabase
    .from("jobs")
    .select("id, job_code, status, priority, quantity, sale_price, due_date, created_at, product_type, customer_id, factory_id, customers(name)")
    .order("created_at", { ascending: false })
    .limit(500);

  if (status !== "all") query = query.eq("status", status as JobStatus);
  if (priority !== "all") query = query.eq("priority", priority as PriorityLevel);

  if (factory === "none") query = query.is("factory_id", null);
  else if (factory !== "all") query = query.eq("factory_id", factory);

  if (overdue) {
    const today = new Date().toISOString().slice(0, 10);
    query = query.lt("due_date", today).not("status", "in", '("completed","shipped","cancelled")');
  }

  if (q) {
    // Search by job_code or product_type. Customer name filter handled below in JS.
    query = query.or(`job_code.ilike.%${q}%,product_type.ilike.%${q}%`);
  }

  const { data: jobsData } = await query;
  let jobs = jobsData ?? [];

  // Client-side filter by customer name if `q` was provided
  // (Supabase nested filter on customers(name) requires more complex setup)
  if (q && jobs.length > 0) {
    // Fetch customers matching q and merge with jobs
    const { data: matched } = await supabase
      .from("customers")
      .select("id")
      .ilike("name", `%${q}%`);
    const matchedIds = new Set((matched ?? []).map((c) => c.id as string));

    // Include both: jobs that already matched (by code/product), and jobs whose customer name matches q
    const allJobs = await supabase
      .from("jobs")
      .select("id, job_code, status, priority, quantity, sale_price, due_date, created_at, product_type, customer_id, factory_id, customers(name)")
      .in("customer_id", Array.from(matchedIds.size > 0 ? matchedIds : ["00000000-0000-0000-0000-000000000000"]))
      .order("created_at", { ascending: false })
      .limit(500);

    const customerMatchJobs = allJobs.data ?? [];
    // Merge unique
    const seen = new Set(jobs.map((j) => j.id as string));
    for (const j of customerMatchJobs) {
      if (!seen.has(j.id as string)) {
        jobs.push(j);
        seen.add(j.id as string);
      }
    }
    // Re-apply filters that the new query didn't include
    if (status !== "all") jobs = jobs.filter((j) => j.status === status);
    if (priority !== "all") jobs = jobs.filter((j) => j.priority === priority);
    if (factory === "none") jobs = jobs.filter((j) => !j.factory_id);
    else if (factory !== "all") jobs = jobs.filter((j) => j.factory_id === factory);
    if (overdue) {
      const today = new Date().toISOString().slice(0, 10);
      jobs = jobs.filter((j) => j.due_date && j.due_date < today && !["completed", "shipped", "cancelled"].includes(j.status as string));
    }
  }

  const { data: factories } = await supabase.from("factories").select("id, name").order("name");
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="container space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">งาน / JOBs</h1>
          <p className="text-sm text-muted-foreground">รายการงานทั้งหมดของร้าน · พบ {jobs.length} รายการ</p>
        </div>
        <Button asChild>
          <Link href="/jobs/new"><Plus className="h-4 w-4" /> เปิด JOB ใหม่</Link>
        </Button>
      </header>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <JobsFilterBar
            defaultQ={q}
            defaultStatus={status}
            defaultPriority={priority}
            defaultFactory={factory}
            defaultOverdue={overdue}
            factories={factories ?? []}
          />
        </CardContent>
      </Card>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            {q || status !== "all" || priority !== "all" || overdue || factory !== "all" ? (
              <>
                <p className="text-muted-foreground">ไม่พบงานตามเงื่อนไขที่กรอง</p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/jobs">ล้างตัวกรอง</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">ยังไม่มีงานในระบบ</p>
                <Button asChild><Link href="/jobs/new">เปิด JOB แรก</Link></Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: card view */}
          <div className="space-y-2 md:hidden">
            {jobs.map((j) => {
              const cust = (j.customers as { name: string } | null)?.name ?? "-";
              const isOverdue = j.due_date && j.due_date < todayISO && !["completed", "shipped", "cancelled"].includes(j.status as string);
              return (
                <Link key={j.id} href={`/jobs/${j.id}`}>
                  <Card className={`transition hover:border-primary/50 ${isOverdue ? "border-destructive/40" : ""}`}>
                    <CardContent className="space-y-2 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold">{j.job_code}</span>
                        <div className="flex items-center gap-1">
                          {isOverdue && (
                            <Badge variant="destructive" className="gap-0.5 text-[10px]">
                              <AlertTriangle className="h-3 w-3" /> เลย
                            </Badge>
                          )}
                          <Badge className={PRIORITY_COLOR[j.priority as PriorityLevel]}>{PRIORITY_LABEL[j.priority as PriorityLevel]}</Badge>
                        </div>
                      </div>
                      <div className="text-sm">{cust}</div>
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className={JOB_STATUS_COLOR[j.status as JobStatus]}>{JOB_STATUS_LABEL[j.status as JobStatus]}</Badge>
                        <span className="text-sm font-semibold tabular-nums">{formatBaht(Number(j.sale_price))}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{j.quantity} ตัว</span>
                        {j.due_date && (
                          <span className={`inline-flex items-center gap-1 ${isOverdue ? "text-destructive" : ""}`}>
                            <Calendar className="h-3 w-3" /> {formatDateTH(j.due_date, "d MMM yy")}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Desktop: table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>JOB</TableHead>
                    <TableHead>ลูกค้า</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>ความสำคัญ</TableHead>
                    <TableHead className="text-right">จำนวน</TableHead>
                    <TableHead className="text-right">ยอดขาย</TableHead>
                    <TableHead>กำหนดส่ง</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => {
                    const isOverdue = j.due_date && j.due_date < todayISO && !["completed", "shipped", "cancelled"].includes(j.status as string);
                    return (
                      <TableRow key={j.id} className={isOverdue ? "bg-destructive/5" : ""}>
                        <TableCell>
                          <Link href={`/jobs/${j.id}`} className="font-mono font-medium hover:text-primary">{j.job_code}</Link>
                        </TableCell>
                        <TableCell>{(j.customers as { name: string } | null)?.name ?? "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={JOB_STATUS_COLOR[j.status as JobStatus]}>{JOB_STATUS_LABEL[j.status as JobStatus]}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={PRIORITY_COLOR[j.priority as PriorityLevel]}>{PRIORITY_LABEL[j.priority as PriorityLevel]}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{j.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatBaht(Number(j.sale_price))}</TableCell>
                        <TableCell>
                          {j.due_date ? (
                            <span className={`inline-flex items-center gap-1 ${isOverdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                              {isOverdue && <AlertTriangle className="h-3 w-3" />}
                              {formatDateTH(j.due_date, "d MMM yy")}
                            </span>
                          ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
