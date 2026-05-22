import { notFound } from "next/navigation";
import { Shirt, Package, Truck } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JOB_STATUS_COLOR, JOB_STATUS_LABEL, SHIPMENT_STATUS_LABEL } from "@/lib/constants";
import type { JobStatus } from "@/lib/types/database";
import { formatDateTH } from "@/lib/utils";
import { WorkflowStepper } from "@/components/jobs/workflow-stepper";

export const dynamic = "force-dynamic";

type TrackingPayload = {
  job_code: string;
  status: JobStatus;
  product_type: string | null;
  quantity: number;
  received_at: string;
  due_date: string | null;
  customer_name: string;
  timeline: { event_type: string; description: string | null; created_at: string }[];
  shipment: { carrier: string | null; tracking_no: string | null; status: string; shipped_at: string | null } | null;
};

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("get_public_tracking", { p_token: token });
  if (error || !data) notFound();
  const job = data as unknown as TrackingPayload;

  return (
    <main className="min-h-screen sport-gradient">
      <div className="container max-w-2xl space-y-6 px-4 py-8 md:py-12">
        <header className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl sport-accent-gradient">
            <Shirt className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="font-mono text-sm text-muted-foreground">{job.job_code}</div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">สถานะงานของคุณ</h1>
          </div>
          <Badge variant="outline" className={JOB_STATUS_COLOR[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
        </header>

        <WorkflowStepper currentStatus={job.status} timeline={job.timeline ?? []} variant="public" />

        <Card>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
            <InfoRow label="ลูกค้า" value={job.customer_name} />
            <InfoRow label="ประเภทเสื้อ" value={job.product_type ?? "-"} />
            <InfoRow label="จำนวน" value={`${job.quantity} ตัว`} />
            <InfoRow label="กำหนดส่ง" value={job.due_date ? formatDateTH(job.due_date, "d MMM yy") : "-"} />
          </CardContent>
        </Card>

        {job.shipment && (
          <Card>
            <CardContent className="space-y-2 p-5">
              <div className="flex items-center gap-2 font-semibold">
                <Truck className="h-5 w-5 text-emerald-400" /> การจัดส่ง
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <InfoRow label="บริษัท" value={job.shipment.carrier ?? "-"} />
                <InfoRow label="เลข Tracking" value={job.shipment.tracking_no ?? "-"} />
                <InfoRow label="สถานะ" value={SHIPMENT_STATUS_LABEL[job.shipment.status as keyof typeof SHIPMENT_STATUS_LABEL] ?? job.shipment.status} />
                {job.shipment.shipped_at && (
                  <InfoRow label="วันที่ส่ง" value={formatDateTH(job.shipment.shipped_at, "d MMM HH:mm")} />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Package className="h-4 w-4 text-primary" /> ประวัติการอัปเดตทั้งหมด
            </div>
            {job.timeline.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">ยังไม่มี event</p>
            ) : (
              <ol className="space-y-2">
                {job.timeline.slice().reverse().map((ev, idx) => (
                  <li key={idx} className="rounded-md border border-border bg-card/40 p-2.5">
                    <div className="text-sm">{ev.description}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{formatDateTH(ev.created_at, "d MMM yy HH:mm")}</div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <footer className="pt-4 text-center text-xs text-muted-foreground">
          <p>เปิดงานเมื่อ {formatDateTH(job.received_at, "d MMM yy HH:mm")}</p>
          <p className="mt-1">หน้านี้อัปเดตอัตโนมัติเมื่อสถานะงานเปลี่ยน</p>
        </footer>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}
