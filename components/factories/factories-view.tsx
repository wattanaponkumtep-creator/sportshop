"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Star } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { createFactory, updateFactory, toggleFactoryActive, type FactoryInput } from "@/app/(admin)/factories/actions";
import type { Factory } from "@/lib/types/database";
import { formatBaht } from "@/lib/utils";

export function FactoriesView({ initialFactories }: { initialFactories: Factory[] }) {
  const [editing, setEditing] = useState<Factory | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="flex justify-end p-4">
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> เพิ่มโรงงาน</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>เพิ่มโรงงานใหม่</DialogTitle></DialogHeader>
            <FactoryFormBody onDone={() => setCreating(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {initialFactories.length === 0 ? (
        <p className="p-8 text-center text-muted-foreground">ยังไม่มีโรงงาน</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อ</TableHead>
              <TableHead>จุดเด่น</TableHead>
              <TableHead className="text-center">ใช้เวลา</TableHead>
              <TableHead className="text-center">คุณภาพ</TableHead>
              <TableHead className="text-right">ราคาฐาน</TableHead>
              <TableHead className="text-center">สถานะ</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialFactories.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.name}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{f.strengths ?? "-"}</TableCell>
                <TableCell className="text-center">{f.lead_time_days ? `${f.lead_time_days} วัน` : "-"}</TableCell>
                <TableCell className="text-center">
                  {f.quality_score != null ? (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {Number(f.quality_score).toFixed(1)}
                    </span>
                  ) : "-"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{f.base_price ? formatBaht(Number(f.base_price)) : "-"}</TableCell>
                <TableCell className="text-center">
                  {f.is_active ? <Badge variant="success">ใช้งาน</Badge> : <Badge variant="secondary">ปิด</Badge>}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => setEditing(f)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>แก้ไขโรงงาน</DialogTitle></DialogHeader>
          {editing && <FactoryFormBody factory={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function FactoryFormBody({ factory, onDone }: { factory?: Factory; onDone: () => void }) {
  const [name, setName] = useState(factory?.name ?? "");
  const [strengths, setStrengths] = useState(factory?.strengths ?? "");
  const [leadTime, setLeadTime] = useState(factory?.lead_time_days?.toString() ?? "");
  const [score, setScore] = useState(factory?.quality_score?.toString() ?? "");
  const [basePrice, setBasePrice] = useState(factory?.base_price?.toString() ?? "");
  const [notes, setNotes] = useState(factory?.notes ?? "");
  const [active, setActive] = useState(factory?.is_active ?? true);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    const input: FactoryInput = {
      name,
      strengths: strengths || null,
      lead_time_days: leadTime ? Number(leadTime) : null,
      quality_score: score ? Number(score) : null,
      base_price: basePrice ? Number(basePrice) : null,
      notes: notes || null,
      is_active: active,
    };
    startTransition(async () => {
      const result = factory ? await updateFactory(factory.id, input) : await createFactory(input);
      if (result.ok) { toast({ title: "บันทึกแล้ว" }); onDone(); }
      else toast({ title: "บันทึกไม่สำเร็จ", description: result.error, variant: "destructive" });
    });
  }

  async function handleToggle() {
    if (!factory) return;
    const next = !active;
    setActive(next);
    const result = await toggleFactoryActive(factory.id, next);
    if (!result.ok) {
      setActive(!next);
      toast({ title: "เปลี่ยนสถานะไม่สำเร็จ", description: result.error, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>ชื่อโรงงาน *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>จุดเด่น</Label>
        <Input value={strengths} onChange={(e) => setStrengths(e.target.value)} placeholder="เช่น พิมพ์สีสด งานเย็บประณีต" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>ระยะเวลาผลิต (วัน)</Label>
          <Input type="number" min="0" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>คุณภาพ (0-10)</Label>
          <Input type="number" min="0" max="10" step="0.1" value={score} onChange={(e) => setScore(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>ราคาฐาน</Label>
          <Input type="number" min="0" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>หมายเหตุ</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>
      {factory && (
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <span className="text-sm">เปิดใช้งานโรงงานนี้</span>
          <Button variant={active ? "default" : "outline"} size="sm" onClick={handleToggle}>
            {active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
          </Button>
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>ยกเลิก</Button>
        <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>{isPending ? "บันทึก..." : "บันทึก"}</Button>
      </DialogFooter>
    </div>
  );
}
