"use client";
import { useEffect, useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Star, Image as ImageIcon, Loader2, Save } from "lucide-react";
import { SPORT_TYPES, DESIGN_COLOR_OPTIONS, DESIGN_COLOR_HEX, DESIGN_COLOR_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { createDesign, updateDesign } from "@/app/(admin)/designs/actions";
import type { Design } from "@/lib/types/database";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp";

type UploadedImage = { path: string; url: string; uploading?: boolean };

type Props = {
  existing?: Design;
  /** Pre-signed image URLs from the server — eliminates the client-side fetch */
  initialImages?: UploadedImage[];
};

export function DesignForm({ existing, initialImages = [] }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Form state
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [sportType, setSportType] = useState(existing?.sport_type ?? "");
  const [colors, setColors] = useState<string[]>(existing?.colors ?? []);
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [suggestedPrice, setSuggestedPrice] = useState<string>(existing?.suggested_price?.toString() ?? "");
  const [suggestedCost, setSuggestedCost] = useState<string>(existing?.suggested_cost?.toString() ?? "");
  const [note, setNote] = useState(existing?.note ?? "");

  // Images (in order — first one is thumbnail). Server provides pre-signed URLs.
  const [images, setImages] = useState<UploadedImage[]>(initialImages);

  // Revoke blob: URLs on unmount to free memory
  useEffect(() => {
    return () => {
      setImages((current) => {
        for (const img of current) {
          if (img.url.startsWith("blob:")) URL.revokeObjectURL(img.url);
        }
        return current;
      });
    };
  }, []);

  async function handleFiles(files: FileList) {
    const valid = Array.from(files).filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        toast({ title: `ไฟล์ "${f.name}" ใหญ่เกิน 20MB`, variant: "destructive" });
        return false;
      }
      return true;
    });

    if (valid.length === 0) return;

    // Add placeholders (blob URLs for instant preview)
    const placeholders: UploadedImage[] = valid.map((f) => ({
      path: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${f.name}`,
      url: URL.createObjectURL(f),
      uploading: true,
    }));
    setImages((prev) => [...prev, ...placeholders]);

    // Upload in parallel — each file has a unique random path, so no conflicts
    await Promise.all(
      valid.map(async (file, i) => {
        const placeholder = placeholders[i];
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `designs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error } = await supabase.storage
          .from("job-files")
          .upload(path, file, { cacheControl: "3600", upsert: false });

        if (error) {
          toast({ title: `อัปโหลด ${file.name} ไม่สำเร็จ`, description: error.message, variant: "destructive" });
          URL.revokeObjectURL(placeholder.url);
          setImages((prev) => prev.filter((img) => img.path !== placeholder.path));
          return;
        }

        const { data: signed } = await supabase.storage.from("job-files").createSignedUrl(path, 3600);
        URL.revokeObjectURL(placeholder.url); // free blob memory
        setImages((prev) =>
          prev.map((img) =>
            img.path === placeholder.path
              ? { path, url: signed?.signedUrl ?? img.url, uploading: false }
              : img,
          ),
        );
      }),
    );
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      const target = prev[idx];
      if (target?.url.startsWith("blob:")) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function setAsThumbnail(idx: number) {
    setImages((prev) => {
      const next = [...prev];
      const [picked] = next.splice(idx, 1);
      return [picked, ...next];
    });
  }

  function toggleColor(value: string) {
    setColors((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) {
      setTagInput("");
      return;
    }
    setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "กรุณาใส่ชื่อดีไซน์", variant: "destructive" });
      return;
    }

    const realImages = images.filter((img) => !img.uploading);
    if (realImages.length === 0) {
      toast({ title: "กรุณาอัปโหลดรูปอย่างน้อย 1 รูป", variant: "destructive" });
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      sport_type: sportType || null,
      colors,
      tags,
      thumbnail_path: realImages[0].path,
      image_paths: realImages.map((img) => img.path),
      suggested_price: suggestedPrice ? Number(suggestedPrice) : null,
      suggested_cost: suggestedCost ? Number(suggestedCost) : null,
      note: note.trim() || null,
    };

    startTransition(async () => {
      if (existing) {
        const result = await updateDesign(existing.id, payload);
        if (result.ok) {
          toast({ title: "บันทึกแล้ว ✅" });
          router.push(`/designs/${existing.id}`);
        } else {
          toast({ title: "บันทึกไม่สำเร็จ", description: result.error, variant: "destructive" });
        }
      } else {
        const result = await createDesign(payload);
        if (result.ok) {
          toast({ title: "เพิ่มดีไซน์ใหม่แล้ว ✅" });
          router.push(`/designs/${result.id}`);
        } else {
          toast({ title: "บันทึกไม่สำเร็จ", description: result.error, variant: "destructive" });
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4 text-orange-400" /> รูปดีไซน์
            <Badge variant="outline" className="ml-2 text-xs">{images.length} รูป</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />

          {images.length === 0 ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 py-12 text-sm text-muted-foreground transition hover:border-primary/50 hover:bg-primary/5"
            >
              <Upload className="h-8 w-8" />
              <span>คลิกเพื่ออัปโหลดรูปดีไซน์</span>
              <span className="text-xs">PNG / JPG / WEBP (สูงสุด 20MB ต่อรูป)</span>
            </button>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {images.map((img, idx) => {
                  const isThumbnail = idx === 0;
                  return (
                    <div
                      key={img.path}
                      className={cn(
                        "group relative aspect-square overflow-hidden rounded-md border-2",
                        isThumbnail ? "border-primary" : "border-border",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={`รูปที่ ${idx + 1}`} className="h-full w-full object-cover" />

                      {img.uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                        </div>
                      )}

                      {isThumbnail && !img.uploading && (
                        <Badge className="absolute left-1 top-1 bg-orange-500/90 text-[10px] text-white">
                          <Star className="mr-0.5 h-2.5 w-2.5 fill-current" /> หลัก
                        </Badge>
                      )}

                      {!img.uploading && (
                        <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition group-hover:opacity-100">
                          {!isThumbnail && (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setAsThumbnail(idx)}
                              className="h-6 px-1.5 text-[10px]"
                            >
                              <Star className="h-2.5 w-2.5" /> ตั้งหลัก
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            onClick={() => removeImage(idx)}
                            className="ml-auto h-6 w-6"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add more button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition hover:border-primary/50 hover:bg-primary/5"
                >
                  <Upload className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 รูปแรกเป็นรูปหลัก (thumbnail) — เลื่อนเมาส์บนรูปอื่นเพื่อตั้งเป็นรูปหลัก
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ข้อมูลพื้นฐาน</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">ชื่อดีไซน์ *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น เสื้อบอลทีม True A สีน้ำเงิน"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sport">ประเภทกีฬา</Label>
            <Select value={sportType} onValueChange={setSportType}>
              <SelectTrigger id="sport">
                <SelectValue placeholder="-- เลือกประเภทกีฬา --" />
              </SelectTrigger>
              <SelectContent>
                {SPORT_TYPES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">คำอธิบาย</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="เช่น คอกลม พิมพ์ซับลิเมชั่น เนื้อผ้า Polyester 100%"
            />
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">สี ({colors.length} สีที่เลือก)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DESIGN_COLOR_OPTIONS.map((c) => {
              const active = colors.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggleColor(c.value)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-xs transition",
                    active
                      ? "border-primary bg-primary/15 font-semibold text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  <span
                    className="inline-block h-3 w-3 rounded-full border border-border"
                    style={{ backgroundColor: c.hex }}
                  />
                  {c.label}
                </button>
              );
            })}
          </div>
          {colors.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">สีที่เลือก:</span>
              {colors.map((c) => (
                <Badge key={c} variant="outline" className="gap-1.5 text-xs">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: DESIGN_COLOR_HEX[c] }}
                  />
                  {DESIGN_COLOR_LABEL[c] ?? c}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">แท็ก (สำหรับค้นหา)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="เช่น คอกลม, ซับลิเมชั่น, แขนยาว..."
            />
            <Button type="button" variant="outline" onClick={addTag}>เพิ่ม</Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1 text-xs">
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ราคาแนะนำ (ไม่บังคับ)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="price">ราคาขาย (฿/ตัว)</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={suggestedPrice}
              onChange={(e) => setSuggestedPrice(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cost">ต้นทุน (฿/ตัว)</Label>
            <Input
              id="cost"
              type="number"
              min="0"
              step="0.01"
              value={suggestedCost}
              onChange={(e) => setSuggestedCost(e.target.value)}
              placeholder="0"
            />
          </div>
          {suggestedPrice && suggestedCost && (
            <div className="col-span-2 text-xs text-emerald-400">
              💰 กำไรต่อตัว: ฿{(Number(suggestedPrice) - Number(suggestedCost)).toLocaleString()}
              {Number(suggestedPrice) > 0 && (
                <> ({(((Number(suggestedPrice) - Number(suggestedCost)) / Number(suggestedPrice)) * 100).toFixed(0)}%)</>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Internal Note */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">โน้ตภายใน (ไม่แสดงให้ลูกค้า)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="เช่น โรงงาน A ทำราคาดีสุด, ลูกค้าทีม True ชอบแบบนี้"
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="sticky bottom-0 z-10 -mx-3 flex items-center justify-end gap-2 border-t border-border bg-background/95 p-3 backdrop-blur sm:mx-0 sm:rounded-md sm:border sm:p-4">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          ยกเลิก
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isPending ? "กำลังบันทึก..." : existing ? "บันทึกการแก้ไข" : "เพิ่มดีไซน์"}
        </Button>
      </div>
    </form>
  );
}
