import { addMonths, compareYm, ymKey, ymOfDate, type YM } from "./dates";

/** Cookie holding the one month ("YYYY-MM") unlocked for editing on the month screen. */
export const UNLOCKED_MONTH_COOKIE = "budget_unlocked_month";

/**
 * Months before last month are locked so they aren't changed by accident.
 * Last month stays open as a grace period (late statements, refunds, forgotten items).
 */
export function isLockedMonth(ym: YM, today: string): boolean {
  return compareYm(ym, addMonths(ymOfDate(today), -1)) < 0;
}

/** Locked, unless it's the month the user unlocked for editing. */
export function isMonthReadOnly(ym: YM, today: string, unlockedKey: string | null | undefined): boolean {
  return isLockedMonth(ym, today) && ymKey(ym) !== unlockedKey;
}
