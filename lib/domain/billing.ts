import { addMonths, isoDate, weekday, type YM } from "./dates";

const isWeekend = (y: number, m: number, d: number) => [0, 6].includes(weekday(y, m, d));

/** The card statement clears on the first workday (Mon–Fri) of the month. Public holidays are ignored. */
export function firstWorkday(year: number, month: number): number {
  let day = 1;
  while (isWeekend(year, month, day)) day++;
  return day;
}

/**
 * Which month's Credit bill pays for a card purchase made on `iso`:
 * the first month whose clearing day falls strictly after the purchase date.
 */
export function creditBillMonthFor(iso: string): YM {
  const [year, month, day] = iso.split("-").map(Number);
  if (day < firstWorkday(year, month)) return { year, month };
  return addMonths({ year, month }, 1);
}

/** Money is collected from the current account on the 10th, or the next workday after it. */
export function collectionDate(year: number, month: number): string {
  let day = 10;
  while (isWeekend(year, month, day)) day++;
  return isoDate(year, month, day);
}
