"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X, Clock, Star, TrendingUp } from "lucide-react";
import { SPORT_TYPES, DESIGN_COLOR_OPTIONS } from "@/lib/constants";
import { hasActiveDesignFilters } from "@/lib/designs";

type Props = {
  defaultQ: string;
  defaultSport: string;
  defaultColor: string;
  defaultSort: string;
};

export function DesignFilters({ defaultQ, defaultSport, defaultColor, defaultSort }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(defaultQ);
  const [isPending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    startTransition(() => {
      router.push(`/designs?${next.toString()}`);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    update("q", q);
  }

  function reset() {
    setQ("");
    startTransition(() => router.push("/designs"));
  }

  const hasFilter = hasActiveDesignFilters({
    q: defaultQ,
    sport: defaultSport,
    color: defaultColor,
    sort: defaultSort,
  });

  return (
    <Card>
      <CardContent className="space-y-3 p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          {/* Search */}
          <form onSubmit={handleSubmit} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาชื่อ / รหัส (เช่น DES-25-001)..."
              className="pl-9"
            />
          </form>

          {/* Sort */}
          <Select value={defaultSort} onValueChange={(v) => update("sort", v)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="เรียงตาม" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">
                <span className="inline-flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> ล่าสุด</span>
              </SelectItem>
              <SelectItem value="popular">
                <span className="inline-flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5" /> ใช้บ่อย</span>
              </SelectItem>
              <SelectItem value="favorite">
                <span className="inline-flex items-center gap-2"><Star className="h-3.5 w-3.5" /> ที่ชอบ</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">กรอง:</span>

          {/* Sport */}
          <Select value={defaultSport} onValueChange={(v) => update("sport", v)}>
            <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs">
              <SelectValue placeholder="กีฬา" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกประเภท</SelectItem>
              {SPORT_TYPES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Color */}
          <Select value={defaultColor} onValueChange={(v) => update("color", v)}>
            <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs">
              <SelectValue placeholder="สี" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสี</SelectItem>
              {DESIGN_COLOR_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full border border-border" style={{ backgroundColor: c.hex }} />
                    {c.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={reset} disabled={isPending} className="h-7 text-xs">
              <X className="h-3 w-3" /> ล้างตัวกรอง
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
