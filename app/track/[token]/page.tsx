import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Shirt, Package, Truck, ImageIcon, Ruler, ExternalLink, Palette, Printer, Scissors, Factory, ClipboardCheck } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JOB_STATUS_COLOR, JOB_STATUS_LABEL, MOCKUP_STATUS_COLOR, MOCKUP_STATUS_LABEL, SHIPMENT_STATUS_LABEL } from "@/lib/constants";
import type { JobStatus, MockupStatus } from "@/lib/types/database";
import { cn, formatDateTH } from "@/lib/utils";
import { WorkflowStepper } from "@/components/jobs/workflow-stepper";
import { CustomerCommentForm } from "@/components/track/customer-comment-form";

export const dynamic = "force-dynamic";

type TrackingPayload = {
  job_id: string;
  job_code: string;
  status: JobStatus;
  product_type: string | null;
  quantity: number;
  received_at: string;
  due_date: string | null;
  customer_name: string;
  layout_progress: number;
  print_progress: number;
  sew_progress: number;
  ship_progress: number;
  timeline: { event_type: string; description: string | null; created_at: string }[];
  shipment: { carrier: string | null; tracking_no: string | null; status: string; shipped_at: string | null } | null;
  latest_mockup: {
    id: string;
    version: number;
    title: string | null;
    description: string | null;
    status: MockupStatus;
    storage_paths: string[];
    approval_token: string;
    decided_at: string | null;
    decision_note: string | null;
  } | null;
  size_summary: { size: string; count: number }[];
  items_total: number;
  comments: { author_name: string | null; message: string; created_at: string }[];
};

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("get_public_tracking", { p_token: token });
  if (error || !data) notFound();
  const job = data as unknown as TrackingPayload;

  // Generate signed URLs for mockup images
  const mockupSignedUrls: string[] = job.latest_mockup
    ? await Promise.all(
        (job.latest_mockup.storage_paths ?? []).map(async (path) => {
          const { data: urlData } = await supabase.storage.from("job-files").createSignedUrl(path, 3600);
          return urlData?.signedUrl ?? "";
        })
      )
    : [];

  const overallProgress = Math.round(
    (job.layout_progress + job.print_progress + job.sew_progress + job.ship_progress) / 4
  );

  return (
    <main className="min-h-screen sport-gradient">
      <div className="container max-w-2xl space-y-4 px-3 py-6 sm:space-y-6 sm:px-4 sm:py-12">
        {/* Header */}
        <header className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl sport-accent-gradient">
            <Shirt className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="font-mono text-sm text-muted-foreground">{job.job_code}</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">สถานะงานของคุณ</h1>
            <p className="mt-1 text-sm text-muted-foreground">สำหรับ {job.customer_name}</p>
          </div>
          <Badge variant="outline" className={JOB_STATUS_COLOR[job.status]}>
            {JOB_STATUS_LABEL[job.status]}
          </Badge>
        </header>

        {/* Workflow Stepper */}
        <WorkflowStepper currentStatus={job.status} timeline={job.timeline ?? []} variant="public" />

        {/* Basic info */}
        <Card>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
            <InfoRow label="ประเภทเสื้อ" value={job.product_type ?? "-"} />
            <InfoRow label="จำนวน" value={`${job.quantity} ตัว`} />
            <InfoRow label="กำหนดส่ง" value={job.due_date ? formatDateTH(job.due_date, "d MMM yy") : "-"} />
            <InfoRow label="เปิดงานเมื่อ" value={formatDateTH(job.received_at, "d MMM yy")} />
          </CardContent>
        </Card>

        {/* Production progress (if any progress is started) */}
        {overallProgress > 0 && (
          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Factory className="h-4 w-4 text-orange-400" /> ความคืบหน้าการผลิต
                </div>
                <Badge variant="outline" className="font-mono">{overallProgress}%</Badge>
              </div>
              <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ProgressBar label="ออกแบบ" icon={Palette} value={job.layout_progress} accent="text-purple-400" />
                <ProgressBar label="พิมพ์" icon={Printer} value={job.print_progress} accent="text-orange-400" />
                <ProgressBar label="ตัดเย็บ" icon={Scissors} value={job.sew_progress} accent="text-blue-400" />
                <ProgressBar label="พร้อมส่ง" icon={Truck} value={job.ship_progress} accent="text-emerald-400" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Latest Mockup */}
        {job.latest_mockup && mockupSignedUrls.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ImageIcon className="h-4 w-4 text-purple-400" />
                  แบบเสื้อ Mockup {job.latest_mockup.version ? `v${job.latest_mockup.version}` : ""}
                </div>
                <Badge variant="outline" className={MOCKUP_STATUS_COLOR[job.latest_mockup.status]}>
                  {MOCKUP_STATUS_LABEL[job.latest_mockup.status]}
                </Badge>
              </div>

              {job.latest_mockup.title && (
                <h4 className="mb-1 text-sm font-medium">{job.latest_mockup.title}</h4>
              )}
              {job.latest_mockup.description && (
                <p className="mb-3 whitespace-pre-wrap text-xs text-muted-foreground">
                  {job.latest_mockup.description}
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {mockupSignedUrls.map((url, i) =>
                  url ? (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-lg border border-border bg-background transition hover:border-primary"
                    >
                      <Image
                        src={url}
                        alt={`Mockup ${i + 1}`}
                        width={600}
                        height={600}
                        className="h-auto w-full object-contain"
                        unoptimized
                      />
                    </a>
                  ) : null
                )}
              </div>

              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                คลิกที่รูปเพื่อดูขนาดใหญ่
              </p>

              {/* Decision info if approved/rejected */}
              {job.latest_mockup.status === "approved" && job.latest_mockup.decided_at && (
                <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
                  <span className="font-semibold text-emerald-400">✓ คุณอนุมัติแบบนี้แล้ว</span>
                  <span className="ml-2 text-muted-foreground">
                    {formatDateTH(job.latest_mockup.decided_at, "d MMM yy HH:mm")}
                  </span>
                </div>
              )}
              {job.latest_mockup.status === "rejected" && job.latest_mockup.decision_note && (
                <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
                  <div className="font-semibold text-amber-400">คุณขอแก้ไข:</div>
                  <div className="mt-1 whitespace-pre-wrap">{job.latest_mockup.decision_note}</div>
                </div>
              )}

              {/* Action: open approval page if awaiting */}
              {job.latest_mockup.status === "awaiting_approval" && (
                <div className="mt-4">
                  <Button asChild className="w-full">
                    <Link href={`/approve/${job.latest_mockup.approval_token}`}>
                      <ClipboardCheck className="h-4 w-4" /> ไปยังหน้าอนุมัติแบบเสื้อ
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Size summary */}
        {job.size_summary && job.size_summary.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Ruler className="h-4 w-4 text-cyan-400" /> รายละเอียดไซส์
                </div>
                <Badge variant="outline" className="text-xs">รวม {job.items_total} ตัว</Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {job.size_summary.map((s) => (
                  <div
                    key={s.size}
                    className="flex items-center justify-between rounded-md border border-border bg-card/40 p-2.5"
                  >
                    <div className="flex h-8 w-12 items-center justify-center rounded-md bg-cyan-500/15 font-mono text-sm font-bold text-cyan-400">
                      {s.size}
                    </div>
                    <span className="font-mono font-semibold tabular-nums">{s.count} ตัว</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Shipping */}
        {job.shipment && (
          <Card>
            <CardContent className="space-y-2 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4 text-emerald-400" /> การจัดส่ง
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

        {/* Existing customer comments */}
        {job.comments && job.comments.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <div className="mb-3 text-sm font-semibold">ข้อความที่คุณส่งหาทางร้าน</div>
              <div className="space-y-2">
                {job.comments.map((c, i) => (
                  <div key={i} className="rounded-md border border-border bg-card/40 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{c.author_name ?? "คุณ"}</span>
                      <span className="text-muted-foreground">{formatDateTH(c.created_at, "d MMM yy HH:mm")}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{c.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer comment form */}
        <CustomerCommentForm token={token} />

        {/* Timeline */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Package className="h-4 w-4 text-primary" /> ประวัติทั้งหมด
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
          <p>หน้านี้อัปเดตอัตโนมัติเมื่อสถานะงานเปลี่ยน</p>
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

function ProgressBar({
  label,
  icon: Icon,
  value,
  accent,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card/40 p-2">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-3 w-3", accent)} />
          <span className="text-[10px] font-medium">{label}</span>
        </div>
        <span className={cn("font-mono text-[10px] font-bold tabular-nums", value === 100 ? "text-emerald-400" : "")}>
          {value}%
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all", value === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-orange-500 to-red-500")}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
