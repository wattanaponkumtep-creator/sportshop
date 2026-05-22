import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Printer, ArrowLeft, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBaht, formatDateTH } from "@/lib/utils";
import { PrintButton } from "@/components/jobs/print-button";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("*, customers(name, phone), factories(name)")
    .eq("id", id)
    .maybeSingle();

  if (!job) notFound();

  const [{ data: items }, { data: payments }, { data: shopRows }] = await Promise.all([
    supabase.from("job_items").select("*").eq("job_id", id).order("position"),
    supabase.from("payments").select("*").eq("job_id", id).order("paid_at"),
    supabase.from("shop_info").select("*").eq("id", 1).limit(1),
  ]);

  const shop = (shopRows && shopRows[0]) as Record<string, string | null> | undefined;

  const customer = job.customers as { name: string; phone: string | null } | null;
  const totalPaid = (payments ?? []).reduce(
    (sum, p) => sum + (p.type === "refund" ? -Number(p.amount) : Number(p.amount)),
    0
  );
  const balance = Number(job.sale_price) - totalPaid;

  // Group items by size for invoice line items
  const sizeGroups = new Map<string, number>();
  for (const it of items ?? []) {
    const size = (it.size as string | null)?.trim() || "ไม่ระบุไซส์";
    sizeGroups.set(size, (sizeGroups.get(size) ?? 0) + 1);
  }
  const lineItems = Array.from(sizeGroups.entries()).map(([size, qty]) => ({ size, qty }));

  const subtotal = Number(job.sale_price);
  const unitPrice = job.quantity > 0 ? subtotal / job.quantity : 0;

  return (
    <>
      {/* Non-print controls */}
      <div className="print:hidden">
        <div className="container space-y-4 p-3 sm:p-4 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={`/jobs/${id}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> กลับไป JOB
            </Link>
            <PrintButton />
          </div>
        </div>
      </div>

      {/* Invoice document (also visible on screen, prints clean) */}
      <div className="invoice-doc mx-auto max-w-[800px] bg-white p-6 text-black shadow-lg print:m-0 print:max-w-none print:p-0 print:shadow-none sm:p-10">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between border-b-2 border-black pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500">
                <Shirt className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-orange-600">{shop?.shop_name ?? "SportShop"}</h1>
            </div>
            {shop?.address && <p className="mt-1 text-xs text-gray-600">{shop.address}</p>}
            <div className="mt-1 text-xs text-gray-600">
              {shop?.phone && <span>โทร: {shop.phone}</span>}
              {shop?.email && <span className="ml-3">อีเมล: {shop.email}</span>}
            </div>
            {shop?.tax_id && (
              <p className="mt-0.5 text-xs text-gray-600">เลขประจำตัวผู้เสียภาษี: {shop.tax_id}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold uppercase tracking-wider">ใบเสนอราคา</div>
            <div className="mt-1 text-xs text-gray-600">QUOTATION / INVOICE</div>
            <div className="mt-3 text-sm">
              <div>เลขที่: <span className="font-mono font-semibold">{job.job_code}</span></div>
              <div className="text-xs text-gray-600">วันที่: {formatDateTH(job.received_at, "d MMMM yyyy")}</div>
            </div>
          </div>
        </div>

        {/* Customer */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">ลูกค้า</h3>
            <p className="text-sm font-semibold">{customer?.name ?? "-"}</p>
            {customer?.phone && <p className="text-xs text-gray-700">โทร: {customer.phone}</p>}
          </div>
          <div className="text-right">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">รายละเอียดงาน</h3>
            <p className="text-sm">{job.product_type ?? "-"}</p>
            {job.due_date && (
              <p className="text-xs text-gray-700">กำหนดส่ง: {formatDateTH(job.due_date, "d MMM yyyy")}</p>
            )}
          </div>
        </div>

        {/* Items table */}
        <table className="mb-5 w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-gray-100">
              <th className="p-2 text-left text-xs font-semibold uppercase tracking-wider">รายการ</th>
              <th className="p-2 text-right text-xs font-semibold uppercase tracking-wider">จำนวน</th>
              <th className="p-2 text-right text-xs font-semibold uppercase tracking-wider">ราคา/ตัว</th>
              <th className="p-2 text-right text-xs font-semibold uppercase tracking-wider">รวม</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length > 0 ? (
              lineItems.map((row) => (
                <tr key={row.size} className="border-b border-gray-200">
                  <td className="p-2 text-sm">
                    {job.product_type ?? "เสื้อกีฬาพิมพ์ลาย"} — ไซส์ {row.size}
                  </td>
                  <td className="p-2 text-right font-mono text-sm">{row.qty}</td>
                  <td className="p-2 text-right font-mono text-sm">{formatBaht(unitPrice)}</td>
                  <td className="p-2 text-right font-mono text-sm">{formatBaht(unitPrice * row.qty)}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-200">
                <td className="p-2 text-sm">{job.product_type ?? "เสื้อกีฬาพิมพ์ลาย"}</td>
                <td className="p-2 text-right font-mono text-sm">{job.quantity}</td>
                <td className="p-2 text-right font-mono text-sm">{formatBaht(unitPrice)}</td>
                <td className="p-2 text-right font-mono text-sm">{formatBaht(subtotal)}</td>
              </tr>
            )}
            {Number(job.shipping_cost) > 0 && (
              <tr className="border-b border-gray-200">
                <td className="p-2 text-sm">ค่าจัดส่ง</td>
                <td className="p-2 text-right font-mono text-sm">1</td>
                <td className="p-2 text-right font-mono text-sm">{formatBaht(Number(job.shipping_cost))}</td>
                <td className="p-2 text-right font-mono text-sm">{formatBaht(Number(job.shipping_cost))}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="p-2 pr-4 text-right text-sm">ยอดรวม</td>
              <td className="p-2 text-right font-mono text-sm font-semibold">
                {formatBaht(subtotal + Number(job.shipping_cost))}
              </td>
            </tr>
            {totalPaid > 0 && (
              <tr>
                <td colSpan={3} className="p-2 pr-4 text-right text-sm">ชำระแล้ว</td>
                <td className="p-2 text-right font-mono text-sm text-emerald-600">
                  -{formatBaht(totalPaid)}
                </td>
              </tr>
            )}
            <tr className="border-t-2 border-black">
              <td colSpan={3} className="p-2 pr-4 text-right text-base font-bold uppercase">
                {balance > 0 ? "ยอดที่ต้องชำระ" : "ชำระครบแล้ว"}
              </td>
              <td className="p-2 text-right font-mono text-lg font-bold text-orange-600">
                {formatBaht(Math.max(0, balance))}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Payments breakdown */}
        {payments && payments.length > 0 && (
          <div className="mb-5 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs">
            <div className="mb-2 font-semibold uppercase tracking-wider text-gray-600">ประวัติการชำระ</div>
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between border-b border-dashed border-gray-300 py-1 last:border-0">
                <span>
                  {p.type === "deposit" ? "มัดจำ" : p.type === "full" ? "ชำระเต็ม" : "คืนเงิน"} —{" "}
                  {formatDateTH(p.paid_at, "d MMM yyyy")}
                </span>
                <span className="font-mono">
                  {p.type === "refund" ? "-" : ""}
                  {formatBaht(Number(p.amount))}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Bank info */}
        {shop?.bank_info && (
          <div className="mb-5 rounded-md border-l-4 border-l-orange-500 bg-gray-50 p-3 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">ช่องทางการชำระเงิน</div>
            <p className="mt-1 whitespace-pre-wrap">{shop.bank_info}</p>
          </div>
        )}

        {/* Notes */}
        {job.note && (
          <div className="mb-5 border-t border-dashed border-gray-300 pt-3 text-xs text-gray-600">
            <strong className="text-gray-700">หมายเหตุ:</strong> {job.note}
          </div>
        )}

        {/* Signatures */}
        <div className="mt-10 grid grid-cols-2 gap-10 text-center text-xs text-gray-600 print:mt-16">
          <div>
            <div className="mt-12 border-t border-black pt-1">ผู้ออกใบเสนอราคา</div>
          </div>
          <div>
            <div className="mt-12 border-t border-black pt-1">ผู้รับใบเสนอราคา</div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          @page { margin: 1cm; }
        }
      `}</style>
    </>
  );
}
