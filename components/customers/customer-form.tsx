"use client";
import { useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X } from "lucide-react";
import { CHANNEL_LABEL } from "@/lib/constants";
import { toast } from "@/components/ui/use-toast";
import { createCustomer, type CustomerFormInput } from "@/app/(admin)/customers/actions";
import type { ChannelType } from "@/lib/types/database";

const CHANNEL_OPTIONS: ChannelType[] = ["phone", "line", "line_oa", "fb", "fb_page", "other"];

export function CustomerForm() {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<CustomerFormInput>({
    defaultValues: { name: "", phone: "", primary_channel: "phone", note: "", channels: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "channels" });
  const primaryChannel = watch("primary_channel");

  function onSubmit(data: CustomerFormInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await createCustomer(data);
      if (result && "ok" in result && !result.ok) {
        setServerError(result.error);
        toast({ title: "บันทึกไม่สำเร็จ", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลพื้นฐาน</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">ชื่อลูกค้า *</Label>
            <Input id="name" {...register("name", { required: true })} placeholder="เช่น คุณสมชาย / ทีมราชบุรี FC" />
            {errors.name && <p className="text-xs text-destructive">กรุณาใส่ชื่อ</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">เบอร์โทร</Label>
              <Input id="phone" {...register("phone")} placeholder="08x-xxx-xxxx" />
            </div>
            <div className="space-y-2">
              <Label>ช่องทางหลัก</Label>
              <Select value={primaryChannel} onValueChange={(v: ChannelType) => setValue("primary_channel", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNEL_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>{CHANNEL_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">หมายเหตุ</Label>
            <Textarea id="note" {...register("note")} placeholder="ข้อมูลเพิ่มเติม เช่น ทีม / โรงเรียน / ส่วนลด" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>ช่องทางติดต่ออื่น ๆ</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ channel_type: "line", external_id: "", display_name: "", note: "" })}
          >
            <Plus className="h-4 w-4" /> เพิ่ม
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground">ยังไม่มีช่องทางอื่น — เพิ่ม LINE / Facebook ของลูกค้าได้</p>
          )}
          {fields.map((field, idx) => (
            <div key={field.id} className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[180px_1fr_1fr_auto]">
              <Select
                value={watch(`channels.${idx}.channel_type`)}
                onValueChange={(v: ChannelType) => setValue(`channels.${idx}.channel_type`, v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNEL_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>{CHANNEL_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input {...register(`channels.${idx}.display_name`)} placeholder="ชื่อที่แสดง" />
              <Input {...register(`channels.${idx}.external_id`)} placeholder="ID / เบอร์ / username" />
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => history.back()}>ยกเลิก</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "กำลังบันทึก..." : "บันทึกลูกค้า"}</Button>
      </div>
    </form>
  );
}
