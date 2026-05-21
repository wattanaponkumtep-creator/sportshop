"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, MessageCircle } from "lucide-react";
import { CHANNEL_LABEL } from "@/lib/constants";
import type { ChannelType, CustomerChannel } from "@/lib/types/database";
import { addCustomerChannel, removeCustomerChannel } from "@/app/(admin)/customers/actions";
import { toast } from "@/components/ui/use-toast";

const CHANNEL_OPTIONS: ChannelType[] = ["phone", "line", "line_oa", "fb", "fb_page", "other"];

export function CustomerChannels({ customerId, channels }: { customerId: string; channels: CustomerChannel[] }) {
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<ChannelType>("line");
  const [externalId, setExternalId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const result = await addCustomerChannel(customerId, {
        channel_type: type,
        external_id: externalId,
        display_name: displayName,
      });
      if (result.ok) {
        toast({ title: "เพิ่มช่องทางสำเร็จ" });
        setAdding(false);
        setExternalId("");
        setDisplayName("");
      } else {
        toast({ title: "เพิ่มไม่สำเร็จ", description: result.error, variant: "destructive" });
      }
    });
  }

  function handleRemove(id: string) {
    if (!confirm("ลบช่องทางนี้?")) return;
    startTransition(async () => {
      const result = await removeCustomerChannel(id, customerId);
      if (!result.ok) toast({ title: "ลบไม่สำเร็จ", description: result.error, variant: "destructive" });
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>ช่องทางติดต่อ</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> เพิ่ม
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <div className="grid gap-2 rounded-md border border-dashed border-border p-3 sm:grid-cols-[160px_1fr_1fr_auto]">
            <Select value={type} onValueChange={(v: ChannelType) => setType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((c) => <SelectItem key={c} value={c}>{CHANNEL_LABEL[c]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="ชื่อที่แสดง" />
            <Input value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder="ID / username" />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>บันทึก</Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>ยกเลิก</Button>
            </div>
          </div>
        )}

        {channels.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">ยังไม่มีช่องทางอื่น</p>
        )}

        {channels.map((ch) => (
          <div key={ch.id} className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{CHANNEL_LABEL[ch.channel_type]}</Badge>
                  {ch.display_name && <span className="font-medium">{ch.display_name}</span>}
                </div>
                {ch.external_id && <div className="mt-0.5 text-xs text-muted-foreground">{ch.external_id}</div>}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleRemove(ch.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
