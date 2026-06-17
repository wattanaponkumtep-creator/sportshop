import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ = "Asia/Bangkok";

export function formatDateTH(date: string | Date | null | undefined, pattern = "d MMM yyyy HH:mm") {
  if (!date) return "-";
  return formatInTimeZone(new Date(date), TZ, pattern, { locale: th });
}

export function formatDateShort(date: string | Date | null | undefined) {
  if (!date) return "-";
  return formatInTimeZone(new Date(date), TZ, "d MMM yy", { locale: th });
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: th });
}

/** Thai full date with Buddhist era + weekday: "ศุกร์ 12 มิถุนายน 2569" */
export function formatThaiFullDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  const weekday = formatInTimeZone(d, TZ, "EEEE", { locale: th });
  const day = formatInTimeZone(d, TZ, "d", { locale: th });
  const month = formatInTimeZone(d, TZ, "MMMM", { locale: th });
  const gregorianYear = Number(formatInTimeZone(d, TZ, "yyyy"));
  const buddhistYear = gregorianYear + 543;
  return `${weekday} ${day} ${month} ${buddhistYear}`;
}

export function formatBaht(amount: number | null | undefined) {
  if (amount == null) return "-";
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(amount);
}

/** Compact number for chart labels: 40340 → "40.3k", 1200000 → "1.2M" */
export function formatCompact(amount: number | null | undefined) {
  if (amount == null) return "-";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}k`;
  return `${sign}${Math.round(abs)}`;
}

export function generateTrackToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
