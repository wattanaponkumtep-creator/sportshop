"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTH, timeAgo } from "@/lib/utils";
import { Plus, Circle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { addTimelineEvent } from "@/app/(admin)/jobs/actions";
import type { JobTimeline as JobTimelineRow } from "@/lib/types/database";

export function JobTimeline({ jobId, events }: { jobId: string; events: JobTimelineRow[] }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!text.trim()) return;
    startTransition(async () => {
      const result = await addTimelineEvent(jobId, "note", text.trim());
      if (result.ok) {
        toast({ title: "เพิ่มบันทึกแล้ว" });
        setText("");
        setAdding(false);
      } else toast({ title: "เพิ่มไม่สำเร็จ", description: result.error, variant: "destructive" });
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Timeline</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> เพิ่มบันทึก
        </Button>
      </CardHeader>
      <CardContent>
        {adding && (
          <div className="mb-4 flex gap-2 rounded-md border border-dashed border-border p-3">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="เช่น โทรยืนยันรายชื่อแล้ว" />
            <Button size="sm" onClick={handleAdd} disabled={isPending}>บันทึก</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>ยกเลิก</Button>
          </div>
        )}

        {events.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">ยังไม่มี event</p>
        ) : (
          <ol className="relative space-y-4 border-l border-border pl-6">
            {events.map((ev) => (
              <li key={ev.id} className="relative">
                <Circle className="absolute -left-[31px] top-1.5 h-3 w-3 fill-primary text-primary" />
                <div className="text-sm">{ev.description}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {formatDateTH(ev.created_at)} · {timeAgo(ev.created_at)}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
