"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { submitOrderConfirmation } from "@/app/confirm/actions";

export function ConfirmForm({ token }: { token: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setErr(null);
    if (!name.trim()) return setErr("กรุณาใส่ชื่อผู้ยืนยัน");
    if (!agreed) return setErr("กรุณาติ๊กยอมรับเงื่อนไขก่อนยืนยัน");
    startTransition(async () => {
      const res = await submitOrderConfirmation({ token, name, agreed });
      if (res.ok) router.refresh();
      else setErr(res.error);
    });
  }

  return (
    <div className="space-y-4">
      {/* ข้อตกลงความรับผิดชอบ */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-relaxed text-amber-100">
        <div className="mb-2 font-semibold text-amber-200">📜 ข้อตกลงก่อนยืนยัน</div>
        <p>
          เมื่อกดยืนยัน ถือว่าท่านได้ตรวจสอบ <b>ชื่อ–เบอร์–ไซซ์–จำนวน–สเปค</b> ถูกต้องครบถ้วนแล้ว
          หากเกิดความผิดพลาดจากข้อมูลที่ท่านให้ หรือเปลี่ยนใจภายหลัง ทางร้านขอสงวนสิทธิ์ไม่รับผิดชอบ
          — แต่หากผลิต<b>ไม่ตรง</b>ตามที่ยืนยัน ทางร้านรับผิดชอบเต็มที่
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">ชื่อผู้ยืนยัน</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ชื่อของท่าน / ชื่อทีม"
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span>ข้าพเจ้าตรวจสอบรายละเอียดทั้งหมดถูกต้องแล้ว และยอมรับข้อตกลงข้างต้น</span>
      </label>

      {err && <p className="text-sm text-rose-400">{err}</p>}

      <button
        onClick={submit}
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        ยืนยันออเดอร์
      </button>
    </div>
  );
}
