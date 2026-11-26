"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { PRIORITY_LABEL, PRODUCTION_OPTION_GROUPS, DELIVERY_METHOD_PRESETS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { updateJob, addProductionOptionPreset, deleteProductionOptionPreset } from "@/app/(admin)/jobs/actions";
import type { Job, PriorityLevel } from "@/lib/types/database";

// ชุดออปชั่นสำเร็จรูปทั้งหมด (ใช้กันซ้ำกับคลังที่บันทึกเอง)
const PRESET_LABELS = new Set<string>(PRODUCTION_OPTION_GROUPS.flatMap((g) => g.options as readonly string[]));

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
  delivery_method: string;
  customer_shipping_fee: number;
};

const PRIORITIES: PriorityLevel[] = ["normal", "urgent", "rush"];

export function JobDetailsPanel({
  job,
  factories,
  savedOptions = [],
}: {
  job: Job;
  factories: { id: string; name: string }[];
  savedOptions?: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>(job.production_options ?? []);
  const [customOption, setCustomOption] = useState("");
  // คลังออปชั่นที่ "เพิ่มเอง" — บันทึกไว้ใช้ซ้ำทุกงาน (ตัดตัวที่ซ้ำกับสำเร็จรูปออก)
  const [savedList, setSavedList] = useState<string[]>(
    () => savedOptions.filter((o) => !PRESET_LABELS.has(o)),
  );

  function toggleOption(opt: string) {
    setOptions((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]));
  }
  function addCustomOption() {
    const v = customOption.trim();
    if (!v) {
      setCustomOption("");
      return;
    }
    // เลือกใส่ในงานนี้
    setOptions((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setCustomOption("");
    // บันทึกลงคลัง (ถ้ายังไม่เคยมี + ไม่ใช่ตัวสำเร็จรูป) เพื่อใช้ซ้ำงานหน้า
    if (!PRESET_LABELS.has(v) && !savedList.includes(v)) {
      setSavedList((prev) => [...prev, v]); // optimistic
      startTransition(async () => {
        const res = await addProductionOptionPreset(v);
        if (!res.ok) {
          setSavedList((prev) => prev.filter((o) => o !== v));
          toast({ title: "บันทึกออปชั่นเข้าคลังไม่สำเร็จ", description: res.error, variant: "destructive" });
        } else {
          toast({ title: `บันทึก “${v}” เข้าคลังแล้ว — งานหน้ากดเลือกได้เลย ✅` });
        }
      });
    }
  }
  function removeFromCatalog(opt: string) {
    setSavedList((prev) => prev.filter((o) => o !== opt)); // optimistic
    startTransition(async () => {
      const res = await deleteProductionOptionPreset(opt);
      if (!res.ok) {
        setSavedList((prev) => (prev.includes(opt) ? prev : [...prev, opt]));
        toast({ title: "ลบออกจากคลังไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }
  function removeOption(opt: string) {
    setOptions((prev) => prev.filter((o) => o !== opt));
  }

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
      delivery_method: job.delivery_method ?? "",
      customer_shipping_fee: Number(job.customer_shipping_fee ?? 0),
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
        production_options: options,
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
        <CardHeader>
          <CardTitle>ออปชั่นการผลิต (สั่งโรงงาน)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {PRODUCTION_OPTION_GROUPS.map((g) => (
            <div key={g.group} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{g.group}</Label>
              <div className="flex flex-wrap gap-1.5">
                {g.options.map((opt) => {
                  const active = options.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleOption(opt)}
                      className={cn(
                        "rounded-full border-2 px-3 py-1 text-xs transition",
                        active
                          ? "border-primary bg-primary/15 font-medium text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {active ? "✓ " : ""}
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* คลังออปชั่นที่บันทึกเอง — ใช้ซ้ำได้ทุกงาน */}
          {savedList.length > 0 && (
            <div className="space-y-1.5 border-t border-border pt-3">
              <Label className="text-xs text-muted-foreground">⭐ ที่บันทึกไว้ (เพิ่มเอง)</Label>
              <div className="flex flex-wrap gap-1.5">
                {savedList.map((opt) => {
                  const active = options.includes(opt);
                  return (
                    <span
                      key={opt}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border-2 pl-3 pr-1.5 py-1 text-xs transition",
                        active
                          ? "border-primary bg-primary/15 font-medium text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      <button type="button" onClick={() => toggleOption(opt)}>
                        {active ? "✓ " : ""}
                        {opt}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCatalog(opt)}
                        title="ลบออกจากคลัง"
                        className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">กดชื่อเพื่อเลือกใส่งานนี้ · กด ✕ เพื่อลบออกจากคลัง</p>
            </div>
          )}

          {/* Custom option */}
          <div className="space-y-1.5 border-t border-border pt-3">
            <Label className="text-xs text-muted-foreground">เพิ่มเอง (อื่นๆ) — จะถูกบันทึกเข้าคลังให้ใช้ซ้ำ</Label>
            <div className="flex gap-2">
              <Input
                value={customOption}
                onChange={(e) => setCustomOption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomOption();
                  }
                }}
                placeholder="เช่น ปักธงชาติแขนซ้าย, ผ้าพิเศษ..."
              />
              <Button type="button" variant="outline" onClick={addCustomOption}>
                <Plus className="h-4 w-4" /> เพิ่ม
              </Button>
            </div>
          </div>

          {/* Selected summary */}
          {options.length > 0 && (
            <div className="space-y-1.5 rounded-md border border-primary/30 bg-primary/5 p-3">
              <div className="text-xs font-semibold text-primary">
                ✅ ที่เลือกไว้ ({options.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {options.map((opt) => (
                  <Badge key={opt} variant="secondary" className="gap-1">
                    {opt}
                    <button type="button" onClick={() => removeOption(opt)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            💡 ออปชั่นเหล่านี้จะแสดงในใบสั่งงานที่ส่งให้โรงงาน (tab โรงงาน)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>การจัดส่ง</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>วิธีจัดส่ง / ขนส่ง</Label>
              <datalist id="delivery-methods">
                {DELIVERY_METHOD_PRESETS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <Input
                list="delivery-methods"
                {...register("delivery_method")}
                placeholder="เช่น รถทัวร์ (บขส.), Kerry, Flash, ไปรษณีย์..."
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                💡 บอกโรงงานว่าส่งด้วยขนส่งอะไร — แสดงในใบสั่งงาน
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>ค่าส่งที่คิดลูกค้า (บาท)</Label>
              <Input type="number" step="0.01" min="0" {...register("customer_shipping_fee")} placeholder="0" />
              <p className="text-xs text-muted-foreground">
                💡 ใส่ยอดค่าส่งจริงเมื่อรู้ — จะ<strong>บวกเข้าบิล + แสดงให้ลูกค้า</strong> (แยกจากราคาสินค้า)
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>ที่อยู่จัดส่ง</Label>
            <Textarea
              {...register("delivery_address")}
              rows={3}
              placeholder="เช่น โรงเรียน... บ้านเลขที่ 57 หมู่ 1 ต.นับทึบ อ.วังน้อย จ.พระนครศรีอยุธยา 13170"
            />
            <p className="text-xs text-muted-foreground">
              💡 ที่อยู่นี้จะแสดงในข้อความแจ้งโรงงาน (ปุ่ม &quot;ส่งใบสั่งงาน&quot; ใน tab โรงงาน)
            </p>
          </div>
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
