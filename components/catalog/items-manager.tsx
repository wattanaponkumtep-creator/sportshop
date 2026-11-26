"use client";
import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Edit, Trash2, Save, Upload, Loader2, ImageIcon, Eye, EyeOff, Star, Images } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { uploadToR2 } from "@/lib/storage/upload-client";
import { createCatalogItem, updateCatalogItem, deleteCatalogItem, toggleItemActive } from "@/app/(admin)/catalog/actions";
import type { CatalogItem } from "@/lib/types/database";

// สเปคที่ใช้บ่อย — กดเพิ่มเร็ว ไม่ต้องพิมพ์ชื่อคอลัมน์เอง
const SPEC_PRESETS = [
  "น้ำหนักผ้า",
  "ความหนา",
  "ระบายอากาศ",
  "แห้งไว",
  "ความยืดหยุ่น",
  "ผิวสัมผัส",
  "เหมาะกับ",
  "สีที่มี",
  "ราคาเพิ่ม/ตัว",
];

type ItemImage = { path: string; url: string | null };

type ItemEditor = {
  id?: string;
  name: string;
  description: string;
  images: ItemImage[];
  is_active: boolean;
  attributes: { key: string; value: string }[];
};

const EMPTY_ITEM: ItemEditor = {
  name: "",
  description: "",
  images: [],
  is_active: true,
  attributes: [],
};

