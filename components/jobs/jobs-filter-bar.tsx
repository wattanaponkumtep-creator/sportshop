"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter, AlertTriangle } from "lucide-react";
import { JOB_STATUS_LABEL, JOB_STATUS_ORDER, PRIORITY_LABEL } from "@/lib/constants";
import type { JobStatus, PriorityLevel } from "@/lib/types/database";

const STATUS_OPTIONS = ["all", ...JOB_STATUS_ORDER, "cancelled"] as const;
const PRIORITY_OPTIONS = ["all", "normal", "urgent", "rush"] as const;

type Props = {
  defaultQ: string;
  defaultStatus: string;
  defaultPriority: string;
  defaultOverdue: boolean;
  factories: { id: string; name: string }[];
  defaultFactory: string;
};

export function JobsFilterBar({ defaultQ, defaultStatus, defaultPriority, defaultOverdue, defaultFactory, factories }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(defaultQ);
  const [isPending, startTransition] = useTransition();

  // Debounce search
  useEffect(() => {
    if (q === defaultQ) return;
    const timer = setTimeout(() => {
      updateParam("q", q);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "all" && value !== "" && value !== "false") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  function clearAll() {
    setQ("");
    startTransition(() => router.replace(pathname));
  }

  const hasActiveFilter = defaultQ || defaultStatus !== "all" || defaultPriority !== "all" || defaultOverdue || defaultFactory !== "all";

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหา JOB code / ชื่อลูกค้า / ประเภทเสื้อ..."
            className="pl-9 pr-9"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="ล้างคำค้น"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Button
          variant={defaultOverdue ? "default" : "outline"}
          onClick={() => updateParam("overdue", defaultOverdue ? null : "true")}
          className="whitespace-nowrap"
        >
          <AlertTriangle className="h-4 w-4" /> เลยกำหนด
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> กรอง:
        </div>

        <Select value={defaultStatus} onValueChange={(v) => updateParam("status", v)}>
          <SelectTrigger className="h-9 w-full sm:w-[180px]"><SelectValue placeholder="สถานะ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            {JOB_STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>{JOB_STATUS_LABEL[s as JobStatus]}</SelectItem>
            ))}
            <SelectItem value="cancelled">{JOB_STATUS_LABEL.cancelled}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={defaultPriority} onValueChange={(v) => updateParam("priority", v)}>
          <SelectTrigger className="h-9 w-full sm:w-[160px]"><SelectValue placeholder="ความสำคัญ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกความสำคัญ</SelectItem>
            {(["normal", "urgent", "rush"] as PriorityLevel[]).map((p) => (
              <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={defaultFactory} onValueChange={(v) => updateParam("factory", v)}>
          <SelectTrigger className="h-9 w-full sm:w-[200px]"><SelectValue placeholder="โรงงาน" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกโรงงาน</SelectItem>
            <SelectItem value="none">— ยังไม่มอบโรงงาน —</SelectItem>
            {factories.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilter && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs" disabled={isPending}>
            <X className="h-3 w-3" /> ล้าง
          </Button>
        )}
      </div>

      {hasActiveFilter && (
        <div className="flex flex-wrap gap-2 text-xs">
          {defaultQ && (
            <Badge variant="secondary" className="gap-1">
              ค้นหา: &quot;{defaultQ}&quot;
              <button onClick={() => { setQ(""); updateParam("q", null); }} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {defaultStatus !== "all" && (
            <Badge variant="secondary" className="gap-1">
              สถานะ: {JOB_STATUS_LABEL[defaultStatus as JobStatus]}
              <button onClick={() => updateParam("status", null)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {defaultPriority !== "all" && (
            <Badge variant="secondary" className="gap-1">
              ความสำคัญ: {PRIORITY_LABEL[defaultPriority as PriorityLevel]}
              <button onClick={() => updateParam("priority", null)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {defaultFactory !== "all" && (
            <Badge variant="secondary" className="gap-1">
              โรงงาน: {defaultFactory === "none" ? "ยังไม่มอบ" : (factories.find((f) => f.id === defaultFactory)?.name ?? defaultFactory)}
              <button onClick={() => updateParam("factory", null)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {defaultOverdue && (
            <Badge variant="destructive" className="gap-1">
              เลยกำหนด
              <button onClick={() => updateParam("overdue", null)} className="ml-1 hover:opacity-80">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
