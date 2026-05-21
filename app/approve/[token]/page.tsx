import { notFound } from "next/navigation";
import Image from "next/image";
import { Shirt, ImageIcon, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createServiceClient } from "@/lib/supabase/server";
import { MOCKUP_STATUS_COLOR, MOCKUP_STATUS_LABEL } from "@/lib/constants";
import type { MockupStatus } from "@/lib/types/database";
import { formatDateTH } from "@/lib/utils";
import { ApprovalForm } from "@/components/approval/approval-form";

export const dynamic = "force-dynamic";

type MockupPayload = {
  id: string;
  job_code: string;
  version: number;
  title: string | null;
  description: string | null;
  status: MockupStatus;
  storage_paths: string[];
  decision_note: string | null;
  decided_at: string | null;
  decided_by_name: string | null;
  created_at: string;
  customer_name: string;
};

export default async function ApprovalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: rpcData, error } = await supabase.rpc("get_mockup_for_approval", { p_token: token });
  if (error || !rpcData) notFound();
  const mockup = rpcData as unknown as MockupPayload;

  const signedUrls: string[] = await Promise.all(
    (mockup.storage_paths ?? []).map(async (path) => {
      const { data } = await supabase.storage.from("job-files").createSignedUrl(path, 3600);
      return data?.signedUrl ?? "";
    })
  );

  const isAwaiting = mockup.status === "awaiting_approval";

  return (
    <main className="min-h-screen sport-gradient">
      <div className="container max-w-3xl space-y-6 px-4 py-8 md:py-12">
        <header className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl sport-accent-gradient">
            <Shirt className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="font-mono text-sm text-muted-foreground">{mockup.job_code} · Mockup v{mockup.version}</div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {mockup.title || "ดูแบบเสื้อของคุณ"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">สำหรับ {mockup.customer_name}</p>
          </div>
          <Badge variant="outline" className={MOCKUP_STATUS_COLOR[mockup.status]}>
            {MOCKUP_STATUS_LABEL[mockup.status]}
          </Badge>
        </header>

        {mockup.description && (
          <Card>
            <CardContent className="p-5">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">รายละเอียดจากร้าน</div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{mockup.description}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-5">
            <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold">
              <ImageIcon className="h-4 w-4 text-purple-400" /> ภาพแบบเสื้อ ({signedUrls.length} รูป)
            </div>
            {signedUrls.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">ไม่มีรูป</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {signedUrls.map((url, i) => (
                  url ? (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-border bg-background">
                      <Image
                        src={url}
                        alt={`Mockup ${i + 1}`}
                        width={800}
                        height={800}
                        className="h-auto w-full object-contain"
                        unoptimized
                      />
                    </a>
                  ) : null
                ))}
              </div>
            )}
            <p className="mt-3 text-center text-xs text-muted-foreground">คลิกที่รูปเพื่อดูขนาดใหญ่</p>
          </CardContent>
        </Card>

        {isAwaiting ? (
          <ApprovalForm token={token} />
        ) : (
          <DecisionDisplay mockup={mockup} />
        )}

        <footer className="text-center text-xs text-muted-foreground">
          <p>หน้านี้คือลิงก์เฉพาะของงานคุณ ใช้สำหรับยืนยันแบบเสื้อ</p>
          <p className="mt-1">สร้างเมื่อ {formatDateTH(mockup.created_at, "d MMM yy HH:mm")}</p>
        </footer>
      </div>
    </main>
  );
}

function DecisionDisplay({ mockup }: { mockup: MockupPayload }) {
  if (mockup.status === "approved") {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="space-y-2 p-5 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
          <h2 className="text-lg font-semibold">คุณอนุมัติแบบนี้แล้ว ✓</h2>
          <p className="text-sm text-muted-foreground">
            ตัดสินใจเมื่อ {formatDateTH(mockup.decided_at, "d MMM yy HH:mm")}
            {mockup.decided_by_name && ` โดย ${mockup.decided_by_name}`}
          </p>
          {mockup.decision_note && (
            <div className="mt-3 rounded-md border border-emerald-500/20 bg-background/50 p-3 text-sm">
              {mockup.decision_note}
            </div>
          )}
          <p className="pt-2 text-sm">ทางร้านจะเริ่มผลิตเร็ว ๆ นี้</p>
        </CardContent>
      </Card>
    );
  }

  if (mockup.status === "rejected") {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="space-y-2 p-5 text-center">
          <XCircle className="mx-auto h-12 w-12 text-amber-400" />
          <h2 className="text-lg font-semibold">คุณขอให้แก้ไขแบบนี้</h2>
          <p className="text-sm text-muted-foreground">
            ส่งคำขอเมื่อ {formatDateTH(mockup.decided_at, "d MMM yy HH:mm")}
            {mockup.decided_by_name && ` โดย ${mockup.decided_by_name}`}
          </p>
          {mockup.decision_note && (
            <div className="mt-3 rounded-md border border-amber-500/20 bg-background/50 p-3 text-left text-sm">
              <div className="text-xs font-medium uppercase text-muted-foreground">หมายเหตุของคุณ:</div>
              <div className="mt-1 whitespace-pre-wrap">{mockup.decision_note}</div>
            </div>
          )}
          <p className="pt-2 text-sm">ทางร้านจะแก้ไขและส่งใหม่ให้</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-2 p-5 text-center">
        <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">แบบนี้ยังไม่ได้เปิดให้อนุมัติ</h2>
        <p className="text-sm text-muted-foreground">กรุณาติดต่อทางร้าน</p>
      </CardContent>
    </Card>
  );
}