export function CatalogItemsManager({
  categoryId,
  items,
  thumbnailUrls,
}: {
  categoryId: string;
  items: CatalogItem[];
  thumbnailUrls: Record<string, string>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ItemEditor | null>(null);
  const [isPending, startTransition] = useTransition();

  function startNew() {
    setEditing({ ...EMPTY_ITEM, images: [], attributes: [] });
  }
  function startEdit(item: CatalogItem) {
    // รวมรูปปก + รูปในคลัง (กันซ้ำ, ให้รูปปกอยู่หน้าสุด)
    const paths = [
      ...(item.thumbnail_path ? [item.thumbnail_path] : []),
      ...((item.image_paths as string[] | null) ?? []),
    ];
    const uniquePaths = [...new Set(paths)];
    setEditing({
      id: item.id,
      name: item.name,
      description: item.description ?? "",
      images: uniquePaths.map((p) => ({ path: p, url: thumbnailUrls[p] ?? null })),
      is_active: item.is_active,
      attributes: Object.entries(item.attributes ?? {}).map(([key, value]) => ({
        key,
        value: String(value ?? ""),
      })),
    });
  }
  function cancel() {
    setEditing(null);
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`ลบ "${name}"? (รูปจะถูกลบด้วย)`)) return;
    startTransition(async () => {
      const res = await deleteCatalogItem(id);
      if (res.ok) {
        toast({ title: "ลบแล้ว" });
        router.refresh();
      } else {
        toast({ title: "ลบไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  function handleToggleActive(id: string, current: boolean) {
    startTransition(async () => {
      const res = await toggleItemActive(id, !current);
      if (res.ok) router.refresh();
      else toast({ title: "ไม่สำเร็จ", description: res.error, variant: "destructive" });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={startNew}>
          <Plus className="h-4 w-4" /> เพิ่มรายการใหม่
        </Button>
      </div>

      {editing && (
        <ItemEditForm
          categoryId={categoryId}
          editing={editing}
          onCancel={cancel}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            ยังไม่มีรายการในหมวดนี้ — กดปุ่ม &quot;เพิ่มรายการใหม่&quot;
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const imageCount = ((item.image_paths as string[] | null) ?? []).length;
            return (
            <Card key={item.id} className={cn(!item.is_active && "opacity-50")}>
              <CardContent className="p-3">
                {/* Thumbnail */}
                <div className="relative mb-2 aspect-square overflow-hidden rounded-md bg-muted">
                  {item.thumbnail_path && thumbnailUrls[item.thumbnail_path] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnailUrls[item.thumbnail_path]}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                  {imageCount > 1 && (
                    <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      <Images className="h-3 w-3" /> {imageCount}
                    </span>
                  )}
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{item.name}</div>
                    {item.description && (
                      <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    )}
                  </div>
                  {!item.is_active && <Badge variant="outline" className="shrink-0 text-[10px]">ซ่อน</Badge>}
                </div>

                {/* Attributes preview */}
                {Object.keys(item.attributes ?? {}).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Object.entries(item.attributes ?? {}).slice(0, 3).map(([k, v]) => (
                      <Badge key={k} variant="outline" className="text-[10px]">
                        {k}: {String(v)}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleActive(item.id, item.is_active)}
                    disabled={isPending}
                    className="flex-1"
                  >
                    {item.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {item.is_active ? "ซ่อน" : "เปิด"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => startEdit(item)} className="flex-1">
                    <Edit className="h-3 w-3" /> แก้ไข
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(item.id, item.name)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ItemEditForm({
  categoryId,
  editing,
  onCancel,
  onSaved,
}: {
  categoryId: string;
  editing: ItemEditor;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(editing.name);
  const [description, setDescription] = useState(editing.description);
  const [images, setImages] = useState<ItemImage[]>(editing.images);
  const [isActive, setIsActive] = useState(editing.is_active);
  const [attrs, setAttrs] = useState(editing.attributes);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    setUploading(true);
    const added: ItemImage[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: `"${file.name}" ใหญ่เกิน 10MB — ข้าม`, variant: "destructive" });
        continue;
      }
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `catalog/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await uploadToR2(path, file);
      if (!up.ok) {
        toast({ title: `อัปโหลด "${file.name}" ไม่สำเร็จ`, description: up.error, variant: "destructive" });
        continue;
      }
      added.push({ path, url: up.publicUrl });
    }
    if (added.length) setImages((prev) => [...prev, ...added]);
    setUploading(false);
  }

  function removeImage(path: string) {
    setImages((prev) => prev.filter((img) => img.path !== path));
  }
  function makeCover(path: string) {
    setImages((prev) => {
      const target = prev.find((img) => img.path === path);
      if (!target) return prev;
      return [target, ...prev.filter((img) => img.path !== path)];
    });
  }

  function addAttr(key = "") {
    setAttrs((a) => [...a, { key, value: "" }]);
  }
  function addPreset(key: string) {
    setAttrs((a) => (a.some((row) => row.key.trim() === key) ? a : [...a, { key, value: "" }]));
  }
  function removeAttr(i: number) {
    setAttrs((a) => a.filter((_, idx) => idx !== i));
  }
  function updateAttr(i: number, field: "key" | "value", v: string) {
    setAttrs((a) => a.map((row, idx) => (idx === i ? { ...row, [field]: v } : row)));
  }

  function handleSave() {
    if (!name.trim()) {
      toast({ title: "กรุณาใส่ชื่อ", variant: "destructive" });
      return;
    }
    const attrObj: Record<string, string> = {};
    for (const { key, value } of attrs) {
      const k = key.trim();
      if (k) attrObj[k] = value.trim();
    }

    const imagePaths = images.map((img) => img.path);
    const payload = {
      category_id: categoryId,
      name: name.trim(),
      description: description.trim() || null,
      thumbnail_path: imagePaths[0] ?? null, // รูปแรก = รูปปก
      image_paths: imagePaths,
      attributes: attrObj,
      is_active: isActive,
      position: 0,
    };

    startTransition(async () => {
      const res = editing.id
        ? await updateCatalogItem(editing.id, payload)
        : await createCatalogItem(payload);
      if (res.ok) {
        toast({ title: editing.id ? "บันทึกแล้ว ✅" : "เพิ่มรายการใหม่แล้ว ✅" });
        onSaved();
      } else {
        toast({ title: "บันทึกไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  return (
    <Card className="border-primary/40">
      <CardContent className="space-y-4 p-4">
        <div className="text-sm font-semibold">
          {editing.id ? "✏️ แก้ไขรายการ" : "➕ เพิ่มรายการใหม่"}
        </div>

        {/* รูปภาพ — หลายรูปได้ */}
        <div className="space-y-1.5">
          <Label className="text-xs">รูปภาพ (ใส่ได้หลายรูป · รูปแรก = รูปปก)</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
          />
          <div className="flex flex-wrap gap-2">
            {images.map((img, idx) => (
              <div
                key={img.path}
                className={cn(
                  "group relative h-24 w-24 overflow-hidden rounded-md border-2 bg-muted",
                  idx === 0 ? "border-primary" : "border-border",
                )}
              >
                {img.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                {idx === 0 ? (
                  <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded bg-primary px-1 py-0.5 text-[9px] font-medium text-primary-foreground">
                    <Star className="h-2.5 w-2.5" /> ปก
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => makeCover(img.path)}
                    className="absolute left-1 top-1 rounded bg-black/60 px-1 py-0.5 text-[9px] text-white opacity-0 transition group-hover:opacity-100"
                    title="ตั้งเป็นรูปปก"
                  >
                    ตั้งเป็นปก
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(img.path)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
                  title="ลบรูปนี้"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {/* ปุ่มเพิ่มรูป */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition hover:border-primary/50"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  <span className="text-[10px]">เพิ่มรูป</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ชื่อ + รายละเอียด */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs">ชื่อ *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น ผ้าไมโคร (Polyester Microfiber)"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc" className="text-xs">รายละเอียด</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="เช่น เนื้อผ้านุ่ม ระบายอากาศดี แห้งไว เหมาะกับกีฬากลางแจ้ง..."
            />
          </div>
        </div>

        {/* Attributes */}
        <div className="space-y-2">
          <Label className="text-xs">คุณสมบัติ / สเปค</Label>
          {/* ชิปกดเพิ่มเร็ว */}
          <div className="flex flex-wrap gap-1.5">
            {SPEC_PRESETS.map((k) => {
              const used = attrs.some((row) => row.key.trim() === k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => addPreset(k)}
                  disabled={used}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] transition",
                    used
                      ? "border-primary/40 bg-primary/10 text-primary/60"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  )}
                >
                  {used ? "✓ " : "+ "}
                  {k}
                </button>
              );
            })}
          </div>

          {attrs.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              💡 กดชิปด้านบนเพื่อเพิ่มสเปคเร็วๆ แล้วใส่แค่ค่า (หรือกด &quot;เพิ่มเอง&quot; ด้านล่าง)
            </p>
          ) : (
            <div className="space-y-1.5">
              {attrs.map((a, i) => (
                <div key={i} className="flex gap-1.5">
                  <Input
                    value={a.key}
                    onChange={(e) => updateAttr(i, "key", e.target.value)}
                    placeholder="ชื่อสเปค (เช่น น้ำหนักผ้า)"
                    className="w-40 text-xs"
                  />
                  <Input
                    value={a.value}
                    onChange={(e) => updateAttr(i, "value", e.target.value)}
                    placeholder="ค่า (เช่น 180g)"
                    className="flex-1 text-xs"
                  />
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeAttr(i)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={() => addAttr()}>
            <Plus className="h-3 w-3" /> เพิ่มเอง
          </Button>
        </div>

        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          แสดงในหน้าสาธารณะ (ให้ลูกค้าเห็น)
        </label>

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave} disabled={isPending || uploading}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isPending ? "บันทึก..." : "บันทึก"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
