"use client";
import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Palette, Printer, Scissors, Truck, Factory } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { updateProductionStages } from "@/app/(admin)/jobs/production-actions";

type Stage = {
  key: "layout_progress" | "print_progress" | "sew_progress" | "ship_progress";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
};

const STAGES: Stage[] = [
  { key: "layout_progress", label: "เลย์เอ้าท์/ดีไซน์", icon: Palette, color: "text-purple-400" },
  { key: "print_progress", label: "พิมพ์ลาย", icon: Printer, color: "text-orange-400" },
  { key: "sew_progress", label: "ตัดเย็บ", icon: Scissors, color: "text-blue-400" },
  { key: "ship_progress", label: "เตรียมส่ง", icon: Truck, color: "text-emerald-400" },
];

const QUICK_VALUES = [0, 25, 50, 75, 100];

export function ProductionStages({
  jobId,
  layoutProgress,
  printProgress,
  sewProgress,
  shipProgress,
}: {
  jobId: string;
  layoutProgress: number;
  printProgress: number;
  sewProgress: number;
  shipProgress: number;
}) {
  const initial = {
    layout_progress: layoutProgress,
    print_progress: printProgress,
    sew_progress: sewProgress,
    ship_progress: shipProgress,
  };

  const [values, setValues] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function setStageValue(key: Stage["key"], value: number) {
    setValues((cur) => ({ ...cur, [key]: value }));
    startTransition(async () => {
      const result = await updateProductionStages(jobId, { [key]: value });
      if (!result.ok) {
        toast({ title: "บันทึกไม่สำเร็จ", description: result.error, variant: "destructive" });
        setValues((cur) => ({ ...cur, [key]: initial[key] }));
      }
    });
  }

  const overall = Math.round((values.layout_progress + values.print_progress + values.sew_progress + values.ship_progress) / 4);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Factory className="h-4 w-4 text-orange-400" />
            <h3 className="text-sm font-semibold">ความคืบหน้าการผลิต</h3>
          </div>
          <Badge variant={overall === 100 ? "success" : "outline"} className="text-xs">
            รวม {overall}%
          </Badge>
        </div>

        {/* Overall progress bar */}
        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${overall}%` }}
          />
        </div>

        <div className="space-y-3">
          {STAGES.map((stage) => {
            const Icon = stage.icon;
            const value = values[stage.key];
            const isDone = value === 100;

            return (
              <div key={stage.key} className="rounded-md border border-border bg-card/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", stage.color)} />
                    <span className="text-sm font-medium">{stage.label}</span>
                    {isDone && (
                      <Badge variant="success" className="text-[10px]">เสร็จ</Badge>
                    )}
                  </div>
                  <span className={cn("font-mono text-sm font-bold tabular-nums", isDone ? "text-emerald-400" : "text-foreground")}>
                    {value}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      isDone ? "bg-emerald-500" : "bg-gradient-to-r from-orange-500 to-red-500"
                    )}
                    style={{ width: `${value}%` }}
                  />
                </div>

                {/* Quick buttons */}
                <div className="flex gap-1">
                  {QUICK_VALUES.map((qv) => (
                    <Button
                      key={qv}
                      variant={value === qv ? "default" : "outline"}
                      size="sm"
                      className="h-7 flex-1 text-[11px]"
                      onClick={() => setStageValue(stage.key, qv)}
                      disabled={isPending}
                    >
                      {qv}%
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
