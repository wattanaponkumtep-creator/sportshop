"use client";
import { useState, useRef, useTransition, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Palette, Plus, Trash2, Send, Copy, Check, Upload, X, ImageIcon } from "lucide-react";
import { MOCKUP_STATUS_COLOR, MOCKUP_STATUS_LABEL } from "@/lib/constants";
import { formatDateTH, cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { createMockup, sendMockupForApproval, deleteMockup, createMockupFileUrls } from "@/app/(admin)/jobs/mockup-actions";
import type { Mockup } from "@/lib/types/database";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export function JobMockups({ jobId, mockups }: { jobId: string; mockups: Mockup[] }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="inline-flex items-center gap-2">
            <Palette className="h-5 w-5 text-purple-400" /> Mockup ทั้งหมด
          </CardTitle>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> สร้าง Mockup ใหม่
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockups.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              ยังไม่มี Mockup — สร้างใหม่เพื่อส่งให้ลูกค้าอนุมัติ
            </p>
          ) : (
            mockups
              .slice()
              .sort((a, b) => b.version - a.version)
              .map((m) => <MockupCard key={m.id} mockup={m} jobId={jobId} />)
          )}
        </CardContent>
      </Card>

      <CreateMockupDialog jobId={jobId} open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function MockupCard({ mockup, jobId }: { mockup: Mockup; jobId: string }) {
  const [, startTransition] = useTransition();
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    if (mockup.storage_paths.length > 0) {
      createMockupFileUrls(mockup.storage_paths).then((results) => {
        if (active) setPreviewUrls(results.map((r) => r.url ?? ""));
      });
    }
    return () => { active = false; };
  }, [mockup.storage_paths]);

  function handleSend() {
    if (!confirm("ส่ง Mockup นี้ให้ลูกค้าอนุมัติ?")) return;
    startTransition(async () => {
      const result = await sendMockupForApproval(mockup.id, jobId);
      if (result.ok) toast({ title: "ส่งอนุมัติแล้ว — copy ลิงก์แล้วส่งให้ลูกค้า" });
      else toast({ title: "ส่งไม่สำเร็จ", description: result.error, variant: "destructive" });
    });
  }

  function handleDelete() {
    if (!confirm(`ลบ Mockup v${mockup.version}? ไฟล์จะถูกลบด้วย`)) return;
    startTransition(async () => {
      const result = await deleteMockup(mockup.id, jobId);
      if (!result.ok) toast({ title: "ลบไม่สำเร็จ", description: result.error, variant: "destructive" });
      else toast({ title: "ลบแล้ว" });
    });
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/approve/${mockup.approval_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "คัดลอกลิงก์อนุมัติแล้ว", description: url });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-md border border-border bg-card/40 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold">v{mockup.version}</span>
            <Badge variant="outline" className={MOCKUP_STATUS_COLOR[mockup.status]}>
              {MOCKUP_STATUS_LABEL[mockup.status]}
            </Badge>
            {mockup.title && <span className="font-medium">{mockup.title}</span>}
          </div>
          {mockup.description && (
            <p className="text-sm text-muted-foreground">{mockup.description}</p>
          )}
          <div className="text-xs text-muted-foreground">
            สร้างเมื่อ {formatDateTH(mockup.created_at, "d MMM yy HH:mm")}
            {mockup.decided_at && (
              <>
                {" · "}
                ตัดสินใจเมื่อ {formatDateTH(mockup.decided_at, "d MMM yy HH:mm")}
                {mockup.decided_by_name && ` โดย ${mockup.decided_by_name}`}
              </>
            )}
          </div>
          {mockup.decision_note && (
            <div className="mt-2 rounded-md border border-border bg-background/50 p-2 text-sm">
              <span className="text-xs text-muted-foreground">หมายเหตุจากลูกค้า:</span>
              <div className="mt-1 whitespace-pre-wrap">{mockup.decision_note}</div>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {(mockup.status === "draft" || mockup.status === "rejected") && (
            <Button size="sm" onClick={handleSend}>
              <Send className="h-4 w-4" /> ส่งอนุมัติ
            </Button>
          )}
          {mockup.status !== "draft" && (
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              ลิงก์
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleDelete} title="ลบ">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {previewUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {previewUrls.map((url, i) =>
            url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border border-border bg-background">
                <img src={url} alt={`v${mockup.version} - ${i + 1}`} className="h-32 w-full object-cover transition hover:scale-105" />
              </a>
            ) : (
              <div key={i} className="flex h-32 items-center justify-center rounded-md border border-border bg-background">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function CreateMockupDialog({ jobId, open, onClose }: { jobId: string; open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTitle("");
    setDescription("");
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    const valid: File[] = [];
    for (const f of Array.from(newFiles)) {
      if (f.size > MAX_FILE_SIZE) {
        toast({ title: `${f.name} ใหญ่เกิน 20MB`, variant: "destructive" });
        continue;
      }
      valid.push(f);
    }
    setFiles((cur) => [...cur, ...valid]);
  }

  function removeFile(idx: number) {
    setFiles((cur) => cur.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (files.length === 0) {
      toast({ title: "กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์", variant: "destructive" });
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const paths: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = f.name.split(".").pop() ?? "png";
      const path = `${jobId}/mockups/${Date.now()}_${i}.${ext}`;
      const { error } = await supabase.storage
        .from("job-files")
        .upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type });
      if (error) {
        toast({ title: `อัปโหลด ${f.name} ไม่สำเร็จ`, description: error.message, variant: "destructive" });
        setUploading(false);
        return;
      }
      paths.push(path);
    }
    setUploading(false);

    startTransition(async () => {
      const result = await createMockup(jobId, { title, description, storage_paths: paths });
      if (result.ok) {
        toast({ title: `สร้าง Mockup v${result.version} แล้ว`, description: "กดส่งอนุมัติเมื่อพร้อม" });
        reset();
        onClose();
      } else {
        toast({ title: "บันทึกไม่สำเร็จ", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>สร้าง Mockup ใหม่</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>หัวข้อ (เช่น &quot;แบบเสื้อหลัก V1&quot;)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ไม่บังคับ" />
          </div>

          <div className="space-y-2">
            <Label>รายละเอียดสำหรับลูกค้า</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="เช่น สีหลักน้ำเงิน-ขาว เบอร์ทอง สปอนเซอร์ตัวเล็ก"
            />
          </div>

          <div className="space-y-2">
            <Label>ไฟล์ภาพ Mockup (PNG/JPG — สูงสุด 20MB/ไฟล์) *</Label>
            <div
              className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground hover:border-primary/50"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary"); }}
              onDragLeave={(e) => e.currentTarget.classList.remove("border-primary")}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("border-primary");
                addFiles(e.dataTransfer.files);
              }}
            >
              <Upload className="h-5 w-5" />
              ลากไฟล์มาวาง หรือคลิกเพื่อเลือก
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />

            {files.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {files.map((f, i) => (
                  <div key={i} className="relative overflow-hidden rounded-md border border-border bg-background">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(f)} alt={f.name} className="h-24 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="truncate p-1 text-[10px] text-muted-foreground">{f.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>ยกเลิก</Button>
          <Button onClick={handleSubmit} disabled={uploading || isPending || files.length === 0}>
            {uploading ? "อัปโหลด..." : isPending ? "บันทึก..." : `สร้าง Mockup (${files.length} ไฟล์)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { cn };
