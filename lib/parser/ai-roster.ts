import "server-only";
import type { ParsedRow } from "./roster-excel";
import { normalizeSize } from "@/lib/constants";

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
};

const SYSTEM_PROMPT = `คุณเป็นผู้ช่วยอ่านใบสั่งเสื้อกีฬาภาษาไทย ดึงข้อมูลรายชื่อนักกีฬา/สมาชิก ออกมาเป็นรายการ

หลักการอ่าน:
- ใบสั่งเสื้อมักมีตารางรายชื่อ + คอลัมน์ที่ระบุว่าแต่ละคนจะรับสินค้าอะไรบ้าง
  เช่นมีช่องเครื่องหมาย ✓ หรือ ตัวเลข 1 ในคอลัมน์ "เสื้อ", "กางเกง", "ถุงเท้า" ฯลฯ
- บางใบงานจะแบ่ง section ตามประเภท เช่น header "เป็นชุด" / "เฉพาะเสื้อ" / "ถุงเท้า"
- บางใบงานจะระบุชนิดแขน: "เสื้อแขนสั้น" / "เสื้อแขนยาว" / "Short Sleeve / Long Sleeve" / "SS / LS"
- แต่ละแถวในผลลัพธ์ = นักกีฬา 1 คน 1 ประเภทสินค้า

ฟิลด์ที่ต้องดึง:
  • name: ชื่อ-นามสกุล (string, "" ถ้าไม่ระบุ)
  • number: เบอร์เสื้อ (string, "" ถ้าไม่ระบุ)
  • size: ไซส์ — UPPERCASE ใช้รูปแบบมาตรฐานนี้ ("" ถ้าไม่ระบุ):
      ไซส์เด็ก: "CS", "CM", "CL"
      ไซส์ผู้ใหญ่: "XS", "SS", "S", "M", "L", "XL"
      ไซส์ใหญ่: "2XL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"
      ** สำคัญ: แปลงรูปแบบให้เป็นมาตรฐาน เช่น
         "XXL"→"2XL", "XXXL"→"3XL", "XXXXL"→"4XL"
         "2XL", "3XL" คงไว้ตามเดิม
         ถ้าเขียน "ไซส์ S" / "size M" → ตัดคำนำหน้าออก เหลือแค่ "S" / "M" **
  • item_type: ประเภทสินค้า — ใช้ค่าใดค่าหนึ่งนี้ (เลือกที่ตรงที่สุด):
      ## ระบุชนิดแขนได้ (priority สูงสุด ถ้าใบงานบอกชัด):
      - "เสื้อแขนสั้น"           (เฉพาะเสื้อแขนสั้น)
      - "เสื้อแขนยาว"           (เฉพาะเสื้อแขนยาว)
      - "เสื้อแขนสั้น+กางเกง"     (ชุดแขนสั้น)
      - "เสื้อแขนยาว+กางเกง"     (ชุดแขนยาว)
      ## ไม่ระบุแขน (ใช้เป็น fallback):
      - "เสื้ออย่างเดียว"         (เสื้อเฉยๆ ไม่ได้บอกแขน)
      - "เสื้อ+กางเกง"          (ชุดเสื้อ+กางเกง ไม่ระบุแขน)
      - "เสื้อ+กางเกง+ถุงเท้า"   (ครบชุด)
      ## เฉพาะอย่าง:
      - "กางเกงอย่างเดียว"
      - "ถุงเท้า"
      - "ปลอกแขน"
      ## หรือคำที่ปรากฏใน header ของใบงาน
  • quantity: จำนวน (number, ปกติ = 1)
      - กรณีของ bulk ไม่ระบุชื่อ (เช่น "ถุงเท้า ไซส์ M 5 คู่") → quantity = 5
  • sponsor: ชื่อ sponsor (string, "" ถ้าไม่ระบุ)
  • note: หมายเหตุ (string, "" ถ้าไม่มี)

หลักการสำคัญ:
1. **ตรวจจับ "แขนสั้น/แขนยาว" ก่อน** — ถ้าใบงานบอกชนิดแขนชัดเจน (เช่น มี column แยก "แขนสั้น" "แขนยาว" หรือมี header "เสื้อแขนยาว")
   → ใช้ item_type ที่ระบุแขน เช่น "เสื้อแขนยาว" / "เสื้อแขนสั้น+กางเกง"
2. ถ้าไม่บอกแขน → ใช้แบบ generic เช่น "เสื้ออย่างเดียว" / "เสื้อ+กางเกง"
3. ถ้าคนหนึ่งได้ทั้งเสื้อและกางเกง → 1 row, item_type รวมทั้งสอง
4. ถ้าใบงานมีช่อง "จำนวนเสื้อ" "จำนวนกางเกง" ให้ตีความตามนี้:
   - เสื้อแขนยาว=1, กางเกง=0 → "เสื้อแขนยาว"
   - เสื้อแขนยาว=1, กางเกง=1 → "เสื้อแขนยาว+กางเกง"
   - เสื้อ=1 (ไม่ระบุแขน), กางเกง=0 → "เสื้ออย่างเดียว"
   - เสื้อ=1, กางเกง=1, ถุงเท้า=1 → "เสื้อ+กางเกง+ถุงเท้า"
5. **คำคีย์เวิร์ดที่บ่งบอกแขนยาว**: "แขนยาว", "Long Sleeve", "LS", "L/S", "ยาว"
6. **คำคีย์เวิร์ดที่บ่งบอกแขนสั้น**: "แขนสั้น", "Short Sleeve", "SS", "S/S", "สั้น"
7. ข้ามแถวว่าง / header / sub-total / grand-total

ตัวอย่าง output:
[
  {"name":"Mac_chiaTo","number":"8","size":"M","item_type":"เสื้อแขนสั้น","quantity":1,"sponsor":"","note":""},
  {"name":"NOAH","number":"15","size":"L","item_type":"เสื้อแขนยาว","quantity":1,"sponsor":"","note":""},
  {"name":"CHAICHAN","number":"44","size":"M","item_type":"เสื้อแขนสั้น+กางเกง","quantity":1,"sponsor":"","note":""},
  {"name":"MORN","number":"32","size":"L","item_type":"เสื้อแขนยาว+กางเกง","quantity":1,"sponsor":"","note":""},
  {"name":"","number":"","size":"M","item_type":"ถุงเท้า","quantity":5,"sponsor":"","note":""}
]

ตอบกลับ JSON array เท่านั้น — ห้ามมีข้อความอื่น
ถ้าไม่พบรายชื่อเลย ตอบ []`;

