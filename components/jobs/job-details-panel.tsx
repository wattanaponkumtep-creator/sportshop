"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRIORITY_LABEL } from "@/lib/constants";
import { toast } from "@/components/ui/use-toast";
import { updateJob } from "@/app/(admin)/jobs/actions";
import type { Job, PriorityLevel } from "@/lib/types/database";

type EditInput = {
  product_type: string;
  quantity: number;
  sale_price: number;
  cost: number;
  shipping_cost: number;
  other_cost: number;
  priority: PriorityLevel;
  due_date: string;
  factory_id: string;
  note: string;
  job_label: string;
  delivery_address: string;
};

const PRIORITIES: PriorityLevel[] = ["normal", "urgent", "rush"];

export function JobDetailsPanel({ job, factories }: { job: Job; factories: { id: string; name: string }[] }) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch } = useForm<EditInput>({
    defaultValues: {
      product_type: job.product_type ?? "",
      quantity: job.quantity,
      sale_price: Number(job.sale_price),
      cost: Number(job.cost),
      shipping_cost: Number(job.shipping_cost),
      other_cost: Number(job.other_cost),
      priority: job.priority,
      due_date: job.due_date ?? "",
      factory_id: job.factory_id ?? "",
      note: job.note ?? "",
      job_label: job.job_label ?? "",
      delivery_address: job.delivery_address ?? "",
    },
  });
  const factoryId = watch("factory_id");
  const priority = watch("priority");

  function onSubmit(data: EditInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await updateJob(job.id, {
        ...data,
        factory_id: data.factory_id || null,
        due_date: data.due_date || null,
      });
      if (!result.ok) {
        setServerError(result.error);
        toast({ title: "บันทึกไม่สำเร็จ", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "บันทึกแล้ว" });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader><CardTitle>รายละเอียดงาน</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>ชื่อไฟล์งาน / Job Label</Label>
            <Input {...register("job_label")} placeholder="เช่น เสื้อบอลทีมทรู A 25 ตัว" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>ประเภทเสื้อ (สั้น)</Label>
            <Input {...register("product_type")} placeholder="เช่น เสื้อบอลคอกลม" />
          </div>
          <div className="space-y-2">
            <Label>ความสำคัญ</Label>
            <Select value={priority} onValueChange={(v: PriorityLevel) => setValue("priority", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>กำหนดส่ง</Label>
            <Input type="date" {...register("due_date")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>โรงงาน</Label>
            <Select value={factoryId || "_none"} onValueChange={(v) => setValue("factory_id", v === "_none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="ยังไม่เลือก" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">ยังไม่เลือก</SelectItem>
                {factories.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      {/* การเงิน ย้ายไปอยู่ tab "การเงิน" — รายละเอียดละเอียดกว่าด้วย Line Items */}
      {/* hidden fields: keep editable via Finance tab */}
      <input type="hidden" {...register("quantity")} value={job.quantity} />
      <input type="hidden" {...register("sale_price")} value={Number(job.sale_price)} />
      <input type="hidden" {...register("cost")} value={Number(job.cost)} />
      <input type="hidden" {...register("shipping_cost")} value={Number(job.shipping_cost)} />
      <input type="hidden" {...register("other_cost")} value={Number(job.other_cost)} />

      <Card>
        <CardHeader><CardTitle>ที่อยู่จัดส่ง</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          <Textarea
            {...register("delivery_address")}
            rows={3}
            placeholder="เช่น โรงเรียน... บ้านเลขที่ 57 หมู่ 1 ต.นับทึบ อ.วังน้อย จ.พระนครศรีอยุธยา 13170"
          />
          <p className="text-xs text-muted-foreground">
            💡 ที่อยู่นี้จะแสดงในข้อความแจ้งโรงงาน (ปุ่ม &quot;ส่งใบสั่งงาน&quot; ใน tab โรงงาน)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>หมายเหตุ</CardTitle></CardHeader>
        <CardContent>
          <Textarea {...register("note")} rows={4} />
        </CardContent>
      </Card>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>{isPending ? "กำลังบันทึก..." : "บันทึก"}</Button>
      </div>
    </form>
  );
}
