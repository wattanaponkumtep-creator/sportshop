// ตารางไซซ์ (ตัวเลขตั้งต้น — ร้านปรับตามเสื้อจริงได้ภายหลัง)
const CHART: { size: string; chest: number; length: number }[] = [
  { size: "SS", chest: 34, length: 25 },
  { size: "S", chest: 36, length: 26 },
  { size: "M", chest: 38, length: 27 },
  { size: "L", chest: 40, length: 28 },
  { size: "XL", chest: 42, length: 29 },
  { size: "2XL", chest: 44, length: 30 },
  { size: "3XL", chest: 46, length: 31 },
  { size: "4XL", chest: 48, length: 32 },
  { size: "5XL", chest: 50, length: 33 },
];

export function SizeChart() {
  return (
    <details className="rounded-lg border border-border bg-card p-3 text-sm">
      <summary className="cursor-pointer select-none font-medium">📏 ตารางไซซ์ (กดเพื่อดูก่อนเลือก)</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-center text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border">
              <th className="p-1.5">ไซซ์</th>
              <th className="p-1.5">รอบอก (นิ้ว)</th>
              <th className="p-1.5">ความยาว (นิ้ว)</th>
            </tr>
          </thead>
          <tbody>
            {CHART.map((r) => (
              <tr key={r.size} className="border-b border-border/40">
                <td className="p-1.5 font-semibold">{r.size}</td>
                <td className="p-1.5">{r.chest}</td>
                <td className="p-1.5">{r.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        * เป็นค่าโดยประมาณ (วัดจากเสื้อแบนราบ) อาจคลาดเคลื่อน ±1 นิ้ว — ไม่แน่ใจสอบถามทางร้านได้
      </p>
    </details>
  );
}
