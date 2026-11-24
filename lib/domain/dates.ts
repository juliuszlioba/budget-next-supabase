/** Calendar helpers working on plain year/month/day numbers (no time zones). */

export type YM = { year: number; month: number }; // month 1–12

export function ymKey({ year, month }: YM): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseYm(key: string): YM | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12 || year < 2000 || year > 2100) return null;
  return { year, month };
}

export function addMonths({ year, month }: YM, n: number): YM {
  const idx = year * 12 + (month - 1) + n;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function compareYm(a: YM, b: YM): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

export function ymOfDate(iso: string): YM {
  const [year, month] = iso.split("-").map(Number);
  return { year, month };
}

export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isIsoDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const monthLong = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });
const monthAbbr = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

const utc = (year: number, month: number, day = 1) => new Date(Date.UTC(year, month - 1, day));

export function monthName(month: number): string {
  return monthLong.format(utc(2000, month));
}

export function monthShort(month: number): string {
  return monthAbbr.format(utc(2000, month));
}

/** "Today" in Europe/Vienna as YYYY-MM-DD. */
export function todayIso(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** "24 Nov" */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return dayMonth.format(utc(y, m, d));
}
