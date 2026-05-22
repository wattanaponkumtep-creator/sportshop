import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Info, ArrowRight } from "lucide-react";
import { getFollowupSuggestions } from "@/lib/suggestions/followup";

export async function FollowupSuggestions() {
  const suggestions = await getFollowupSuggestions();

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <h3 className="text-sm font-semibold">งานที่ควรติดตาม</h3>
          </div>
          <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-center text-sm text-emerald-300">
            🎉 ไม่มีงานต้องติดตาม — ทุกอย่างเดินดี!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <h3 className="text-sm font-semibold">งานที่ควรติดตาม</h3>
          </div>
          <Badge variant="outline" className="text-xs">{suggestions.length}</Badge>
        </div>

        <div className="space-y-2">
          {suggestions.map((s) => {
            const Icon = s.level === "urgent" ? AlertTriangle : s.level === "warning" ? Clock : Info;
            const colorClass =
              s.level === "urgent"
                ? "border-destructive/40 bg-destructive/5"
                : s.level === "warning"
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-border bg-card/40";
            const iconColor =
              s.level === "urgent" ? "text-destructive" : s.level === "warning" ? "text-amber-400" : "text-muted-foreground";

            return (
              <Link key={s.job_id} href={`/jobs/${s.job_id}`}>
                <div
                  className={`flex items-center gap-3 rounded-md border p-3 transition hover:border-primary/40 ${colorClass}`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold">{s.job_code}</span>
                      <span className="text-sm font-medium">{s.customer_name}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                      <Badge
                        variant={s.level === "urgent" ? "destructive" : "outline"}
                        className="text-[10px]"
                      >
                        {s.reason}
                      </Badge>
                      <span className="truncate text-muted-foreground">{s.detail}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
