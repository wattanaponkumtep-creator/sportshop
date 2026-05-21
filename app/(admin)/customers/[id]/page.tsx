import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CHANNEL_LABEL, JOB_STATUS_COLOR, JOB_STATUS_LABEL } from "@/lib/constants";
import { formatBaht, formatDateTH } from "@/lib/utils";
import { ArrowLeft, Phone, Plus } from "lucide-react";
import { CustomerChannels } from "@/components/customers/customer-channels";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!customer) notFound();

  const [{ data: channels }, { data: jobs }] = await Promise.all([
    supabase.from("customer_channels").select("*").eq("customer_id", id).order("created_at"),
    supabase
      .from("jobs")
      .select("id, job_code, status, quantity, sale_price, due_date, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="container space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-8">
      <Link href="/customers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> ลูกค้าทั้งหมด
      </Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{customer.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {customer.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {customer.phone}
              </span>
            )}
            <Badge variant="outline">{CHANNEL_LABEL[customer.primary_channel]}</Badge>
            <span>เพิ่มเมื่อ {formatDateTH(customer.created_at, "d MMM yy")}</span>
          </div>
        </div>
        <Button asChild>
          <Link href={`/jobs/new?customer=${customer.id}`}>
            <Plus className="h-4 w-4" /> เปิด JOB ใหม่
          </Link>
        </Button>
      </header>

      <Tabs defaultValue="channels">
        <div className="-mx-3 overflow-x-auto sm:mx-0">
          <TabsList className="ml-3 inline-flex h-10 w-max gap-1 sm:ml-0">
            <TabsTrigger value="channels">ช่องทางติดต่อ ({channels?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="jobs">ประวัติ JOB ({jobs?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="note">หมายเหตุ</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="channels" className="mt-4">
          <CustomerChannels customerId={customer.id} channels={channels ?? []} />
        </TabsContent>

        <TabsContent value="jobs" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {jobs && jobs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>JOB</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="text-right">จำนวน</TableHead>
                      <TableHead className="text-right">ยอดขาย</TableHead>
                      <TableHead>กำหนดส่ง</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((j) => (
                      <TableRow key={j.id}>
                        <TableCell>
                          <Link href={`/jobs/${j.id}`} className="font-mono font-medium hover:text-primary">
                            {j.job_code}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={JOB_STATUS_COLOR[j.status]}>{JOB_STATUS_LABEL[j.status]}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{j.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatBaht(Number(j.sale_price))}</TableCell>
                        <TableCell className="text-muted-foreground">{j.due_date ? formatDateTH(j.due_date, "d MMM yy") : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="p-8 text-center text-muted-foreground">ยังไม่มีงานของลูกค้าคนนี้</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="note" className="mt-4">
          <Card>
            <CardHeader><CardTitle>หมายเหตุ</CardTitle></CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {customer.note || "ยังไม่มีหมายเหตุ"}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
