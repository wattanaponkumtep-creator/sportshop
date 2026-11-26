import { createServiceClient } from "@/lib/supabase/server";
import { r2PublicUrl } from "@/lib/storage/r2";
import { formatThaiFullDate } from "@/lib/utils";
import { ConfirmForm } from "@/components/confirm/confirm-form";
import { CheckCircle2, Shirt, Package, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConfirmOrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("*, customers(name, phone)")
    .eq("order_confirm_token", token)
    .maybeSingle();

  if (!job) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div>
          <div className="text-lg font-semibold">ไม่พบออเดอร์</div>
          <p className="mt-1 text-sm text-muted-foreground">ลิงก์ไม่ถูกต้องหรือถูกยกเลิกแล้ว กรุณาติดต่อทางร้าน</p>
        </div>
      </main>
    );
  }

  const [{ data: items }, { data: mockups }, { data: shopRows }] = await Promise.all([
    supabase.from("job_items").select("*").eq("job_id", job.id).order("position"),
    supabase.from("mockups").select("status, storage_paths").eq("job_id", job.id).order("version", { ascending: false }),
    supabase.from("shop_info").select("shop_name").limit(1),
  ]);

  const shopName = shopRows?.[0]?.shop_name ?? "SportShop";
  const customer = (job as { customers?: { name?: string | null } | null }).customers;
  const itemList = (items ?? []) as {
    name?: string | null; number?: string | null; size?: string | null; quantity?: number | null;
  }[];
  const totalQty = Math.max(
    Number(job.quantity) || 0,
    itemList.reduce((s, it) => s + (Number(it.quantity) || 1), 0),
  );

  const sizeTally = new Map<string, number>();
  for (const it of itemList) {
    const sz = (it.size ?? "").trim() || "ไม่ระบุ";
    sizeTally.set(sz, (sizeTally.get(sz) ?? 0) + (Number(it.quantity) || 1));
  }

  const mk = (mockups ?? []) as { status?: string; storage_paths?: string[] | null }[];
  const chosen = mk.find((m) => m.status === "approved") ?? mk[0];
  const mockupUrl = chosen?.storage_paths?.[0] ? r2PublicUrl(chosen.storage_paths[0]) : null;

  const price = Number(job.sale_price || 0) + Number(job.customer_shipping_fee || 0);
  const options = (job.production_options ?? []) as string[];
  const confirmed = !!job.order_confirmed_at;

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl sport-accent-gradient">
            <Shirt className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold">ยืนยันออเดอร์</h1>
          <p className="text-sm text-muted-foreground">{shopName}</p>
        </div>

        {/* Mockup */}
        {mockupUrl && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mockupUrl} alt="แบบเสื้อ" className="max-h-72 w-full object-contain" />
          </div>
        )}

        {mockupUrl && (
          <p className="-mt-2 text-center text-[11px] text-muted-foreground">
            📌 สีจริงบนเสื้ออาจต่างจากสีบนหน้าจอเล็กน้อย (ขึ้นกับหน้าจอแต่ละเครื่อง)
          </p>
        )}

        {/* Summary */}
        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <Package className="h-4 w-4 text-primary" /> รายละเอียดออเดอร์
          </div>
          <dl className="space-y-1.5">
            <Row label="รหัสงาน" value={job.job_code} />
            {customer?.name && <Row label="ทีม/ลูกค้า" value={customer.name} />}
            {(job.job_label || job.product_type) && (
              <Row label="สินค้า" value={job.job_label || job.product_type || "-"} />
            )}
            <Row label="จำนวนรวม" value={`${totalQty} ตัว`} />
            {sizeTally.size > 0 && (
              <Row
                label="แยกไซซ์"
                value={Array.from(sizeTally.entries()).map(([s, n]) => `${s}×${n}`).join("  ")}
              />
            )}
            {options.length > 0 && <Row label="ออปชั่น" value={options.join(", ")} />}
            {job.due_date && <Row label="กำหนดใช้งาน" value={formatThaiFullDate(job.due_date)} />}
            <Row label="ยอดรวม" value={`฿${price.toLocaleString()}`} strong />
          </dl>
        </div>

        {/* Roster */}
        {itemList.length > 0 && itemList.some((it) => it.name || it.number) && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 text-sm font-semibold">รายชื่อ–เบอร์–ไซซ์ ({itemList.length})</div>
            <div className="max-h-72 overflow-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">ชื่อ</th>
                    <th className="p-2 text-center">เบอร์</th>
                    <th className="p-2 text-center">ไซซ์</th>
                  </tr>
                </thead>
                <tbody>
                  {itemList.map((it, i) => (
                    <tr key={i} className="border-t border-border/50">
                      <td className="p-2">{it.name || "-"}</td>
                      <td className="p-2 text-center font-mono">{it.number || "-"}</td>
                      <td className="p-2 text-center">{it.size || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Google Sheet ใบงาน — เช็กรายชื่อก่อนยืนยัน */}
        {job.sheet_url && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
            <div className="mb-1 text-sm font-semibold text-emerald-200">📋 ตรวจรายชื่อในใบงานก่อนยืนยัน</div>
            <p className="mb-3 text-xs text-emerald-100/80">
              เปิดใบงาน (Google Sheet) เช็ก <b>ชื่อ–เบอร์–ไซซ์</b> ของทุกคนให้ครบถูกต้อง เพราะเมื่อกดยืนยันแล้วจะถือว่าข้อมูลถูกต้องทั้งหมด
            </p>
            <a
              href={job.sheet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <ExternalLink className="h-4 w-4" /> เปิดใบงานเช็กรายชื่อ
            </a>
          </div>
        )}

        {/* Confirm / confirmed state */}
        {confirmed ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm text-emerald-200">
            <CheckCircle2 className="mx-auto mb-1 h-6 w-6" />
            <div className="font-semibold">ยืนยันออเดอร์เรียบร้อยแล้ว ✅</div>
            <div className="mt-1 text-xs">
              โดย {job.order_confirmed_by ?? "-"} · {formatThaiFullDate(job.order_confirmed_at!)}
            </div>
          </div>
        ) : (
          <ConfirmForm token={token} />
        )}

        <p className="pt-2 text-center text-xs italic text-muted-foreground">
          We pay attention to every detail.
        </p>
      </div>
    </main>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-semibold text-foreground" : "text-right"}>{value}</dd>
    </div>
  );
}
