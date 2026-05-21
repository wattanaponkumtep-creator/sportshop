import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JOB_STATUS_COLOR, JOB_STATUS_LABEL, PRIORITY_COLOR, PRIORITY_LABEL } from "@/lib/constants";
import { formatBaht, formatDateTH } from "@/lib/utils";
import { Plus, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, job_code, status, priority, quantity, sale_price, due_date, created_at, customers(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  const list = jobs ?? [];

  return (
    <div className="container space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">งาน / JOBs</h1>
          <p className="text-sm text-muted-foreground">รายการงานทั้งหมดของร้าน</p>
        </div>
        <Button asChild>
          <Link href="/jobs/new"><Plus className="h-4 w-4" /> เปิด JOB ใหม่</Link>
        </Button>
      </header>

      {list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-muted-foreground">ยังไม่มีงานในระบบ</p>
            <Button asChild><Link href="/jobs/new">เปิด JOB แรก</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: card view */}
          <div className="space-y-2 md:hidden">
            {list.map((j) => {
              const cust = (j.customers as { name: string } | null)?.name ?? "-";
              return (
                <Link key={j.id} href={`/jobs/${j.id}`}>
                  <Card className="transition hover:border-primary/50">
                    <CardContent className="space-y-2 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold">{j.job_code}</span>
                        <Badge className={PRIORITY_COLOR[j.priority]}>{PRIORITY_LABEL[j.priority]}</Badge>
                      </div>
                      <div className="text-sm">{cust}</div>
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className={JOB_STATUS_COLOR[j.status]}>{JOB_STATUS_LABEL[j.status]}</Badge>
                        <span className="text-sm font-semibold tabular-nums">{formatBaht(Number(j.sale_price))}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{j.quantity} ตัว</span>
                        {j.due_date && (
                          <span className="inline-flex items-center gap-1">
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
                  {list.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell>
                        <Link href={`/jobs/${j.id}`} className="font-mono font-medium hover:text-primary">{j.job_code}</Link>
                      </TableCell>
                      <TableCell>{(j.customers as { name: string } | null)?.name ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={JOB_STATUS_COLOR[j.status]}>{JOB_STATUS_LABEL[j.status]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={PRIORITY_COLOR[j.priority]}>{PRIORITY_LABEL[j.priority]}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{j.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatBaht(Number(j.sale_price))}</TableCell>
                      <TableCell className="text-muted-foreground">{j.due_date ? formatDateTH(j.due_date, "d MMM yy") : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
