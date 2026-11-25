import { createServiceClient } from "@/lib/supabase/server";
import { r2PublicUrl } from "@/lib/storage/r2";
import { RosterEntryForm } from "@/components/roster/roster-entry-form";
import { CheckCircle2, Shirt } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RosterPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_code, job_label, product_type, order_confirmed_at, customers(name)")
    .eq("roster_token", token)
    .maybeSingle();

  if (!job) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div>
          <div className="text-lg font-semibold">ไม่พบออเดอร์</div>
          <p className="mt-1 text-sm text-muted-foreground">ลิงก์ไม่ถูกต้องหรือถูกยกเลิกแล้ว</p>
        </div>
      </main>
    );
  }

  const [{ data: items }, { data: mockups }] = await Promise.all([
    supabase.from("job_items").select("name, number, size, position").eq("job_id", job.id).order("position"),
    supabase.from("mockups").select("status, storage_paths").eq("job_id", job.id).order("version", { ascending: false }),
  ]);

  const initialRows = (items ?? []).map((it) => ({
    name: it.name ?? "",
    number: it.number ?? "",
    size: it.size ?? "",
  }));

  const mk = (mockups ?? []) as { status?: string; storage_paths?: string[] | null }[];
  const chosen = mk.find((m) => m.status === "approved") ?? mk[0];
  const mockupUrl = chosen?.storage_paths?.[0] ? r2PublicUrl(chosen.storage_paths[0]) : null;

  const customer = (job as { customers?: { name?: string | null } | null }).customers;
  const confirmed = !!job.order_confirmed_at;

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl sport-accent-gradient">
            <Shirt className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold">กรอกรายชื่อทีม</h1>
          <p className="text-sm text-muted-foreground">
            {job.job_label || job.product_type || job.job_code}
            {customer?.name ? ` · ${customer.name}` : ""}
          </p>
        </div>

        {mockupUrl && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mockupUrl} alt="แบบเสื้อ" className="max-h-56 w-full object-contain" />
          </div>
        )}

        {confirmed ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm text-emerald-200">
            <CheckCircle2 className="mx-auto mb-1 h-6 w-6" />
            ออเดอร์ยืนยันแล้ว — แก้รายชื่อไม่ได้แล้ว หากต้องแก้กรุณาติดต่อทางร้าน
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-xs text-sky-100">
              กรอก <b>ชื่อบนเสื้อ · เบอร์ · ไซซ์</b> ของแต่ละคนให้ครบ → กดส่ง (กรอกเองเพื่อความถูกต้อง 100%)
            </div>
            <RosterEntryForm token={token} initialRows={initialRows} />
          </>
        )}

        <p className="pt-2 text-center text-xs italic text-muted-foreground">
          We pay attention to every detail.
        </p>
      </div>
    </main>
  );
}
