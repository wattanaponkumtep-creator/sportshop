import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CHANNEL_LABEL } from "@/lib/constants";
import { formatDateTH } from "@/lib/utils";
import { Plus, Phone, MessageCircle } from "lucide-react";
import { CustomerSearch } from "@/components/customers/customer-search";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select("id, name, phone, primary_channel, created_at, jobs(count)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (q && q.trim()) {
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data: customers } = await query;

  return (
    <div className="container space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">ลูกค้า</h1>
          <p className="text-sm text-muted-foreground">รายชื่อลูกค้าทั้งหมด</p>
        </div>
        <Button asChild>
          <Link href="/customers/new">
            <Plus className="h-4 w-4" /> เพิ่มลูกค้า
          </Link>
        </Button>
      </header>

      <CustomerSearch defaultValue={q ?? ""} />

      {!customers || customers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-muted-foreground">{q ? "ไม่พบลูกค้าที่ค้นหา" : "ยังไม่มีลูกค้าในระบบ"}</p>
            <Button asChild variant="outline">
              <Link href="/customers/new">เพิ่มลูกค้าคนแรก</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="space-y-2 md:hidden">
            {customers.map((c) => {
              const jobCount = Array.isArray(c.jobs) && c.jobs[0]?.count ? c.jobs[0].count : 0;
              return (
                <Link key={c.id} href={`/customers/${c.id}`}>
                  <Card className="transition hover:border-primary/50">
                    <CardContent className="space-y-1.5 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium">{c.name}</div>
                        <Badge variant="secondary" className="shrink-0 tabular-nums">{jobCount} งาน</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {c.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {c.phone}
                          </span>
                        )}
                        <Badge variant="outline" className="gap-1">
                          <MessageCircle className="h-3 w-3" /> {CHANNEL_LABEL[c.primary_channel]}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>เบอร์โทร</TableHead>
                    <TableHead>ช่องทางหลัก</TableHead>
                    <TableHead className="text-right">จำนวนงาน</TableHead>
                    <TableHead className="hidden md:table-cell">เพิ่มเมื่อ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer">
                      <TableCell className="font-medium">
                        <Link href={`/customers/${c.id}`} className="hover:text-primary">{c.name}</Link>
                      </TableCell>
                      <TableCell>
                        {c.phone ? (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" /> {c.phone}
                          </span>
                        ) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <MessageCircle className="h-3 w-3" /> {CHANNEL_LABEL[c.primary_channel]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Array.isArray(c.jobs) && c.jobs[0]?.count ? c.jobs[0].count : 0}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {formatDateTH(c.created_at, "d MMM yy")}
                      </TableCell>
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
