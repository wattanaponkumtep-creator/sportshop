"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, ExternalLink, Image as ImageIcon, FileType, ClipboardList } from "lucide-react";
import { formatDateTH } from "@/lib/utils";
import type { FileKind } from "@/lib/types/database";

export type SignedFile = {
  id: string;
  kind: FileKind;
  storage_path: string;
  filename: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
  url: string;
};

const KIND_META: Record<string, { label: string; emoji: string }> = {
  artwork: { label: "ไฟล์ดีไซน์/อาร์ตเวิร์ค", emoji: "🎨" },
  reference: { label: "ใบงาน/อ้างอิง", emoji: "📋" },
  mockup: { label: "Mockup", emoji: "🖼️" },
  other: { label: "อื่นๆ", emoji: "📎" },
};

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isImage(file: SignedFile): boolean {
  return Boolean(file.mime_type?.startsWith("image/"));
}

function isPDF(file: SignedFile): boolean {
  return file.mime_type === "application/pdf" || Boolean(file.filename?.toLowerCase().endsWith(".pdf"));
}

export function FactoryPortalFiles({ files }: { files: SignedFile[] }) {
  if (files.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="inline-flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-purple-400" /> ใบงาน / ไฟล์ประกอบ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            ยังไม่มีไฟล์ — รอร้านอัพโหลดใบงาน/ดีไซน์
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="inline-flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-purple-400" /> ใบงาน / ไฟล์ประกอบ
          <Badge variant="outline" className="ml-1 text-xs">{files.length} ไฟล์</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {files.map((f) => (
          <FileCard key={f.id} file={f} />
        ))}
        <p className="text-center text-[11px] text-muted-foreground">
          💡 คลิก <strong>เปิดดู</strong> เพื่อดูบนเบราว์เซอร์ หรือ <strong>ดาวน์โหลด</strong> เพื่อบันทึก
        </p>
      </CardContent>
    </Card>
  );
}

function FileCard({ file }: { file: SignedFile }) {
  const meta = KIND_META[file.kind] ?? { label: "ไฟล์", emoji: "📄" };
  const imageFile = isImage(file);
  const pdfFile = isPDF(file);
  const Icon = imageFile ? ImageIcon : pdfFile ? FileType : FileText;
  const downloadName = file.filename ?? `${file.kind}-${file.id.slice(0, 6)}`;

  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <div className="flex items-start gap-3">
        {/* Preview thumbnail for images */}
        {imageFile ? (
          // eslint-disable-next-line @next/next/no-img-element
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted"
          >
            <img src={file.url} alt={downloadName} className="h-full w-full object-cover" loading="lazy" />
          </a>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
            <Icon className={`h-7 w-7 ${pdfFile ? "text-rose-400" : "text-muted-foreground"}`} />
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              {meta.emoji} {meta.label}
            </Badge>
            {pdfFile && <Badge className="bg-rose-500/20 text-[10px] text-rose-300">PDF</Badge>}
          </div>
          <div className="truncate text-sm font-medium">{downloadName}</div>
          <div className="text-[11px] text-muted-foreground">
            {formatSize(file.size_bytes)}
            {file.size_bytes ? " • " : ""}
            อัพโหลด {formatDateTH(file.created_at, "d MMM yy")}
          </div>
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        <Button asChild size="sm" variant="outline" className="flex-1">
          <a href={file.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" /> เปิดดู
          </a>
        </Button>
        <Button asChild size="sm" className="flex-1">
          <a href={file.url} download={downloadName}>
            <Download className="h-3.5 w-3.5" /> ดาวน์โหลด
          </a>
        </Button>
      </div>
    </div>
  );
}
