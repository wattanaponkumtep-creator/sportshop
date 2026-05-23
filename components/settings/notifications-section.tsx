"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, MessageSquare, Copy, Check, RefreshCw, Send, Info } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  updatePersonalLineUserId,
  regenerateCalendarToken,
  sendDigestNow,
} from "@/app/(admin)/settings/notifications-actions";

export function NotificationsSection({
  calendarToken,
  personalLineId,
  siteUrl,
}: {
  calendarToken: string;
  personalLineId: string | null;
  siteUrl: string;
}) {
  const [lineId, setLineId] = useState(personalLineId ?? "");
  const [currentToken, setCurrentToken] = useState(calendarToken);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const calendarUrl = `${siteUrl}/api/calendar/${currentToken}`;
  const calendarSubscribeUrl = calendarUrl.replace(/^https?:\/\//, "webcal://");

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({ title: "คัดลอกแล้ว" });
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function handleSaveLineId() {
    startTransition(async () => {
      const result = await updatePersonalLineUserId({ line_user_id_personal: lineId });
      if (result.ok) toast({ title: "บันทึก LINE ID แล้ว" });
      else toast({ title: "บันทึกไม่สำเร็จ", description: result.error, variant: "destructive" });
    });
  }

  function handleRegenerateToken() {
    if (!confirm("รีเซ็ต token ปฏิทินใหม่? ลิงก์เก่าจะใช้ไม่ได้")) return;
    startTransition(async () => {
      const result = await regenerateCalendarToken();
      if (result.ok && result.token) {
        setCurrentToken(result.token);
        toast({ title: "รีเซ็ต token แล้ว — ต้อง subscribe ใหม่" });
      } else if (!result.ok) {
        toast({ title: "รีเซ็ตไม่สำเร็จ", description: result.error, variant: "destructive" });
      }
    });
  }

  function handleSendDigestNow() {
    if (!confirm("ส่งสรุปประจำวันให้ admin ทุกคนเลย?")) return;
    startTransition(async () => {
      const result = await sendDigestNow();
      if (result.ok) {
        toast({
          title: `ส่งแล้ว ${result.sent}/${result.total} ราย`,
          description: result.failures ? `ติดขัด: ${result.failures.join(", ")}` : undefined,
        });
      } else {
        toast({ title: "ส่งไม่สำเร็จ", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Calendar Subscribe */}
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-400" /> Calendar Subscribe (Google / Apple)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Subscribe ปฏิทินที่ <strong>อัปเดตอัตโนมัติ</strong> — เห็น JOB ทุกงานในปฏิทินมือถือ/คอม
            พร้อมเตือนล่วงหน้า 1 วัน + 9 โมงเช้าวันส่ง
          </p>

          <div className="space-y-2">
            <Label className="text-xs">URL สำหรับ subscribe</Label>
            <div className="flex gap-2">
              <Input value={calendarUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(calendarUrl, "url")}>
                {copiedKey === "url" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <details className="rounded-md border border-border bg-card/30 p-3 text-xs">
            <summary className="cursor-pointer font-medium">📱 วิธีเพิ่มใน Google Calendar</summary>
            <ol className="mt-3 space-y-1.5 pl-4 text-muted-foreground">
              <li>1. เปิด <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">calendar.google.com</a> บนคอม (มือถือไม่รองรับการ add subscription)</li>
              <li>2. ซ้ายมือ → คลิก <strong>+</strong> ข้าง &quot;Other calendars&quot; → <strong>From URL</strong></li>
              <li>3. วาง URL ที่ copy ด้านบน → คลิก <strong>Add calendar</strong></li>
              <li>4. รอ ~5-15 นาที — เห็นในมือถือ Google Calendar app ด้วย</li>
              <li>💡 Google จะ refresh ทุก 24 ชม. — บางทีอัปเดตช้า</li>
            </ol>
          </details>

          <details className="rounded-md border border-border bg-card/30 p-3 text-xs">
            <summary className="cursor-pointer font-medium">🍎 วิธีเพิ่มใน iPhone Calendar</summary>
            <ol className="mt-3 space-y-1.5 pl-4 text-muted-foreground">
              <li>1. ในมือถือ → เปิดลิงก์นี้: <code className="break-all rounded bg-muted px-1.5 py-0.5">{calendarSubscribeUrl}</code></li>
              <li>2. iPhone จะเปิดแอป Calendar → คลิก <strong>Subscribe</strong></li>
              <li>3. ตั้งชื่อ + Auto-refresh: Every 15 minutes</li>
              <li>4. <strong>Save</strong> — เห็นใน Calendar app ทันที</li>
            </ol>
            <div className="mt-2">
              <Button asChild size="sm" variant="outline">
                <a href={calendarSubscribeUrl}>📲 เปิดในแอป Calendar</a>
              </Button>
            </div>
          </details>

          <details className="rounded-md border border-border bg-card/30 p-3 text-xs">
            <summary className="cursor-pointer font-medium">🪟 วิธีเพิ่มใน Outlook</summary>
            <ol className="mt-3 space-y-1.5 pl-4 text-muted-foreground">
              <li>1. <strong>Add calendar</strong> → <strong>Subscribe from web</strong></li>
              <li>2. วาง URL → ตั้งชื่อ → <strong>Import</strong></li>
            </ol>
          </details>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleRegenerateToken} disabled={isPending}>
              <RefreshCw className="h-3.5 w-3.5" /> Reset Token
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin LINE Digest */}
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" /> สรุปประจำวันทาง LINE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            รับสรุปงานวันนี้ส่งให้คุณทาง LINE OA ทุกเช้า <strong>09:00 น.</strong> อัตโนมัติ
            (มี: งานเลยกำหนด / ส่งวันนี้ / ส่งพรุ่งนี้ / รออนุมัติ)
          </p>

          <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3 text-xs">
            <p className="inline-flex items-center gap-1.5 font-medium">
              <Info className="h-3.5 w-3.5 text-blue-400" />
              วิธีหา LINE User ID ของคุณ
            </p>
            <ol className="mt-2 space-y-1 pl-4 text-muted-foreground">
              <li>1. Add LINE OA ของร้านเป็นเพื่อน (ที่ทำใน Phase 10)</li>
              <li>2. ทักข้อความใด ๆ ใน chat กับ OA</li>
              <li>3. กลับมาที่ <strong>Webhook events</strong> ด้านล่าง → หา event ของคุณ</li>
              <li>4. Copy <strong>LINE User ID</strong> (ขึ้นต้น U...) มาใส่ในช่องด้านล่าง</li>
            </ol>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">LINE User ID ส่วนตัวของคุณ (สำหรับรับสรุป)</Label>
            <div className="flex gap-2">
              <Input
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="font-mono text-xs"
              />
              <Button onClick={handleSaveLineId} disabled={isPending}>
                {isPending ? "บันทึก..." : "บันทึก"}
              </Button>
            </div>
            {personalLineId && (
              <Badge variant="success" className="text-xs">
                <Check className="h-3 w-3" /> ตั้งค่าแล้ว
              </Badge>
            )}
          </div>

          {personalLineId && (
            <div className="flex justify-end border-t border-border pt-3">
              <Button variant="outline" size="sm" onClick={handleSendDigestNow} disabled={isPending}>
                <Send className="h-3.5 w-3.5" /> ส่งสรุปทดสอบเลย
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