function extractJsonArray(text: string): unknown {
  // Try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // ignored
  }
  // Try extracting code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
      // ignored
    }
  }
  // Try finding array bracket
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      // ignored
    }
  }
  return null;
}

function normalizeRows(data: unknown): ParsedRow[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((row): ParsedRow | null => {
      if (typeof row !== "object" || row === null) return null;
      const r = row as Record<string, unknown>;
      const getStr = (key: string): string => {
        const v = r[key];
        if (v == null) return "";
        if (typeof v === "string") return v.trim();
        if (typeof v === "number") return String(v);
        return "";
      };
      const getNum = (key: string): number => {
        const v = r[key];
        if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.floor(v);
        if (typeof v === "string") {
          const n = parseInt(v.trim(), 10);
          if (Number.isFinite(n) && n > 0) return n;
        }
        return 1;
      };
      return {
        name: getStr("name"),
        number: getStr("number"),
        size: normalizeSize(getStr("size")),
        item_type: getStr("item_type"),
        quantity: getNum("quantity"),
        sponsor: getStr("sponsor"),
        note: getStr("note"),
      };
    })
    .filter((r): r is ParsedRow => r !== null)
    .filter((r) => r.name || r.number || r.size || r.item_type || r.sponsor || r.note);
}

export async function parseRosterWithAI(
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ ok: true; rows: ParsedRow[] } | { ok: false; error: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "ยังไม่ได้ตั้ง GEMINI_API_KEY ใน Vercel" };
  }

  if (fileBuffer.length > 20 * 1024 * 1024) {
    return { ok: false, error: "ไฟล์ใหญ่เกิน 20MB" };
  }

  const base64 = fileBuffer.toString("base64");
  const body = JSON.stringify({
    contents: [
      {
        parts: [
          { text: SYSTEM_PROMPT },
          { inlineData: { mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  });

  let lastError = "ไม่สามารถเชื่อมต่อ AI ได้";

  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        }
      );

      if (response.status === 429) { lastError = `${model}: โควต้าหมด`; continue; }
      if (response.status === 404) { lastError = `${model}: ไม่พบ`; continue; }
      if (!response.ok) {
        const t = await response.text();
        lastError = `Gemini ${response.status}: ${t.slice(0, 300)}`;
        continue;
      }

      const data = (await response.json()) as GeminiResponse;
      if (data.error) { lastError = data.error.message ?? "AI error"; continue; }

      const textOut = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (!textOut) { lastError = "AI ไม่ตอบข้อมูล"; continue; }

      const parsed = extractJsonArray(textOut);
      if (!parsed) { lastError = "AI ตอบผิดรูปแบบ"; continue; }

      const rows = normalizeRows(parsed);
      return { ok: true, rows };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return {
    ok: false,
    error: `AI ทุกตัวสำรองล้มเหลว — ${lastError}\n\nวิธีแก้:\n1. รอจนถึงเที่ยงคืน (โควต้า reset)\n2. หรือเปิด billing ที่ ai.google.dev\n3. หรือใช้วิธี Excel/CSV upload แทน`,
  };
}
