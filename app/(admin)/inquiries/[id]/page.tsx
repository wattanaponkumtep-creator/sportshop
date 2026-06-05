import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, MessageCircle, Sparkles, ExternalLink } from "lucide-react";
import { formatDateTH, formatBaht } from "@/lib/utils";
import { InquiryActions } from "@/components/inquiries/inquiry-actions";
import type { Inquiry } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.from("inquiries").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const i = data as Inquiry;

  return (
    <div className="container space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-8">
      <Link href="/inquiries" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> ใบขอใบเสนอราคา
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-orange-400" />
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{i.name}</h1>
        </div>
        {i.team_name && <p className="text-base text-muted-foreground">ทีม: {i.team_name}</p>}
        <div className="text-xs text-muted-foreground">
          ส่งเมื่อ {formatDateTH(i.created_at, "d MMM yy HH:mm")}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ช่องทางติดต่อ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {i.phone && (
                <div className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3">
                  <span className="inline-flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" /> {i.phone}
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <a href={`tel:${i.phone}`}>โทร</a>
                  </Button>
                </div>
              )}
              {i.line_id && (
                <div className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3">
                  <span className="inline-flex items-center gap-2 text-sm">
                    <MessageCircle className="h-4 w-4 text-green-400" /> LINE: {i.line_id}
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <a href={`https://line.me/ti/p/~${i.line_id.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> เปิด
                    </a>
                  </Button>
                </div>
              )}
              {i.email && (
                <div className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3">
                  <span className="inline-flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" /> {i.email}
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <a href={`mailto:${i.email}`}>ส่ง Email</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order details */}
          {(i.product_type || i.quantity != null || i.budget != null) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">รายละเอียดที่ขอ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">ประเภท</div>
                    <div className="mt-0.5 text-sm font-semibold">{i.product_type ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">จำนวน</div>
                    <div className="mt-0.5 font-mono text-sm font-semibold">{i.quantity != null ? `${i.quantity} ตัว` : "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">งบ</div>
                    <div className="mt-0.5 font-mono text-sm font-semibold text-orange-400">
                      {i.budget != null ? formatBaht(Number(i.budget)) : "—"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Message */}
          {i.message && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ข้อความจากลูกค้า</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{i.message}</p>
              </CardContent>
            </Card>
          )}

          {/* Converted to customer link */}
          {i.converted_to_customer_id && (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm text-emerald-300">✅ แปลงเป็นลูกค้าแล้ว</span>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/customers/${i.converted_to_customer_id}`}>
                    ดูลูกค้า <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: actions */}
        <div>
          <InquiryActions id={i.id} currentStatus={i.status} adminNote={i.admin_note} converted={!!i.converted_to_customer_id} />
        </div>
      </div>
    </div>
  );
}
