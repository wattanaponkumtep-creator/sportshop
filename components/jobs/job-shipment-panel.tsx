"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SHIPMENT_STATUS_LABEL } from "@/lib/constants";
import { toast } from "@/components/ui/use-toast";
import { saveShipment } from "@/app/(admin)/jobs/actions";
import type { Shipment, ShipmentStatus } from "@/lib/types/database";

const STATUSES: ShipmentStatus[] = ["preparing", "shipped", "in_transit", "delivered", "returned"];

export function JobShipmentPanel({ jobId, shipment }: { jobId: string; shipment: Shipment | null }) {
  const [carrier, setCarrier] = useState(shipment?.carrier ?? "");
  const [trackingNo, setTrackingNo] = useState(shipment?.tracking_no ?? "");
  const [status, setStatus] = useState<ShipmentStatus>(shipment?.status ?? "preparing");
  const [note, setNote] = useState(shipment?.note ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await saveShipment(jobId, { carrier, tracking_no: trackingNo, status, note });
      if (result.ok) toast({ title: "บันทึกการจัดส่งแล้ว" });
      else toast({ title: "บันทึกไม่สำเร็จ", description: result.error, variant: "destructive" });
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>การจัดส่ง</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>บริษัทขนส่ง</Label>
            <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="เช่น Kerry / Flash / J&T" />
          </div>
          <div className="space-y-2">
            <Label>เลข Tracking</Label>
            <Input value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} placeholder="TH00..." />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>สถานะ</Label>
            <Select value={status} onValueChange={(v: ShipmentStatus) => setStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{SHIPMENT_STATUS_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>หมายเหตุ</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isPending}>{isPending ? "กำลังบันทึก..." : "บันทึก"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
