import { addMonths, compareYm, isoDate, ymKey, type YM } from "./dates";

export type BillDef = {
  id: string;
  name: string;
  defaultAmountCents: number;
  categoryId: string;
  isCreditCard: boolean;
  active: boolean;
  sortOrder: number;
};

export type IncomeLine = { label: string; amountCents: number; isRecurring: boolean };

export type NewMonthPlan = YM & {
  savingsCents: number;
  income: IncomeLine[];
  items: {
    name: string;
    amountCents: number;
    categoryId: string;
    date: string;
    paid: false;
    isEstimate: boolean;
    billId: string;
  }[];
};

/**
 * What a freshly started month contains: recurring income lines and savings from the
 * previous month, and one unpaid item per active bill (the credit-card bill as an estimate).
 */
export function planNewMonth(
  target: YM,
  prev: { savingsCents: number; income: IncomeLine[] } | null,
  bills: BillDef[],
): NewMonthPlan {
  return {
    ...target,
    savingsCents: prev?.savingsCents ?? 0,
    income: (prev?.income ?? []).filter((l) => l.isRecurring).map((l) => ({ ...l })),
    items: bills
      .filter((b) => b.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((b) => ({
        name: b.name,
        amountCents: b.defaultAmountCents,
        categoryId: b.categoryId,
        date: isoDate(target.year, target.month, 1),
        paid: false as const,
        isEstimate: b.isCreditCard,
        billId: b.id,
      })),
  };
}

/**
 * Months that must be created so `target` exists without breaking the carry-over chain:
 * every missing month after the latest existing month before `target`, up to `target`.
 * If nothing exists before `target`, only `target` itself.
 */
export function monthsToCreate(existing: YM[], target: YM): YM[] {
  const keys = new Set(existing.map(ymKey));
  if (keys.has(ymKey(target))) return [];
  const before = existing.filter((m) => compareYm(m, target) < 0).sort(compareYm);
  const latest = before.at(-1);
  if (!latest) return [target];
  const out: YM[] = [];
  for (let m = addMonths(latest, 1); compareYm(m, target) <= 0; m = addMonths(m, 1)) {
    if (!keys.has(ymKey(m))) out.push(m);
  }
  return out;
}
