import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Edit } from "lucide-react";
import { DesignForm } from "@/components/designs/design-form";
import { createDesignFileUrls } from "@/app/(admin)/designs/actions";
import { orderedDesignImages } from "@/lib/designs";
import type { Design } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function EditDesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: design } = await supabase
    .from("designs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!design) notFound();
  const d = design as Design;

  // Pre-sign all image URLs server-side so the client form has them on first paint
  const orderedPaths = orderedDesignImages(d);
  const signed = await createDesignFileUrls(orderedPaths);
  const initialImages = signed
    .filter((s): s is { path: string; url: string } => !!s.url)
    .map((s) => ({ path: s.path, url: s.url }));

  return (
    <div className="container space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-8">
      <Link href={`/designs/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> กลับไปดูดีไซน์
      </Link>

      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
          <Edit className="h-7 w-7 text-orange-400" /> แก้ไขดีไซน์
        </h1>
        <p className="font-mono text-sm text-muted-foreground">{d.code} • {d.name}</p>
      </header>

      <DesignForm existing={d} initialImages={initialImages} />
    </div>
  );
}
