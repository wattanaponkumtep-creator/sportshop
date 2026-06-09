"use client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";
import { formatBaht, cn } from "@/lib/utils";

type AgingBuckets = {
  current: number;
  thirty: number;
  sixty: number;
  ninety: number;
};

type OutstandingCustomer = {
  id: string;
  name: string;
  amount: number;
  oldestDays: number;
};

const BUCKET_META: { key: keyof AgingBuckets; label: string; color: string; range: string }[] = [
  { key: "current", label: "ปกติ",    range: "0-30 วัน",  color: "bg-emerald-500" },
  { key: "thirty",  label: "เริ่มเก่า", range: "31-60 วัน", color: "bg-amber-500" },
  { key: "sixty",   label: "เก่า",     range: "61-90 วัน", color: "bg-orange-500" },
  { key: "ninety",  label: "ค้างนาน",  range: "90+ วัน",   color: "bg-rose-500" },
];

export function AgingCard({
  total,
  aging,
  customers,
}: {
  total: number;
  aging: AgingBuckets;
  customers: OutstandingCustomer[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base sm:text-lg">
          <span className="inline-flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" /> เงินค้างชำระ
          </span>
          <Badge variant="outline" className="font-mono text-sm">{formatBaht(total)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Aging buckets */}
        <div className="space-y-2">
          {BUCKET_META.map((b) => {
            const amount = aging[b.key];
            const pct = total > 0 ? (amount / total) * 100 : 0;
            return (
              <div key={b.key} className="rounded-md border border-border bg-card/40 p-2.5">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", b.color)} />
                    <span className="font-medium">{b.label}</span>
                    <span className="text-xs text-muted-foreground">({b.range})</span>
                  </span>
                  <div className="text-right">
                    <span className="font-mono font-semibold">{formatBaht(amount)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full transition-all", b.color)} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Top customers with outstanding */}
        {customers.length > 0 && (
          <div className="space-y-1.5 border-t border-border pt-3">
            <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <AlertTriangle className="h-3 w-3" /> ลูกค้าค้างชำระสูงสุด
            </div>
            {customers.map((c) => (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="flex items-center justify-between rounded border border-border bg-card/40 p-2 text-sm transition hover:border-primary/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">ค้างมา {c.oldestDays} วัน</div>
                </div>
                <span className="font-mono font-semibold text-amber-400">{formatBaht(c.amount)}</span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
