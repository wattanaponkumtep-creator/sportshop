import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, Star, Sparkles, Briefcase, Palette, Tag } from "lucide-react";
import { formatDateTH } from "@/lib/utils";
import {
  SPORT_LABEL,
  DESIGN_COLOR_HEX,
  DESIGN_COLOR_LABEL,
  JOB_STATUS_LABEL,
  JOB_STATUS_COLOR,
} from "@/lib/constants";
import { DesignGallery } from "@/components/designs/design-gallery";
import { DeleteDesignButton } from "@/components/designs/delete-design-button";
import { orderedDesignImages } from "@/lib/designs";
import type { Customer, Design, Job } from "@/lib/types/database";

type JobWithCustomer = Pick<Job, "id" | "job_code" | "job_label" | "status" | "created_at"> & {
  customers: Pick<Customer, "name"> | null;
};

export const dynamic = "force-dynamic";

export default async function DesignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: design } = await supabase
    .from("designs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!design) notFound();
  const d = design as Design;

  // Fetch jobs using this design
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, job_code, job_label, status, created_at, customers(name)")
    .eq("design_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  const allImages = orderedDesignImages(d);
  const jobsTyped = (jobs ?? []) as JobWithCustomer[];

  return (
    <div className="container space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-8">
      <Link href="/designs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> คลังดีไซน์
      </Link>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr] lg:gap-6">
        {/* LEFT: Gallery */}
        <div>
          <DesignGallery paths={allImages} />
        </div>

        {/* RIGHT: Info */}
        <div className="space-y-4">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono">{d.code}</Badge>
              {d.is_favorite && (
                <Badge className="border-amber-500/40 bg-amber-500/20 text-amber-300">
                  <Star className="mr-1 h-3 w-3 fill-current" /> ที่ชอบ
                </Badge>
              )}
              {d.use_count > 0 && (
                <Badge className="border-cyan-500/40 bg-cyan-500/20 text-cyan-300">
                  <Sparkles className="mr-1 h-3 w-3" /> ใช้แล้ว {d.use_count} งาน
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{d.name}</h1>
            {d.description && (
              <p className="text-sm text-muted-foreground">{d.description}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/jobs/new?design_id=${d.id}`}>
                <Briefcase className="h-4 w-4" /> สร้าง JOB จากดีไซน์นี้
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/designs/${d.id}/edit`}>
                <Edit className="h-4 w-4" /> แก้ไข
              </Link>
            </Button>
            <DeleteDesignButton id={d.id} code={d.code} name={d.name} />
          </div>

          {/* Meta info grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Card>
              <CardContent className="p-3">
                <div className="text-[10px] uppercase text-muted-foreground">ประเภทกีฬา</div>
                <div className="mt-1 text-sm font-semibold">
                  {d.sport_type ? SPORT_LABEL[d.sport_type] ?? d.sport_type : "—"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-[10px] uppercase text-muted-foreground">ราคาแนะนำ</div>
                <div className="mt-1 font-mono text-sm font-semibold text-orange-400">
                  {d.suggested_price ? `฿${Number(d.suggested_price).toLocaleString()}` : "—"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-[10px] uppercase text-muted-foreground">กำไร/ตัว</div>
                <div className="mt-1 font-mono text-sm font-semibold text-emerald-400">
                  {d.suggested_price && d.suggested_cost
                    ? `฿${(Number(d.suggested_price) - Number(d.suggested_cost)).toLocaleString()}`
                    : "—"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colors */}
          {d.colors.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="inline-flex items-center gap-2 text-sm">
                  <Palette className="h-4 w-4 text-orange-400" /> สี ({d.colors.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {d.colors.map((c) => (
                    <Badge key={c} variant="outline" className="gap-1.5">
                      <span
                        className="inline-block h-3 w-3 rounded-full border border-border"
                        style={{ backgroundColor: DESIGN_COLOR_HEX[c] ?? c }}
                      />
                      {DESIGN_COLOR_LABEL[c] ?? c}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {d.tags.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="inline-flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-cyan-400" /> แท็ก
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1.5">
                  {d.tags.map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Note */}
          {d.note && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">📝 โน้ตภายใน</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{d.note}</p>
              </CardContent>
            </Card>
          )}

          <div className="text-xs text-muted-foreground">
            สร้างเมื่อ {formatDateTH(d.created_at, "d MMM yy HH:mm")}
            {d.updated_at !== d.created_at && (
              <> • แก้ไขล่าสุด {formatDateTH(d.updated_at, "d MMM yy HH:mm")}</>
            )}
          </div>
        </div>
      </div>

      {/* JOBs using this design */}
      {jobsTyped.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4 text-cyan-400" /> JOBs ที่ใช้ดีไซน์นี้ ({jobsTyped.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {jobsTyped.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 transition hover:bg-accent/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{job.job_code}</span>
                      {job.job_label && (
                        <span className="truncate text-sm text-muted-foreground">{job.job_label}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {job.customers?.name ?? "—"} • {formatDateTH(job.created_at, "d MMM yy")}
                    </div>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-xs ${JOB_STATUS_COLOR[job.status]}`}>
                    {JOB_STATUS_LABEL[job.status]}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
