import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MessageCircle, Sparkles } from "lucide-react";
import { formatDateTH, timeAgo, formatBaht } from "@/lib/utils";
import type { Inquiry } from "@/lib/types/database";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  new:        { label: "📨 ใหม่",       className: "bg-amber-500/20 text-amber-200 border-amber-500/40" },
  contacted:  { label: "📞 ติดต่อแล้ว",  className: "bg-blue-500/20 text-blue-200 border-blue-500/40" },
  quoted:     { label: "💰 เสนอราคาแล้ว", className: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40" },
  converted:  { label: "✅ ปิดดีล",      className: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40" },
  rejected:   { label: "❌ ไม่สนใจ",     className: "bg-rose-500/20 text-rose-200 border-rose-500/40" },
};

export default async function InquiriesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const inquiries = (data ?? []) as Inquiry[];
  const newCount = inquiries.filter((i) => i.status === "new").length;

  return (
    <div className="container space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-8">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
          <Sparkles className="h-7 w-7 text-orange-400" /> ใบขอใบเสนอราคา
          {newCount > 0 && (
            <Badge className="bg-rose-500/20 text-rose-300">{newCount} ใหม่</Badge>
          )}
        </h1>
        <p className="text-sm text-muted-foreground">
          คำขอจากลูกค้าผ่านหน้า <code className="text-xs">/quote</code> — ติดต่อกลับเร็วๆ
        </p>
      </header>

      {inquiries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            ยังไม่มีคำขอ — แชร์ลิงก์{" "}
            <Link href="/quote" className="text-primary hover:underline" target="_blank">
              /quote
            </Link>{" "}
            ให้ลูกค้า
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {inquiries.map((i) => (
            <Link key={i.id} href={`/inquiries/${i.id}`}>
              <Card className={`transition hover:border-primary/50 ${i.status === "new" ? "border-amber-500/30" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{i.name}</span>
                        {i.team_name && <span className="text-sm text-muted-foreground">— {i.team_name}</span>}
                        <Badge variant="outline" className={STATUS_LABEL[i.status]?.className}>
                          {STATUS_LABEL[i.status]?.label ?? i.status}
                        </Badge>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {i.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {i.phone}
                          </span>
                        )}
                        {i.line_id && (
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" /> {i.line_id}
                          </span>
                        )}
                        {i.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {i.email}
                          </span>
                        )}
                      </div>
                      {(i.product_type || i.quantity || i.budget) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {i.product_type && <Badge variant="outline" className="text-xs">{i.product_type}</Badge>}
                          {i.quantity != null && <Badge variant="outline" className="text-xs">{i.quantity} ตัว</Badge>}
                          {i.budget != null && <Badge variant="outline" className="text-xs">งบ {formatBaht(Number(i.budget))}</Badge>}
                        </div>
                      )}
                      {i.message && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{i.message}</p>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{timeAgo(i.created_at)}</div>
                      <div className="text-[10px]">{formatDateTH(i.created_at, "d MMM yy HH:mm")}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
