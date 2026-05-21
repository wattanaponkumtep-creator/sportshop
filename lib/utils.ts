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

export function formatBaht(amount: number | null | undefined) {
  if (amount == null) return "-";
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(amount);
}

export function generateTrackToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
