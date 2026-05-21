import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { formatDateTH, timeAgo } from "@/lib/utils";
import { isLineConfigured } from "@/lib/line/client";
import { LinkLineUserButton } from "@/components/settings/link-line-user";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const lineReady = isLineConfigured();

  const [{ data: events }, { data: customers }] = await Promise.all([
    supabase
      .from("line_webhook_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("customers").select("id, name").order("name").limit(500),
  ]);

  return (
    <div className="container space-y-6 p-4 md:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">ตั้งค่าระบบ</h1>
        <p className="text-sm text-muted-foreground">การเชื่อมต่อ LINE OA + Webhook events</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" /> LINE OA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3">
            <span className="text-sm">สถานะการเชื่อมต่อ</span>
            {lineReady ? (
              <Badge variant="success" className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> เชื่อมต่อแล้ว
              </Badge>
            ) : (
              <Badge variant="destructive" className="inline-flex items-center gap-1">
                <XCircle className="h-3 w-3" /> ยังไม่ได้ตั้ง env vars
              </Badge>
            )}
          </div>

          <div className="rounded-md border border-border bg-card/40 p-3 text-sm">
            <div className="font-medium">Webhook URL ของคุณ:</div>
            <code className="mt-1 block break-all rounded bg-muted px-2 py-1 text-xs">
              {process.env.NEXT_PUBLIC_SITE_URL ?? "https://<your-domain>"}/api/webhooks/line
            </code>
            <p className="mt-2 text-xs text-muted-foreground">
              ใส่ URL นี้ใน LINE Developers Console → Messaging API → Webhook URL
            </p>
          </div>

          {!lineReady && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
              <p className="font-medium">⚠️ ต้องตั้ง env vars ใน Vercel:</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• <code>LINE_CHANNEL_ACCESS_TOKEN</code></li>
                <li>• <code>LINE_CHANNEL_SECRET</code></li>
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                หลังตั้งแล้ว ต้อง Redeploy ใน Vercel
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook events ล่าสุด (50)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!events || events.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">
              ยังไม่มี event — รอลูกค้าทักหา LINE OA ของคุณ
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เวลา</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>LINE User ID</TableHead>
                  <TableHead>ข้อความ</TableHead>
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((ev) => {
                  const linkedCustomer = ev.customer_id
                    ? (customers ?? []).find((c) => c.id === ev.customer_id)
                    : null;
                  return (
                    <TableRow key={ev.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        <div>{formatDateTH(ev.created_at, "d MMM HH:mm")}</div>
                        <div className="text-[10px]">{timeAgo(ev.created_at)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{ev.event_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {ev.line_user_id ? (
                          <code className="text-xs">{ev.line_user_id.slice(0, 12)}...</code>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {ev.message_text ?? <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {linkedCustomer ? (
                          <Link href={`/customers/${linkedCustomer.id}`} className="text-sm text-primary hover:underline">
                            {linkedCustomer.name}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">ยังไม่ผูก</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!ev.customer_id && ev.line_user_id && (
                          <LinkLineUserButton
                            lineUserId={ev.line_user_id}
                            displayName={ev.message_text ?? ev.line_user_id}
                            customers={customers ?? []}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
