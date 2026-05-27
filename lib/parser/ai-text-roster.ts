import "server-only";

const GEMINI_MODEL = "gemini-2.0-flash";

export type TextParsedRow = {
  name: string;
  number: string;
  size: string;
  item_type: string;
  note: string;
};

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
};

const PROMPT = `คุณเป็นผู้ช่วยอ่านรายการสั่งเสื้อกีฬาภาษาไทย ให้ดึงข้อมูลออกเป็น JSON

ลักษณะข้อมูล:
- มี section header ระบุประเภทสินค้า เช่น "เป็นชุด", "เฉพาะเสื้อ", "เฉพาะกางเกง", "ถุงเท้า", "ปลอกแขน"
- หลังจาก header จะมีรายการสมาชิก: ไซส์ + เบอร์ (เช่น "M 6", "L 25", "XL 12")
- บางแถวอาจมีชื่อด้วย: "สมชาย M 6"
- ไซส์ปกติ: XS, S, M, L, XL, 2XL, 3XL, 4XL, 5XL
- ถ้า header เปลี่ยน รายการที่ตามมาเป็นประเภทใหม่

เป้าหมาย: แต่ละคน 1 row โดยมี
- name: ชื่อ (ถ้ามี) ไม่งั้น ""
- number: เบอร์เสื้อ (string)
- size: ไซส์ — UPPER case เช่น "M", "L", "XL", "2XL"
- item_type: ประเภทสินค้า เช่น "เป็นชุด", "เฉพาะเสื้อ", "เฉพาะกางเกง", "ถุงเท้า"
- note: หมายเหตุพิเศษ (ถ้ามี) ไม่งั้น ""

หลักการสำคัญ:
1. ถ้าเจอ header "เป็นชุด" → รายการที่ตามมาทั้งหมด item_type = "เป็นชุด" จนกว่าจะเจอ header ใหม่
2. ถ้าไม่มี header ชัดเจน ให้ใช้ "เฉพาะเสื้อ" เป็นค่าเริ่มต้น
3. ถ้าแถวเดียวมีหลายเบอร์ (เช่น "M 6, 25, 30") แยกเป็น 3 rows
4. ข้ามแถวว่าง / แถวที่ไม่ใช่ข้อมูล
5. ตอบเป็น JSON array อย่างเดียว — ไม่ต้องอธิบาย

ตัวอย่าง input:
เป็นชุด
M 6
M 25
L 5
เฉพาะเสื้อ
M 10
L 77

ตัวอย่าง output:
[
  {"name":"","number":"6","size":"M","item_type":"เป็นชุด","note":""},
  {"name":"","number":"25","size":"M","item_type":"เป็นชุด","note":""},
  {"name":"","number":"5","size":"L","item_type":"เป็นชุด","note":""},
  {"name":"","number":"10","size":"M","item_type":"เฉพาะเสื้อ","note":""},
  {"name":"","number":"77","size":"L","item_type":"เฉพาะเสื้อ","note":""}
]`;

function extractJsonArray(text: string): unknown {
  try { return JSON.parse(text); } catch { /* ignore */ }
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1]); } catch { /* ignore */ }
  }
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch { /* ignore */ }
  }
  return null;
}

function normalize(data: unknown): TextParsedRow[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((row): TextParsedRow | null => {
      if (typeof row !== "object" || row === null) return null;
      const r = row as Record<string, unknown>;
      const get = (k: string): string => {
        const v = r[k];
        if (v == null) return "";
        if (typeof v === "string") return v.trim();
        if (typeof v === "number") return String(v);
        return "";
      };
      return {
        name: get("name"),
        number: get("number"),
        size: get("size").toUpperCase(),
        item_type: get("item_type") || "เฉพาะเสื้อ",
        note: get("note"),
      };
    })
    .filter((r): r is TextParsedRow => r !== null)
    .filter((r) => r.name || r.number || r.size);
}

export async function parseRosterText(
  text: string
): Promise<{ ok: true; rows: TextParsedRow[] } | { ok: false; error: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "ยังไม่ได้ตั้ง GEMINI_API_KEY ใน Vercel" };
  }
  if (!text || text.trim().length < 5) {
    return { ok: false, error: "ข้อความสั้นเกินไป" };
  }
  if (text.length > 50000) {
    return { ok: false, error: "ข้อความยาวเกินไป (เกิน 50,000 ตัวอักษร)" };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT },
                { text: "\n\n--- ข้อความที่ต้องอ่าน ---\n" + text },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return { ok: false, error: `Gemini API error ${response.status}: ${errText}` };
    }

    const data = (await response.json()) as GeminiResponse;
    if (data.error) return { ok: false, error: data.error.message ?? "AI error" };

    const textOut = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!textOut) return { ok: false, error: "AI ไม่ตอบข้อมูล" };

    const parsed = extractJsonArray(textOut);
    if (!parsed) return { ok: false, error: "AI ตอบผิดรูปแบบ ลองอีกครั้ง" };

    const rows = normalize(parsed);
    return { ok: true, rows };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
