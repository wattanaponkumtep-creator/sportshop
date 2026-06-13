import * as XLSX from "xlsx";
import { normalizeSize } from "@/lib/constants";

export type ParsedRow = {
  name: string;
  number: string;
  size: string;
  item_type: string;
  quantity: number;
  sponsor: string;
  note: string;
};

type DetectableField = Exclude<keyof ParsedRow, "quantity">;

// Flexible header mapping — Thai + English variants
const HEADER_PATTERNS: Record<DetectableField, RegExp[]> = {
  name: [/^ชื่อ/i, /^name/i, /^player/i, /^นักกีฬา/i, /^นัก/i, /^member/i, /^สมาชิก/i],
  number: [/^เบอร์/i, /^หมายเลข/i, /^no\.?$/i, /^number/i, /^num/i, /^เลข/i, /^#/],
  size: [/^ไซส์/i, /^size/i, /^ขนาด/i, /^sz/i],
  item_type: [/^ประเภท/i, /^สินค้า/i, /^item/i, /^type/i, /^product/i, /^kind/i],
  sponsor: [/^sponsor/i, /^สปอนเซอร์/i, /^สปอน/i, /^logo/i, /^โลโก้/i],
  note: [/^หมายเหตุ/i, /^remark/i, /^note/i, /^comment/i, /^อื่น/i],
};

function detectHeaderColumns(headers: string[]): Partial<Record<keyof ParsedRow, number>> {
  const map: Partial<Record<keyof ParsedRow, number>> = {};
  for (let i = 0; i < headers.length; i++) {
    const cell = String(headers[i] ?? "").trim();
    if (!cell) continue;
    for (const [field, patterns] of Object.entries(HEADER_PATTERNS) as [keyof ParsedRow, RegExp[]][]) {
      if (map[field] !== undefined) continue; // already mapped
      if (patterns.some((p) => p.test(cell))) {
        map[field] = i;
        break;
      }
    }
  }
  return map;
}

function cellToString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v).trim();
}

export type ParseResult = {
  ok: true;
  rows: ParsedRow[];
  detectedColumns: Partial<Record<keyof ParsedRow, number>>;
  headerRow: string[];
  totalRows: number;
} | {
  ok: false;
  error: string;
};

export function parseRosterFile(arrayBuffer: ArrayBuffer): ParseResult {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) return { ok: false, error: "ไม่พบ sheet ในไฟล์" };

    const sheet = workbook.Sheets[firstSheet];
    // Convert to array of arrays
    const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (data.length < 2) {
      return { ok: false, error: "ไฟล์ว่างเปล่า หรือไม่มี header" };
    }

    // Try detecting header row (could be row 0, 1, or 2 — sometimes title is row 0)
    let headerRowIdx = 0;
    let detected = detectHeaderColumns(data[0].map(cellToString));
    if (Object.keys(detected).length < 2 && data.length >= 2) {
      // Try row 1
      const d1 = detectHeaderColumns(data[1].map(cellToString));
      if (Object.keys(d1).length > Object.keys(detected).length) {
        headerRowIdx = 1;
        detected = d1;
      }
    }
    if (Object.keys(detected).length < 2 && data.length >= 3) {
      // Try row 2
      const d2 = detectHeaderColumns(data[2].map(cellToString));
      if (Object.keys(d2).length > Object.keys(detected).length) {
        headerRowIdx = 2;
        detected = d2;
      }
    }

    if (Object.keys(detected).length === 0) {
      return {
        ok: false,
        error: "ไม่พบ column headers ที่รู้จัก — ใช้ชื่อ column เช่น 'ชื่อ', 'เบอร์', 'ไซส์', 'sponsor', 'หมายเหตุ'",
      };
    }

    const headerRow = data[headerRowIdx].map(cellToString);
    const rows: ParsedRow[] = [];

    for (let r = headerRowIdx + 1; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length === 0) continue;

      const parsed: ParsedRow = {
        name: detected.name !== undefined ? cellToString(row[detected.name]) : "",
        number: detected.number !== undefined ? cellToString(row[detected.number]) : "",
        size: detected.size !== undefined ? normalizeSize(cellToString(row[detected.size])) : "",
        item_type: detected.item_type !== undefined ? cellToString(row[detected.item_type]) : "",
        quantity: 1,
        sponsor: detected.sponsor !== undefined ? cellToString(row[detected.sponsor]) : "",
        note: detected.note !== undefined ? cellToString(row[detected.note]) : "",
      };

      // Skip rows that are entirely empty
      if (
        !parsed.name && !parsed.number && !parsed.size && !parsed.item_type
        && !parsed.sponsor && !parsed.note
      ) {
        continue;
      }

      rows.push(parsed);
    }

    return {
      ok: true,
      rows,
      detectedColumns: detected,
      headerRow,
      totalRows: rows.length,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "อ่านไฟล์ไม่สำเร็จ" };
  }
}
