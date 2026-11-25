import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock, CheckCircle2, AlertTriangle, Ban, CalendarX } from "lucide-react";
import { assessLeadTime, RUSH_SURCHARGE_PCT } from "@/lib/jobs/lead-time";
import { formatThaiFullDate } from "@/lib/utils";

type Props = {
  quantity: number;
  receivedAt: string;
  dueDate?: string | null;
};

export function LeadTimeCard({ quantity, receivedAt, dueDate }: Props) {
  const qty = Math.round(quantity || 0);
  if (qty <= 0) return null; // ยังไม่มีจำนวน → ประเมินไม่ได้

  const a = assessLeadTime(qty, new Date(receivedAt), dueDate ? new Date(dueDate) : null);
  const isRush = a.feasibility === "rush" || a.feasibility === "tight";

  return (
    <Card className="border-sky-500/30 bg-sky-500/5">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-sky-300">
          <CalendarClock className="h-4 w-4" /> เวลาส่งมอบ (ประมาณการ)
        </div>

        <div className="grid gap-1 text-sm">
          <div>
            จำนวน <b>{qty} ตัว</b> → ใช้เวลา ~<b>{a.leadDays} วัน</b>
          </div>
          <div className="text-muted-foreground">
            แนะนำบอกลูกค้า: ส่งได้ประมาณ{" "}
            <b className="text-foreground">{formatThaiFullDate(a.suggestedDate.toISOString())}</b>{" "}
            <span className="text-xs">(รวม buffer แล้ว — ส่งก่อนได้ยิ่งดี)</span>
          </div>
        </div>

        {/* ประเมินเทียบวันที่ลูกค้าต้องใช้ */}
        {a.feasibility === "no_date" && (
          <div className="flex items-start gap-2 rounded-md border border-border bg-card/40 p-2.5 text-xs text-muted-foreground">
            <CalendarX className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              ยังไม่ได้ใส่ <b>วันที่ลูกค้าต้องใช้</b> → ใส่ช่อง &quot;กำหนดส่ง&quot; ในแท็บรายละเอียด เพื่อเช็กว่าทันไหม
            </span>
          </div>
        )}

        {a.feasibility === "ok" && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-sm text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            ทันกำหนด ✅ — ลูกค้าต้องใช้ {formatThaiFullDate(dueDate!)} (มีเวลา {a.daysAvailable} วัน)
          </div>
        )}

        {a.feasibility === "rush" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-sm text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              งานด่วน ⚠️ — ต้องใช้ {formatThaiFullDate(dueDate!)} (เหลือ {a.daysAvailable} วัน &lt; ปกติ {a.leadDays} วัน)
            </div>
            <RushPolicy minFloorDays={a.minFloorDays} />
          </div>
        )}

        {a.feasibility === "tight" && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 p-2.5 text-sm text-rose-200">
              <Ban className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                กระชั้นเกินไป 🛑 — เหลือ {a.daysAvailable} วัน ต่ำกว่าขั้นต่ำสุด {a.minFloorDays} วัน →{" "}
                <b>แนะนำปฏิเสธอย่างสุภาพ หรือขอเลื่อนวัน</b> (รับแล้วส่งช้าเสียชื่อกว่า)
              </span>
            </div>
            <RushPolicy minFloorDays={a.minFloorDays} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RushPolicy({ minFloorDays }: { minFloorDays: number }) {
  return (
    <div className="rounded-md border border-border bg-card/40 p-2.5 text-xs text-muted-foreground">
      <div className="mb-1 font-semibold text-amber-200">🚨 นโยบายงานด่วน — รับเมื่อครบ 3 ข้อ</div>
      <ol className="ml-4 list-decimal space-y-0.5">
        <li>โทรเช็กโรงงานยืนยันคิวได้ <b>ก่อนรับปากลูกค้า</b></li>
        <li>คิดค่าด่วน <b>+{RUSH_SURCHARGE_PCT}%</b></li>
        <li>ไม่ต่ำกว่าขั้นต่ำสุด <b>{minFloorDays} วัน</b></li>
      </ol>
      <div className="mt-1 italic">ปฏิเสธงานที่ทำไม่ทัน ดีกว่ารับแล้วส่งช้า</div>
    </div>
  );
}
