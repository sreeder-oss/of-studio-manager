import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Format a Date as 'YYYY-MM-DD' using its local calendar fields. */
function toLocalYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Parse a date-only 'YYYY-MM-DD' string as local midnight (not UTC). */
export function parseLocalDate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  if (!m) return new Date(value);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Today's date as 'YYYY-MM-DD' in the browser's time zone. */
export function todayLocal(now: Date = new Date()): string {
  return toLocalYmd(now);
}

/** Local date N days from today as 'YYYY-MM-DD'. */
export function daysFromTodayLocal(n: number, now: Date = new Date()): string {
  return toLocalYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n));
}
