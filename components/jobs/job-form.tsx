"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PRIORITY_LABEL } from "@/lib/constants";
import { toast } from "@/components/ui/use-toast";
import { createJob, type NewJobInput } from "@/app/(admin)/jobs/actions";
import type { PriorityLevel } from "@/lib/types/database";

const PRIORITIES: PriorityLevel[] = ["normal", "urgent", "rush"];

export function JobForm({
  customers,
  factories,
  preselectedCustomerId,
}: {
  customers: { id: string; name: string }[];
  factories: { id: string; name: string }[];
  preselectedCustomerId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<NewJobInput>({
    defaultValues: {
      customer_id: preselectedCustomerId ?? "",
      product_type: "",
      quantity: 0,
      sale_price: 0,
      cost: 0,
      shipping_cost: 0,
      other_cost: 0,
      priority: "normal",
      due_date: "",
      factory_id: "",
      note: "",
    },
  });
  const customerId = watch("customer_id");
  const factoryId = watch("factory_id");
  const priority = watch("priority");

  function onSubmit(data: NewJobInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await createJob({
        ...data,
        factory_id: data.factory_id || null,
        due_date: data.due_date || null,
      });
      if (result && "ok" in result && !result.ok) {
        setServerError(result.error);
        toast({ title: "บันทึกไม่สำเร็จ", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>ข้อมูลพื้นฐาน</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>ลูกค้า *</Label>
            <Select value={customerId} onValueChange={(v) => setValue("customer_id", v)}>
              <SelectTrigger><SelectValue placeholder="เลือกลูกค้า" /></SelectTrigger>
              <SelectContent>
                {customers.length === 0 && <div className="p-2 text-sm text-muted-foreground">ยังไม่มีลูกค้า</div>}
                {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.customer_id && <p className="text-xs text-destructive">กรุณาเลือกลูกค้า</p>}
            <input type="hidden" {...register("customer_id", { required: true })} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product_type">ประเภทเสื้อ</Label>
              <Input id="product_type" {...register("product_type")} placeholder="เช่น เสื้อบอลคอกลม / Polo / แขนยาว" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">จำนวน (ตัว)</Label>
              <Input id="quantity" type="number" min="0" {...register("quantity")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="due_date">กำหนดส่ง</Label>
              <Input id="due_date" type="date" {...register("due_date")} />
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>การเงิน</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sale_price">ราคาขาย (บาท)</Label>
            <Input id="sale_price" type="number" step="0.01" min="0" {...register("sale_price")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost">ต้นทุนโรงงาน (บาท)</Label>
            <Input id="cost" type="number" step="0.01" min="0" {...register("cost")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shipping_cost">ค่าส่ง (บาท)</Label>
            <Input id="shipping_cost" type="number" step="0.01" min="0" {...register("shipping_cost")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="other_cost">ค่าอื่น ๆ (บาท)</Label>
            <Input id="other_cost" type="number" step="0.01" min="0" {...register("other_cost")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>โรงงาน + หมายเหตุ</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>โรงงาน (เลือกตอนนี้หรือทีหลังก็ได้)</Label>
            <Select value={factoryId ?? ""} onValueChange={(v) => setValue("factory_id", v === "_none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="ยังไม่เลือก" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">ยังไม่เลือก</SelectItem>
                {factories.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">หมายเหตุงาน</Label>
            <Textarea id="note" {...register("note")} placeholder="รายละเอียดเพิ่มเติม โลโก้ Sponsor ฯลฯ" />
          </div>
        </CardContent>
      </Card>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => history.back()}>ยกเลิก</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "กำลังบันทึก..." : "เปิด JOB"}</Button>
      </div>
    </form>
  );
}
