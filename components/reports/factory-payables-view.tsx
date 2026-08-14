"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Factory, Check, Undo2, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { JOB_STATUS_LABEL } from "@/lib/constants";
import { formatBaht, formatDateTH, cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { markFactoryCostPaid, unmarkFactoryCostPaid } from "@/app/(admin)/reports/factory-cost-actions";
import type { FactoryGroup } from "@/lib/reports/factory-payables";

type PaidRecent = {
  id: string;
  jobCode: string;
  jobLabel: string | null;
  factoryName: string;
  cost: number;
  paidAt: string | null;
};

export function FactoryPayablesView({
  groups,
  grandTotal,
  unpaidCount,
  paidRecent,
  paidTotal,
}: {
  groups: FactoryGroup[];
  grandTotal: number;
  unpaidCount: number;
  paidRecent: PaidRecent[];
  paidTotal: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPaid, setShowPaid] = useState(false);

  function pay(jobId: string) {
    startTransition(async () => {
      const r = await markFactoryCostPaid(jobId);
      if (r.ok) { toast({ title: "บันทึกว่าจ่ายค่าผลิตแล้ว ✓" }); router.refresh(); }
      else toast({ title: "ไม่สำเร็จ", description: r.error, variant: "destructive" });
    });
  }

  function payGroup(g: FactoryGroup) {
    if (!confirm(`จ่ายค่าผลิตครบทั้ง ${g.factoryName} จำนวน ${g.jobs.length} งาน รวม ${formatBaht(g.total)}?`)) return;
    startTransition(async () => {
      for (const j of g.jobs) await markFactoryCostPaid(j.id);
      toast({ title: `บันทึกจ่าย ${g.factoryName} แล้ว ✓` });
      router.refresh();
    });
  }

  function undo(jobId: string) {
    startTransition(async () => {
      const r = await unmarkFactoryCostPaid(jobId);
      if (r.ok) { toast({ title: "ยกเลิกการจ่ายแล้ว" }); router.refresh(); }
      else toast({ title: "ไม่สำเร็จ", description: r.error, variant: "destructive" });
    });
  }

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      {/* ยอดที่ต้องเตรียม */}
      <Card className="border-2 border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm text-muted-foreground">💰 เงินที่ต้องเตรียมจ่ายโรงงาน</div>
            <div className="font-display text-3xl font-bold tabular-nums text-amber-400 sm:text-4xl">
              {formatBaht(grandTotal)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              จาก {unpaidCount} งานที่ส่งโรงงานแล้ว · {groups.length} โรงงาน
            </div>
          </div>
          <Factory className="hidden h-12 w-12 text-amber-400/40 sm:block" />
        </CardContent>
      </Card>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
            ไม่มีค่าผลิตค้างจ่าย — จ่ายครบทุกงานแล้ว 🎉
          </CardContent>
        </Card>
      ) : (
        groups.map((g) => (
          <Card key={g.factoryId ?? "_none"}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <Factory className="h-4 w-4 text-purple-400" />
                {g.factoryName}
                <Badge variant="outline" className="ml-1">{g.jobs.length} งาน</Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold tabular-nums text-amber-400">{formatBaht(g.total)}</span>
                <Button size="sm" variant="outline" disabled={isPending} onClick={() => payGroup(g)}>
                  <Check className="h-4 w-4" /> จ่ายครบ
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5 pt-0">
              {g.jobs.map((j) => {
                const overdue = j.dueDate && j.dueDate < todayISO;
                return (
                  <div
                    key={j.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/40 p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/jobs/${j.id}`} className="truncate font-medium hover:underline">
                          {j.jobLabel || j.jobCode}
                        </Link>
                        <Badge variant="outline" className="shrink-0 text-[10px]">{JOB_STATUS_LABEL[j.status]}</Badge>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span className="font-mono">{j.jobCode}</span>
                        <span>· {j.customerName}</span>
                        {j.dueDate && (
                          <span className={cn(overdue && "font-medium text-rose-400")}>
                            · กำหนดส่ง {formatDateTH(j.dueDate, "d MMM")}{overdue && " (เลย)"}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono font-semibold tabular-nums text-amber-400">{formatBaht(j.cost)}</span>
                    <Button size="sm" disabled={isPending} onClick={() => pay(j.id)} className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-500">
                      <Check className="h-4 w-4" /> จ่ายแล้ว
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))
      )}

      {/* จ่ายแล้วล่าสุด */}
      {paidRecent.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowPaid((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            {showPaid ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            จ่ายแล้วล่าสุด ({paidRecent.length}) · รวมจ่ายไป {formatBaht(paidTotal)}
          </button>
          {showPaid && (
            <Card className="mt-2">
              <CardContent className="space-y-1.5 p-3">
                {paidRecent.map((j) => (
                  <div key={j.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/30 p-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <Link href={`/jobs/${j.id}`} className="inline-flex items-center gap-1 truncate font-medium hover:underline">
                        {j.jobLabel || j.jobCode} <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {j.factoryName} · จ่ายเมื่อ {j.paidAt ? formatDateTH(j.paidAt, "d MMM yy HH:mm") : "—"}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono tabular-nums text-muted-foreground line-through">{formatBaht(j.cost)}</span>
                    <Button size="sm" variant="ghost" disabled={isPending} onClick={() => undo(j.id)} title="ยกเลิก">
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-border bg-card/40 p-3 text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <span>
          แสดงงานที่กำลังผลิต (ส่งโรงงาน → กำลังผลิต → QC → รอจัดส่ง) ที่มีต้นทุน &gt; 0 และยังไม่จ่าย ·
          เมื่องานขึ้นสถานะ &quot;จัดส่งแล้ว/ปิดงาน&quot; ระบบถือว่าจ่ายค่าผลิตแล้ว จะออกจากลิสต์อัตโนมัติ +
          บันทึกเป็นเงินออก (หมวดโรงงาน) ให้เอง → กระแสเงินสดในรายงานการเงินอัปเดตตาม
        </span>
      </div>
    </div>
  );
}
