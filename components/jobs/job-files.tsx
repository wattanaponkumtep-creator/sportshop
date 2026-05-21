"use client";
import { useState, useTransition, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Download, Trash2, File as FileIcon, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FILE_KIND_LABEL } from "@/lib/constants";
import { formatDateTH } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { deleteJobFile, createSignedFileUrl } from "@/app/(admin)/jobs/actions";
import type { FileKind, JobFile } from "@/lib/types/database";

const KIND_OPTIONS: FileKind[] = ["artwork", "mockup", "slip", "reference", "other"];
const MAX_SIZE = 100 * 1024 * 1024;

export function JobFiles({ jobId, files }: { jobId: string; files: JobFile[] }) {
  const [kind, setKind] = useState<FileKind>("artwork");
  const [uploading, setUploading] = useState(false);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const existingVersions = files.filter((f) => f.kind === kind).length;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > MAX_SIZE) {
        toast({ title: `${file.name} ใหญ่เกิน 100MB`, variant: "destructive" });
        continue;
      }
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${jobId}/${kind}/${Date.now()}_${i}.${ext}`;
      const { error: upErr } = await supabase.storage.from("job-files").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type,
      });
      if (upErr) { toast({ title: `อัปโหลด ${file.name} ไม่สำเร็จ`, description: upErr.message, variant: "destructive" }); continue; }

      const { error: insErr } = await supabase.from("job_files").insert({
        job_id: jobId, kind, storage_path: path, file_name: file.name,
        file_size: file.size, mime_type: file.type, version: existingVersions + i + 1,
        uploaded_by: user?.id ?? null,
      });
      if (insErr) toast({ title: "บันทึกข้อมูลไฟล์ไม่สำเร็จ", description: insErr.message, variant: "destructive" });
    }

    toast({ title: "อัปโหลดเสร็จ" });
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    location.reload();
  }

  async function handleDownload(path: string) {
    const result = await createSignedFileUrl(path);
    if (result.ok) window.open(result.url, "_blank");
    else toast({ title: "ไม่สามารถสร้างลิงก์", description: result.error, variant: "destructive" });
  }

  function handleDelete(fileId: string) {
    if (!confirm("ลบไฟล์นี้?")) return;
    startTransition(async () => {
      const result = await deleteJobFile(fileId, jobId);
      if (!result.ok) toast({ title: "ลบไม่สำเร็จ", description: result.error, variant: "destructive" });
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>อัปโหลดไฟล์</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
            <div className="space-y-2">
              <Label>ประเภทไฟล์</Label>
              <Select value={kind} onValueChange={(v: FileKind) => setKind(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KIND_OPTIONS.map((k) => <SelectItem key={k} value={k}>{FILE_KIND_LABEL[k]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div
              className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground transition hover:border-primary/50"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary"); }}
              onDragLeave={(e) => e.currentTarget.classList.remove("border-primary")}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("border-primary");
                handleFiles(e.dataTransfer.files);
              }}
            >
              <Upload className="h-5 w-5" />
              {uploading ? "กำลังอัปโหลด..." : "ลากไฟล์มาวาง หรือคลิกเพื่อเลือก (สูงสุด 100MB)"}
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              accept="image/*,.pdf,.ai,.psd"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>ไฟล์ทั้งหมด ({files.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {files.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">ยังไม่มีไฟล์</p>
          ) : (
            files.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  {f.mime_type?.startsWith("image/") ? <ImageIcon className="h-4 w-4 text-muted-foreground" /> : <FileIcon className="h-4 w-4 text-muted-foreground" />}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{FILE_KIND_LABEL[f.kind]}</Badge>
                      <span className="truncate text-sm font-medium">{f.file_name}</span>
                      <Badge variant="secondary" className="text-[10px]">v{f.version}</Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTH(f.created_at, "d MMM HH:mm")} · {f.file_size ? `${(Number(f.file_size) / 1024 / 1024).toFixed(2)} MB` : "-"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleDownload(f.storage_path)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
