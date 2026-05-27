import "server-only";
import type { ParsedRow } from "./roster-excel";

const GEMINI_MODEL = "gemini-1.5-flash";

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
- แต่ละแถว = นักกีฬา/สมาชิก 1 คน
- ฟิลด์ที่ต้องดึง:
  • name: ชื่อ-นามสกุล (string)
  • number: เบอร์เสื้อ (string, "" ถ้าไม่ระบุ)
  • size: ไซส์ — แปลงเป็นตัวพิมพ์ใหญ่ เช่น "L", "XL", "2XL", "3XL" ("" ถ้าไม่ระบุ)
  • sponsor: ชื่อ sponsor บนเสื้อ (string, "" ถ้าไม่ระบุ)
  • note: หมายเหตุพิเศษ เช่น "แก้ขนาด", "เพิ่มชื่อพ่อ" (string, "" ถ้าไม่มี)

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
      const get = (key: string): string => {
        const v = r[key];
        if (v == null) return "";
        if (typeof v === "string") return v.trim();
        if (typeof v === "number") return String(v);
        return "";
      };
      return {
        name: get("name"),
        number: get("number"),
        size: get("size").toUpperCase(),
        sponsor: get("sponsor"),
        note: get("note"),
      };
    })
    .filter((r): r is ParsedRow => r !== null)
    .filter((r) => r.name || r.number || r.size || r.sponsor || r.note);
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
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `Gemini API error ${response.status}: ${text}` };
    }

    const data = (await response.json()) as GeminiResponse;
    if (data.error) {
      return { ok: false, error: data.error.message ?? "Gemini error" };
    }

    const textOut = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!textOut) {
      return { ok: false, error: "AI ไม่ตอบข้อมูล" };
    }

    const parsed = extractJsonArray(textOut);
    if (!parsed) {
      return { ok: false, error: "AI ตอบผิดรูปแบบ ลองอีกครั้ง" };
    }

    const rows = normalizeRows(parsed);
    return { ok: true, rows };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
