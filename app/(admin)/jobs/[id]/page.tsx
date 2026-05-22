import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Copy } from "lucide-react";
import { JOB_STATUS_COLOR, JOB_STATUS_LABEL, PRIORITY_COLOR, PRIORITY_LABEL } from "@/lib/constants";
import { formatBaht, formatDateTH } from "@/lib/utils";
import { calcProfit } from "@/lib/jobs/profit";
import { JobStatusSelect } from "@/components/jobs/job-status-select";
import { JobDetailsPanel } from "@/components/jobs/job-details-panel";
import { JobItemsEditor } from "@/components/jobs/job-items-editor";
import { JobFiles } from "@/components/jobs/job-files";
import { JobTimeline } from "@/components/jobs/job-timeline";
import { JobFactoryPanel } from "@/components/jobs/job-factory-panel";
import { JobShipmentPanel } from "@/components/jobs/job-shipment-panel";
import { JobPayments } from "@/components/jobs/job-payments";
import { JobMockups } from "@/components/jobs/job-mockups";
import { CopyTrackLink } from "@/components/jobs/copy-track-link";
import { ManualNotifyButton } from "@/components/jobs/manual-notify-button";
import { DeleteJobButton } from "@/components/jobs/delete-job-button";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("*, customers(id, name, phone), factories(id, name)")
    .eq("id", id)
    .maybeSingle();

  if (!job) notFound();

  const [
    { data: items },
    { data: files },
    { data: timeline },
    { data: factories },
    { data: factoryJobs },
    { data: shipment },
    { data: payments },
    { data: mockups },
  ] = await Promise.all([
    supabase.from("job_items").select("*").eq("job_id", id).order("position"),
    supabase.from("job_files").select("*").eq("job_id", id).order("created_at", { ascending: false }),
    supabase.from("job_timeline").select("*").eq("job_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.from("factories").select("id, name").eq("is_active", true).order("name"),
    supabase.from("factory_jobs").select("*").eq("job_id", id),
    supabase.from("shipments").select("*").eq("job_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("payments").select("*").eq("job_id", id).order("paid_at", { ascending: false }),
    supabase.from("mockups").select("*").eq("job_id", id).order("version", { ascending: false }),
  ]);

  const profit = calcProfit(job);
  const customer = job.customers as { id: string; name: string; phone: string | null } | null;
  const factory = job.factories as { id: string; name: string } | null;

  return (
    <div className="container space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-8">
      <Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> งานทั้งหมด
      </Link>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">{job.job_code}</h1>
            <Badge variant="outline" className={JOB_STATUS_COLOR[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
            <Badge className={PRIORITY_COLOR[job.priority]}>{PRIORITY_LABEL[job.priority]}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {customer && <Link href={`/customers/${customer.id}`} className="hover:text-foreground">ลูกค้า: {customer.name}</Link>}
            {customer?.phone && <span>{customer.phone}</span>}
            {job.due_date && <span>กำหนดส่ง {formatDateTH(job.due_date, "d MMM yy")}</span>}
            <span>เปิดเมื่อ {formatDateTH(job.received_at, "d MMM yy HH:mm")}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <JobStatusSelect jobId={job.id} currentStatus={job.status} />
          <CopyTrackLink trackToken={job.track_token} />
          <ManualNotifyButton jobId={job.id} />
          <DeleteJobButton jobId={job.id} jobCode={job.job_code} />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <SummaryCard label="จำนวน" value={`${job.quantity} ตัว`} />
        <SummaryCard label="ยอดขาย" value={formatBaht(profit.revenue)} />
        <SummaryCard label="ต้นทุนรวม" value={formatBaht(profit.expense)} />
        <SummaryCard
          label="กำไร"
          value={formatBaht(profit.profit)}
          accent={profit.profit >= 0 ? "text-emerald-400" : "text-red-400"}
          hint={profit.revenue > 0 ? `${(profit.margin * 100).toFixed(1)}%` : undefined}
        />
      </section>

      <Tabs defaultValue="details">
        <div className="-mx-3 overflow-x-auto sm:mx-0">
          <TabsList className="ml-3 inline-flex h-10 w-max gap-1 sm:ml-0">
            <TabsTrigger value="details">รายละเอียด</TabsTrigger>
            <TabsTrigger value="items">รายชื่อ/ไซส์</TabsTrigger>
            <TabsTrigger value="files">ไฟล์ ({files?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="mockups">Mockup ({mockups?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="payments">การเงิน ({payments?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="factory">โรงงาน</TabsTrigger>
            <TabsTrigger value="shipping">การจัดส่ง</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="details" className="mt-4">
          <JobDetailsPanel job={job} factories={factories ?? []} />
        </TabsContent>

        <TabsContent value="items" className="mt-4">
          <JobItemsEditor jobId={job.id} initialItems={items ?? []} />
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <JobFiles jobId={job.id} files={files ?? []} />
        </TabsContent>

        <TabsContent value="mockups" className="mt-4">
          <JobMockups jobId={job.id} mockups={mockups ?? []} />
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <JobPayments jobId={job.id} salePrice={Number(job.sale_price)} payments={payments ?? []} />
        </TabsContent>

        <TabsContent value="factory" className="mt-4">
          <JobFactoryPanel
            jobId={job.id}
            factories={factories ?? []}
            currentFactoryId={factory?.id ?? null}
            factoryJobs={factoryJobs ?? []}
          />
        </TabsContent>

        <TabsContent value="shipping" className="mt-4">
          <JobShipmentPanel jobId={job.id} shipment={shipment ?? null} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <JobTimeline jobId={job.id} events={timeline ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({ label, value, accent, hint }: { label: string; value: string; accent?: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="text-[11px] text-muted-foreground sm:text-xs">{label}</div>
        <div className={`mt-1 text-base font-bold sm:text-xl ${accent ?? ""}`}>{value}</div>
        {hint && <div className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">{hint}</div>}
      </CardContent>
    </Card>
  );
}
