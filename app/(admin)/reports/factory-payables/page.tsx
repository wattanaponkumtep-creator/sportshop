import Link from "next/link";
import { ArrowLeft, Factory } from "lucide-react";
import { getFactoryPayables } from "@/lib/reports/factory-payables";
import { getCashPosition } from "@/lib/reports/cash-position";
import { FactoryPayablesView } from "@/components/reports/factory-payables-view";

export const dynamic = "force-dynamic";

export default async function FactoryPayablesPage() {
  const [data, cash] = await Promise.all([getFactoryPayables(), getCashPosition()]);

  return (
    <div className="container max-w-3xl space-y-6 p-3 sm:p-4 md:p-8">
      <header className="space-y-3">
        <Link href="/reports" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> รายงานภาพรวม
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
            <Factory className="h-7 w-7 text-purple-400" /> ค่าผลิตที่ต้องจ่ายโรงงาน
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            รวบรวมต้นทุนการสั่งผลิตของงานที่ส่งโรงงานแล้ว — เตรียมเงินจ่ายได้ล่วงหน้า
          </p>
        </div>
      </header>

      <FactoryPayablesView
        groups={data.groups}
        grandTotal={data.grandTotal}
        unpaidCount={data.unpaidCount}
        paidRecent={data.paidRecent}
        paidTotal={data.paidTotal}
        cashOnHand={cash.effectiveCash}
        receivable={cash.outstandingReceivable}
      />
    </div>
  );
}
