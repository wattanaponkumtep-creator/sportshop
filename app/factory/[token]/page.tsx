import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Factory, Package, Calendar, FileText, Hash } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { formatDateTH } from "@/lib/utils";
import { JOB_STATUS_LABEL, JOB_STATUS_COLOR, PRIORITY_LABEL, PRIORITY_COLOR, FACTORY_STATUS_LABEL } from "@/lib/constants";
import { FactoryPortalClient } from "./portal-client";
import { FactoryPortalFiles, type SignedFile } from "./portal-files";
import { FactoryPortalRoster, type RosterItem } from "./portal-roster";
import { FactoryPortalMockups, type SignedMockup } from "./portal-mockups";
import type { JobStatus, PriorityLevel, FactoryJobStatus, FactoryMessage, FileKind } from "@/lib/types/database";

export const dynamic = "force-dynamic";

type PortalFile = {
  id: string;
  kind: FileKind;
  storage_path: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
};

type PortalMockup = {
  id: string;
  version: number;
  title: string | null;
  description: string | null;
  storage_paths: string[];
  status: "draft" | "awaiting_approval" | "approved";
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
};

type PortalPayload = {
  factory_job_id: string;
  job_id: string;
  job_code: string;
  job_label: string | null;
  product_type: string | null;
  due_date: string | null;
  note: string | null;
  priority: PriorityLevel;
  job_status: JobStatus;
  factory_status: FactoryJobStatus;
  factory_name: string;
  factory_cost: number | null;
  factory_note: string | null;
  sent_at: string | null;
  returned_at: string | null;
  layout_progress: number;
  print_progress: number;
  sew_progress: number;
  ship_progress: number;
  items_total: number;
  items_by_size: { size: string; count: number }[];
  items_by_type: { item_type: string; count: number }[];
  items: RosterItem[];
  files: PortalFile[];
  mockups: PortalMockup[];
  messages: FactoryMessage[];
};

export default async function FactoryPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("get_factory_portal", { p_token: token });
  if (error || !data) notFound();

  const portal = data as unknown as PortalPayload;

  // Server-side: sign all file + mockup URLs in ONE batch (1 round-trip)
  const filePaths = (portal.files ?? []).map((f) => f.storage_path);
  const mockupPaths = (portal.mockups ?? []).flatMap((m) => m.storage_paths ?? []);
  const allPaths = [...new Set([...filePaths, ...mockupPaths])];

  const urlMap = new Map<string, string>();
  if (allPaths.length > 0) {
    const { data: signed } = await supabase.storage.from("job-files").createSignedUrls(allPaths, 3600);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urlMap.set(s.path, s.signedUrl);
    }
  }

  const signedFiles: SignedFile[] = (portal.files ?? [])
    .map((f) => ({ ...f, url: urlMap.get(f.storage_path) ?? null }))
    .filter((f): f is SignedFile => f.url !== null);

  const signedMockups: SignedMockup[] = (portal.mockups ?? []).map((m) => ({
    id: m.id,
    version: m.version,
    title: m.title,
    description: m.description,
    status: m.status,
    decided_at: m.decided_at,
    decision_note: m.decision_note,
    created_at: m.created_at,
    images: (m.storage_paths ?? [])
      .map((p) => ({ path: p, url: urlMap.get(p) ?? "" }))
      .filter((img) => img.url !== ""),
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="container max-w-3xl px-3 py-3 sm:px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/15">
              <Factory className="h-5 w-5 text-orange-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground">โรงงาน</div>
              <div className="truncate font-semibold">{portal.factory_name}</div>
            </div>
            <Badge variant="outline" className="shrink-0 text-xs">
              {FACTORY_STATUS_LABEL[portal.factory_status]}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl space-y-4 px-3 py-4 sm:px-4 sm:py-6">
        {/* JOB info */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="font-mono text-lg">{portal.job_code}</CardTitle>
              <Badge className={JOB_STATUS_COLOR[portal.job_status]}>
                {JOB_STATUS_LABEL[portal.job_status]}
              </Badge>
              {portal.priority !== "normal" && (
                <Badge className={PRIORITY_COLOR[portal.priority]}>
                  {PRIORITY_LABEL[portal.priority]}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {portal.job_label && (
              <div className="text-base font-medium">📦 {portal.job_label}</div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {portal.product_type && (
                <div>
                  <div className="text-xs text-muted-foreground">สินค้า</div>
                  <div className="font-medium">{portal.product_type}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground">จำนวน</div>
                <div className="font-mono font-medium">{portal.items_total} ตัว</div>
              </div>
              {portal.due_date && (
                <div>
                  <div className="text-xs text-muted-foreground">
                    <Calendar className="mr-1 inline h-3 w-3" /> ส่งภายใน
                  </div>
                  <div className="font-medium text-rose-400">{formatDateTH(portal.due_date, "d MMM yy")}</div>
                </div>
              )}
              {portal.sent_at && (
                <div>
                  <div className="text-xs text-muted-foreground">รับงานเมื่อ</div>
                  <div className="font-medium">{formatDateTH(portal.sent_at, "d MMM yy")}</div>
                </div>
              )}
            </div>

            {portal.note && (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                <div className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <FileText className="h-3 w-3" /> หมายเหตุจากร้าน
                </div>
                <div className="whitespace-pre-wrap">{portal.note}</div>
              </div>
            )}

            {/* Items by type */}
            {portal.items_by_type.length > 0 && (
              <div>
                <div className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <Package className="h-3 w-3" /> รายละเอียดที่ต้องผลิต
                </div>
                <div className="space-y-2">
                  {portal.items_by_type.map((t) => (
                    <div key={t.item_type} className="flex items-center justify-between rounded border border-border bg-card/40 px-3 py-1.5">
                      <span className="text-sm">{t.item_type}</span>
                      <Badge variant="outline" className="font-mono">{t.count} ตัว</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Size summary */}
            {portal.items_by_size.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">แยกตามไซส์</div>
                <div className="flex flex-wrap gap-1.5">
                  {portal.items_by_size.map((s) => (
                    <Badge key={s.size} variant="outline" className="font-mono text-xs">
                      {s.size}: <strong className="ml-1">{s.count}</strong>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mockups — approved designs for production reference */}
        <FactoryPortalMockups mockups={signedMockups} />

        {/* Files (ใบงาน, artwork, references) */}
        <FactoryPortalFiles files={signedFiles} />

        {/* Roster — checklist for production tracking */}
        <FactoryPortalRoster token={token} items={portal.items ?? []} />

        {/* INTERACTIVE: stages + messages */}
        <FactoryPortalClient
          token={token}
          factoryName={portal.factory_name}
          stages={{
            layout: portal.layout_progress,
            print: portal.print_progress,
            sew: portal.sew_progress,
            ship: portal.ship_progress,
          }}
          messages={portal.messages}
        />

        <p className="text-center text-xs text-muted-foreground">
          🔒 ลิงก์นี้สร้างให้โรงงาน {portal.factory_name} เท่านั้น — กรุณาอย่าแชร์ต่อ
        </p>
      </main>
    </div>
  );
}
