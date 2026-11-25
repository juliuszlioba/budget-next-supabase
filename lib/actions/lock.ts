import "server-only";

import { cookies } from "next/headers";
import type { Db } from "@/lib/dal/auth";
import { monthName, todayIso, type YM } from "@/lib/domain/dates";
import { isMonthReadOnly, UNLOCKED_MONTH_COOKIE } from "@/lib/domain/lock";

/** Throws when any of these months is locked (and not the one unlocked on the month screen). */
export async function assertMonthsOpen(...months: YM[]): Promise<void> {
  const unlocked = (await cookies()).get(UNLOCKED_MONTH_COOKIE)?.value ?? null;
  const today = todayIso();
  const locked = months.find((m) => isMonthReadOnly(m, today, unlocked));
  if (locked) {
    throw new Error(`${monthName(locked.month)} ${locked.year} is locked. Unlock it on its month page to make changes.`);
  }
}

/** The month an item is stored in. */
export async function itemMonth(db: Db, itemId: string): Promise<YM> {
  const { data, error } = await db.from("items").select("months!inner(year, month)").eq("id", itemId).single();
  if (error) throw error;
  return data.months;
}
