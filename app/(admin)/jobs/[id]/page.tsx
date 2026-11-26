import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { JOB_STATUS_COLOR, JOB_STATUS_LABEL, PRIORITY_COLOR, PRIORITY_LABEL } from "@/lib/constants";
import { formatDateTH } from "@/lib/utils";
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
import { ReorderButton } from "@/components/jobs/reorder-button";
import { ClaimsPanel } from "@/components/jobs/claims-panel";
import { WorkflowStepper } from "@/components/jobs/workflow-stepper";
import { LeadTimeCard } from "@/components/jobs/lead-time-card";
import { JobChecklist } from "@/components/jobs/job-checklist";
import { OrderConfirmAdmin } from "@/components/jobs/order-confirm-admin";
import { RosterLinkAdmin } from "@/components/jobs/roster-link-admin";
import { SizeSummary } from "@/components/jobs/size-summary";
import { RosterUpload } from "@/components/jobs/roster-upload";
import { ItemTypeSummary } from "@/components/jobs/item-type-summary";
import { ReceivingCheck } from "@/components/jobs/receiving-check";
import { QuickContact } from "@/components/jobs/quick-contact";
import { NotifyCustomerDialog } from "@/components/jobs/notify-customer-dialog";
import { ProductionStages } from "@/components/jobs/production-stages";
import { FactoryCheckins } from "@/components/jobs/factory-checkins";
import { LineItemsEditor } from "@/components/jobs/line-items-editor";
import { FactoryCommunication } from "@/components/jobs/factory-communication";
import { SampleGate } from "@/components/jobs/sample-gate";
import { r2PublicUrl } from "@/lib/storage/r2";
import type { FactoryJob, FactoryMessage, JobItem, Claim } from "@/lib/types/database";
import { FileText } from "lucide-react";

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
    { data: customerChannels },
    { data: checkins },
    { data: lineItems },
    { data: factoryMessages },
    { data: shopInfoRows },
    { data: claims },
  ] = await Promise.all([
    supabase.from("job_items").select("*").eq("job_id", id).order("position"),
    supabase.from("job_files").select("*").eq("job_id", id).order("created_at", { ascending: false }),
    supabase.from("job_timeline").select("*").eq("job_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.from("factories").select("id, name").eq("is_active", true).order("name"),
    supabase.from("factory_jobs").select("*").eq("job_id", id),
    supabase.from("shipments").select("*").eq("job_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("payments").select("*").eq("job_id", id).order("paid_at", { ascending: false }),
    supabase.from("mockups").select("*").eq("job_id", id).order("version", { ascending: false }),
    supabase.from("customer_channels").select("channel_type, external_id, display_name").eq("customer_id", (job as { customer_id: string }).customer_id),
    supabase.from("factory_checkins").select("*").eq("job_id", id).order("created_at", { ascending: false }),
    supabase.from("job_line_items").select("*").eq("job_id", id).order("position"),
    supabase.from("factory_messages").select("*").eq("job_id", id).order("created_at", { ascending: true }),
    supabase.from("shop_info").select("shop_name, phone, bank_info, charge_customer_shipping, free_ship_min_qty, customer_ship_fee").eq("id", 1).limit(1),
    supabase.from("claims").select("*").eq("job_id", id).order("created_at", { ascending: false }),
  ]);

  const shopInfo = (shopInfoRows && shopInfoRows[0]) as {
    shop_name: string | null;
    phone: string | null;
    bank_info: string | null;
    charge_customer_shipping?: boolean;
    free_ship_min_qty?: number;
    customer_ship_fee?: number;
  } | undefined;
  // ออเดอร์นี้เข้าเกณฑ์คิดค่าส่งไหม (สั่งน้อยกว่าเกณฑ์ + เปิดนโยบาย)
  const shipNoticeApplies =
    !!shopInfo?.charge_customer_shipping &&
    Number(job.quantity) > 0 &&
    Number(job.quantity) < Number(shopInfo.free_ship_min_qty ?? 50);

  const customer = job.customers as { id: string; name: string; phone: string | null } | null;
  const factory = job.factories as { id: string; name: string } | null;

  // ---- ค่าคำนวณสำหรับเช็กลิสต์ + ยอดค้าง ----
  const payList = (payments ?? []) as { amount?: number; type?: string }[];
  const paidSum = payList.reduce(
    (s, pm) => s + (pm.type === "refund" ? -1 : 1) * (Number(pm.amount) || 0),
    0,
  );
  const dueTotal =
    Number(job.sale_price || 0) +
    Number(job.customer_shipping_fee || 0) -
    Number((job as { discount?: number }).discount || 0);
  const hasApprovedMockup = ((mockups ?? []) as { status?: string }[]).some((m) => m.status === "approved");

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
          {job.job_label && (
            <div className="text-base font-medium text-foreground sm:text-lg">📦 {job.job_label}</div>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {customer && <Link href={`/customers/${customer.id}`} className="hover:text-foreground">ลูกค้า: {customer.name}</Link>}
            {customer?.phone && <span>{customer.phone}</span>}
            {job.due_date && <span>กำหนดส่ง {formatDateTH(job.due_date, "d MMM yy")}</span>}
            <span>เปิดเมื่อ {formatDateTH(job.received_at, "d MMM yy HH:mm")}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <JobStatusSelect jobId={job.id} currentStatus={job.status} />
          <QuickContact
            customerName={customer?.name ?? ""}
            phone={customer?.phone ?? null}
            channels={customerChannels ?? []}
          />
          <NotifyCustomerDialog
            jobCode={job.job_code}
            jobLabel={job.job_label}
            productType={job.product_type}
            status={job.status}
            trackToken={job.track_token}
            customerName={customer?.name ?? ""}
            phone={customer?.phone ?? null}
            channels={customerChannels ?? []}
            salePrice={Math.max(0, Number(job.sale_price) - Number(job.discount ?? 0)) + Number(job.customer_shipping_fee ?? 0)}
            totalPaid={(payments ?? []).reduce(
              (s, p) => s + (p.type === "refund" ? -Number(p.amount) : Number(p.amount)),
              0,
            )}
            customerShippingFee={Number(job.customer_shipping_fee ?? 0)}
            shipNoticeApplies={shipNoticeApplies}
            shopInfo={shopInfo ? { shop_name: shopInfo.shop_name, bank_info: shopInfo.bank_info } : null}
          />
          <CopyTrackLink trackToken={job.track_token} />
          <ManualNotifyButton jobId={job.id} />
          <Button asChild variant="outline" size="icon" title="ใบเสนอราคา">
            <Link href={`/jobs/${job.id}/invoice`}>
              <FileText className="h-4 w-4" />
            </Link>
          </Button>
          <ReorderButton jobId={job.id} />
          <DeleteJobButton jobId={job.id} jobCode={job.job_code} />
        </div>
      </header>

      <WorkflowStepper currentStatus={job.status} timeline={timeline ?? []} />

      <JobChecklist
        status={job.status}
        hasApprovedMockup={hasApprovedMockup}
        itemCount={(items ?? []).length}
        hasSpec={((job.production_options ?? []) as string[]).length > 0}
        hasDueDate={!!job.due_date}
        orderConfirmed={!!(job as { order_confirmed_at?: string | null }).order_confirmed_at}
        depositPaid={paidSum > 0}
        sampleApproved={(job as { sample_status?: string }).sample_status === "approved"}
        receivedCheck={!!(job as { received_check_at?: string | null }).received_check_at}
        fullyPaid={dueTotal > 0 && paidSum >= dueTotal}
      />

      <LeadTimeCard
        quantity={Math.max(
          Number(job.quantity) || 0,
          (items ?? []).reduce((s, it) => s + (Number((it as { quantity?: number }).quantity) || 1), 0),
        )}
        receivedAt={job.received_at}
        dueDate={job.due_date}
      />

      <OrderConfirmAdmin
        token={(job as { order_confirm_token: string }).order_confirm_token}
        confirmedAt={(job as { order_confirmed_at?: string | null }).order_confirmed_at}
        confirmedBy={(job as { order_confirmed_by?: string | null }).order_confirmed_by}
      />

      <ProductionStages
        jobId={job.id}
        layoutProgress={job.layout_progress ?? 0}
        printProgress={job.print_progress ?? 0}
        sewProgress={job.sew_progress ?? 0}
        shipProgress={job.ship_progress ?? 0}
      />

      {/* ลบส่วน summary ออก — ดูใน tab "การเงิน" แทน */}

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
            <TabsTrigger value="claims">เคลม ({(claims ?? []).length})</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="details" className="mt-4">
          <JobDetailsPanel job={job} factories={factories ?? []} />
        </TabsContent>

        <TabsContent value="items" className="mt-4 space-y-4">
          <RosterLinkAdmin
            token={(job as { roster_token: string }).roster_token}
            submittedAt={(job as { roster_submitted_at?: string | null }).roster_submitted_at}
            itemCount={(items ?? []).length}
          />
          <ItemTypeSummary items={items ?? []} />
          <ReceivingCheck
            jobId={job.id}
            items={items ?? []}
            receivedCounts={(job.received_counts as Record<string, number>) ?? {}}
            receivedCheckAt={(job.received_check_at as string | null) ?? null}
            receivedCheckNote={(job.received_check_note as string | null) ?? null}
          />
          <SizeSummary items={items ?? []} />
          <RosterUpload jobId={job.id} />
          <JobItemsEditor jobId={job.id} initialItems={items ?? []} />
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <JobFiles jobId={job.id} files={files ?? []} />
        </TabsContent>

        <TabsContent value="mockups" className="mt-4">
          <JobMockups
            jobId={job.id}
            mockups={mockups ?? []}
            jobCode={job.job_code}
            jobLabel={job.job_label}
            customerName={customer?.name ?? "ลูกค้า"}
          />
        </TabsContent>

        <TabsContent value="payments" className="mt-4 space-y-4">
          <LineItemsEditor
            jobId={job.id}
            initialItems={lineItems ?? []}
            shippingCost={Number(job.shipping_cost ?? 0)}
            otherCost={Number(job.other_cost ?? 0)}
            factories={factories ?? []}
          />
          <JobPayments
            jobId={job.id}
            jobCode={job.job_code}
            jobLabel={job.job_label}
            trackToken={job.track_token}
            customerName={customer?.name ?? ""}
            customerPhone={customer?.phone ?? null}
            customerChannels={customerChannels ?? []}
            shopInfo={shopInfo ?? null}
            salePrice={Number(job.sale_price) + Number(job.customer_shipping_fee ?? 0)}
            discount={Number(job.discount ?? 0)}
            cost={Number(job.cost ?? 0)}
            shippingCost={Number(job.shipping_cost ?? 0)}
            otherCost={Number(job.other_cost ?? 0)}
            payments={payments ?? []}
          />
        </TabsContent>

        <TabsContent value="factory" className="mt-4 space-y-4">
          <SampleGate
            jobId={job.id}
            sampleStatus={(job as { sample_status?: string }).sample_status ?? "pending"}
            sampleApprovedAt={(job as { sample_approved_at?: string | null }).sample_approved_at}
            sampleNote={(job as { sample_note?: string | null }).sample_note}
          />
          {(() => {
            const factoryJobsTyped = (factoryJobs ?? []) as FactoryJob[];
            const messagesTyped = (factoryMessages ?? []) as FactoryMessage[];
            const factoriesById = new Map((factories ?? []).map((f) => [f.id, f.name]));
            // รูป mockup (อนุมัติแล้วก่อน ไม่งั้นล่าสุด) สำหรับแนบในใบสั่งงานโรงงาน
            const mk = (mockups ?? []) as { status?: string; storage_paths?: string[] | null }[];
            const chosenMk = mk.find((m) => m.status === "approved") ?? mk[0];
            const mockupImageUrl = chosenMk?.storage_paths?.[0]
              ? r2PublicUrl(chosenMk.storage_paths[0])
              : null;
            return factoryJobsTyped
              .filter((fj) => fj.portal_token)
              .map((fj) => (
                <FactoryCommunication
                  key={fj.id}
                  jobId={job.id}
                  jobCode={job.job_code}
                  jobLabel={job.job_label}
                  productType={job.product_type}
                  priority={job.priority}
                  productionOptions={job.production_options ?? []}
                  dueDate={job.due_date}
                  customerName={customer?.name ?? null}
                  customerPhone={customer?.phone ?? null}
                  deliveryAddress={job.delivery_address}
                  deliveryMethod={job.delivery_method}
                  shopName={shopInfo?.shop_name ?? null}
                  factoryJobId={fj.id}
                  factoryName={factoriesById.get(fj.factory_id) ?? "โรงงาน"}
                  portalToken={fj.portal_token as string}
                  messages={messagesTyped.filter((m) => m.factory_job_id === fj.id)}
                  items={(items ?? []) as JobItem[]}
                  mockupImageUrl={mockupImageUrl}
                />
              ));
          })()}
          <FactoryCheckins
            jobId={job.id}
            factories={factories ?? []}
            currentFactoryId={factory?.id ?? null}
            checkins={checkins ?? []}
          />
          <JobFactoryPanel
            jobId={job.id}
            factories={factories ?? []}
            currentFactoryId={factory?.id ?? null}
            factoryJobs={factoryJobs ?? []}
          />
        </TabsContent>

        <TabsContent value="shipping" className="mt-4 space-y-3">
          {(() => {
            const due =
              Number(job.sale_price || 0) + Number(job.customer_shipping_fee || 0) - Number(job.discount || 0);
            const paid = (payments ?? []).reduce((s, p) => {
              const amt = Number((p as { amount?: number }).amount) || 0;
              return (p as { type?: string }).type === "refund" ? s - amt : s + amt;
            }, 0);
            const outstanding = Math.round((due - paid) * 100) / 100;
            return outstanding > 0 ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                ⚠️ <b>ยังมียอดค้าง ฿{outstanding.toLocaleString()}</b> — แนะนำเก็บเงินให้ครบก่อนส่งของ (เสื้อ custom ขายต่อไม่ได้)
              </div>
            ) : (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-300">
                ✅ เก็บเงินครบแล้ว — ส่งของได้สบายใจ
              </div>
            );
          })()}
          <JobShipmentPanel jobId={job.id} shipment={shipment ?? null} />
        </TabsContent>

        <TabsContent value="claims" className="mt-4">
          <ClaimsPanel jobId={job.id} claims={(claims ?? []) as Claim[]} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <JobTimeline jobId={job.id} events={timeline ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

