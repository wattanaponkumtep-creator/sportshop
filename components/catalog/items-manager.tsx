"use client";
import { useState, useRef, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Edit, Trash2, Save, Upload, Loader2, ImageIcon, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { createCatalogItem, updateCatalogItem, deleteCatalogItem, toggleItemActive } from "@/app/(admin)/catalog/actions";
import type { CatalogItem } from "@/lib/types/database";

type ItemEditor = {
  id?: string;
  name: string;
  description: string;
  thumbnail_path: string | null;
  thumbnail_preview_url: string | null;
  is_active: boolean;
  attributes: { key: string; value: string }[];
};

const EMPTY_ITEM: ItemEditor = {
  name: "",
  description: "",
  thumbnail_path: null,
  thumbnail_preview_url: null,
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
  const [editing, setEditing] = useState<ItemEditor | null>(null);
  const [isPending, startTransition] = useTransition();

  function startNew() {
    setEditing({ ...EMPTY_ITEM, attributes: [] });
  }
  function startEdit(item: CatalogItem) {
    setEditing({
      id: item.id,
      name: item.name,
      description: item.description ?? "",
      thumbnail_path: item.thumbnail_path,
      thumbnail_preview_url: item.thumbnail_path ? thumbnailUrls[item.thumbnail_path] ?? null : null,
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
      if (res.ok) toast({ title: "ลบแล้ว" });
      else toast({ title: "ลบไม่สำเร็จ", description: res.error, variant: "destructive" });
    });
  }

  function handleToggleActive(id: string, current: boolean) {
    startTransition(async () => {
      const res = await toggleItemActive(id, !current);
      if (!res.ok) toast({ title: "ไม่สำเร็จ", description: res.error, variant: "destructive" });
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
          onSaved={() => setEditing(null)}
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
          {items.map((item) => (
            <Card key={item.id} className={cn(!item.is_active && "opacity-50")}>
              <CardContent className="p-3">
                {/* Thumbnail */}
                <div className="mb-2 aspect-square overflow-hidden rounded-md bg-muted">
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
          ))}
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
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(editing.thumbnail_path);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(editing.thumbnail_preview_url);
  const [isActive, setIsActive] = useState(editing.is_active);
  const [attrs, setAttrs] = useState(editing.attributes);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleFile(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "ไฟล์ใหญ่เกิน 10MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `catalog/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("job-files").upload(path, file, { cacheControl: "3600" });
    if (error) {
      toast({ title: "อัปโหลดไม่สำเร็จ", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: signed } = await supabase.storage.from("job-files").createSignedUrl(path, 3600);
    setThumbnailPath(path);
    setThumbnailUrl(signed?.signedUrl ?? null);
    setUploading(false);
  }

  function addAttr() {
    setAttrs((a) => [...a, { key: "", value: "" }]);
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

    const payload = {
      category_id: categoryId,
      name: name.trim(),
      description: description.trim() || null,
      thumbnail_path: thumbnailPath,
      image_paths: thumbnailPath ? [thumbnailPath] : [],
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
      <CardContent className="space-y-3 p-4">
        <div className="text-sm font-semibold">
          {editing.id ? "✏️ แก้ไขรายการ" : "➕ เพิ่มรายการใหม่"}
        </div>

        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          {/* Thumbnail upload */}
          <div className="space-y-1.5">
            <Label className="text-xs">รูปหลัก</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="block aspect-square w-full overflow-hidden rounded-md border-2 border-dashed border-border bg-muted/30 transition hover:border-primary/50"
            >
              {uploading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
                  <Upload className="h-6 w-6" />
                  <span className="text-[10px]">คลิกเลือกรูป</span>
                </div>
              )}
            </button>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs">ชื่อ *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น Polyester Microfiber"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc" className="text-xs">รายละเอียด</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="เช่น เนื้อผ้าระบายอากาศได้ดี เหมาะกับกีฬากลางแจ้ง..."
              />
            </div>
          </div>
        </div>

        {/* Attributes */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">คุณสมบัติ / Specs (Optional)</Label>
            <Button type="button" size="sm" variant="ghost" onClick={addAttr}>
              <Plus className="h-3 w-3" /> เพิ่ม
            </Button>
          </div>
          {attrs.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              💡 เช่น น้ำหนัก: 180g, แห้งเร็ว: ใช่, ราคา: +10฿
            </p>
          ) : (
            <div className="space-y-1.5">
              {attrs.map((a, i) => (
                <div key={i} className="flex gap-1.5">
                  <Input
                    value={a.key}
                    onChange={(e) => updateAttr(i, "key", e.target.value)}
                    placeholder="ชื่อ (เช่น น้ำหนัก)"
                    className="flex-1 text-xs"
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
        </div>

        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          แสดงในหน้าสาธารณะ (is_active)
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
