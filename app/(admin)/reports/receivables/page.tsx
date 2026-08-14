import Link from "next/link";
import { ArrowLeft, CircleDollarSign } from "lucide-react";
import { getReceivables } from "@/lib/reports/receivables";
import { ReceivablesView } from "@/components/reports/receivables-view";

export const dynamic = "force-dynamic";

export default async function ReceivablesPage() {
  const data = await getReceivables();

  return (
    <div className="container max-w-3xl space-y-6 p-3 sm:p-4 md:p-8">
      <header className="space-y-3">
        <Link href="/reports" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> รายงานภาพรวม
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
            <CircleDollarSign className="h-7 w-7 text-emerald-400" /> การเก็บเงินลูกค้า
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            แยกแต่ละงานว่า ยังไม่ได้เก็บ · เก็บมัดจำแล้ว · หรือเก็บครบแล้ว — แตะที่งานเพื่อแจ้งเก็บเงิน
          </p>
        </div>
      </header>

      <ReceivablesView
        unpaid={data.unpaid}
        partial={data.partial}
        paid={data.paid}
        totals={data.totals}
      />
    </div>
  );
}
