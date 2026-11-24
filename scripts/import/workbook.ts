/**
 * Reads the budget spreadsheet (one sheet per month) and maps it to app data.
 * Shared by `pnpm import:xlsx` (writes to the database) and `pnpm seed:xlsx` (writes a seed file).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { guessCategory } from "./guess";
import { toCents } from "../../lib/domain/money";

const SHEETS: Record<string, number> = {
  January: 1, February: 2, March: 3, April: 4, Mai: 5, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};

export const MAP_FILE = path.join(import.meta.dirname, "category-map.json");

export type SheetItem = { name: string; cents: number; paid: boolean };
export type SheetMonth = {
  year: number;
  month: number;
  incomeCents: number;
  openingCents: number | null;
  savingsCents: number;
  availableCents: number;
  /** Null when the sheet has no "End forecast" row (older sheets); then it equals "Available now". */
  forecastCents: number | null;
  /** The sheet's "From previous month" checkbox is off, so it doesn't carry the previous month over. */
  carryOff: boolean;
  items: SheetItem[];
};
export type IncomeLine = { label: string; cents: number; recurring: boolean };

export const ym = (m: { year: number; month: number }) => m.year * 12 + m.month;
export const forecastOf = (m: SheetMonth) => m.forecastCents ?? m.availableCents;

function text(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "richText" in v) return v.richText.map((r) => r.text).join("");
  if (typeof v === "object" && "result" in v) return String(v.result ?? "");
  return String(v);
}
function num(v: ExcelJS.CellValue): number | null {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "result" in v && typeof v.result === "number") return v.result;
  return null;
}

/**
 * Sheets are named by month, optionally followed by the year ("January 2026", "Mai 2025");
 * sheets without a year belong to `defaultYear`. Returns the months in calendar order.
 */
export async function readWorkbook(file: string, defaultYear: number): Promise<SheetMonth[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const months: SheetMonth[] = [];
  for (const ws of wb.worksheets) {
    const match = /^(\p{L}+)(?:\s+(\d{4}))?$/u.exec(ws.name.trim());
    const month = match ? SHEETS[match[1]] : undefined;
    if (!match || !month) {
      console.log(`Skipping sheet "${ws.name}"`);
      continue;
    }
    const year = match[2] ? Number(match[2]) : defaultYear;
    if (months.some((m) => m.year === year && m.month === month)) throw new Error(`Two sheets for ${month}/${year}`);
    const m: SheetMonth = {
      year, month, incomeCents: 0, openingCents: null, savingsCents: 0, availableCents: 0, forecastCents: null,
      carryOff: false, items: [],
    };
    let inItems = false;
    ws.eachRow({ includeEmpty: false }, (row) => {
      const label = text(row.getCell(2).value).trim();
      const amount = num(row.getCell(3).value);
      const check = row.getCell(4).value;
      if (!inItems) {
        const l = label.toLowerCase();
        if (l === "monthly expenses") inItems = true;
        else if (l === "from previous month") m.carryOff = !amount;
        else if (amount === null) return;
        else if (l === "income") m.incomeCents = toCents(amount);
        else if (l === "start of the month") m.openingCents = toCents(amount);
        else if (l === "savings") m.savingsCents = toCents(amount);
        else if (l === "available now") m.availableCents = toCents(amount);
        else if (l === "end forecast") m.forecastCents = toCents(amount);
        return;
      }
      if (!label || amount === null) return;
      // A blank checkbox counts as paid, exactly like the sheet's SUMIFS(..., "").
      m.items.push({ name: label, cents: toCents(amount), paid: check !== false });
    });
    months.push(m);
  }
  months.sort((a, b) => ym(a) - ym(b));
  // "Start of the month" only becomes an opening balance where the chain starts or breaks; a month that
  // just repeats the previous month's result carries over like the rest, so later edits flow through.
  for (const [i, m] of months.entries()) {
    const prev = months[i - 1];
    if (m.openingCents !== null && prev && ym(prev) === ym(m) - 1 && Math.abs(m.openingCents - forecastOf(prev)) <= 1) {
      m.openingCents = null;
    }
  }
  if (!months.length) {
    throw new Error('No month sheets found. Name them "January" … "December", optionally with the year ("January 2026").');
  }
  return months;
}

export function yearsOf(sheet: SheetMonth[]): number[] {
  return [...new Set(sheet.map((m) => m.year))];
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : Math.round((s[s.length / 2 - 1] + s[s.length / 2]) / 2);
}

/**
 * Income lines per month. A year's regular salary is its median monthly income; anything well above
 * it in a month becomes a one-off "Extra salary" line.
 */
export function incomeLines(sheet: SheetMonth[]): (m: SheetMonth) => IncomeLine[] {
  const base = new Map(yearsOf(sheet).map((y) => [y, median(sheet.filter((m) => m.year === y).map((m) => m.incomeCents))]));
  return (m) => {
    const salary = base.get(m.year)!;
    const extra = m.incomeCents - salary;
    return extra > salary / 2
      ? [
          { label: "Salary", cents: salary, recurring: true },
          { label: "Extra salary", cents: extra, recurring: false },
        ]
      : [{ label: "Salary", cents: m.incomeCents, recurring: true }];
  };
}

/** Category per distinct item name: the reviewed map file where it has the name, else a guess. */
export function categoryMapFor(sheet: SheetMonth[]): Record<string, string> {
  const distinct = [...new Set(sheet.flatMap((m) => m.items.map((i) => i.name.trim())))].sort((a, b) =>
    a.localeCompare(b),
  );
  const existing: Record<string, string> = existsSync(MAP_FILE) ? JSON.parse(readFileSync(MAP_FILE, "utf8")) : {};
  return Object.fromEntries(distinct.map((n) => [n, existing[n] ?? guessCategory(n)]));
}
