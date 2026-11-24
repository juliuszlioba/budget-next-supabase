import { compareYm, type YM } from "./dates";
import type { BillDef } from "./newMonth";

export type BillItem = YM & {
  id: string;
  billId: string;
  amountCents: number;
  paid: boolean;
  isEstimate: boolean;
};

export type BillChangePlan = {
  update: { id: string; name: string; amountCents: number; categoryId: string }[];
  /** Months (current and later) that need a new item for this bill. */
  addTo: YM[];
  remove: string[];
};

/**
 * How a bill change reaches months that already exist:
 * only the current month and later, only unpaid items not edited by hand.
 * A deactivated bill is removed from later months; the current month is left alone.
 */
export function planBillChange(
  before: BillDef | null,
  after: BillDef,
  items: BillItem[],
  current: YM,
  existingMonths: YM[],
): BillChangePlan {
  const plan: BillChangePlan = { update: [], addTo: [], remove: [] };
  const fromCurrent = (m: YM) => compareYm(m, current) >= 0;
  const mine = items.filter((it) => it.billId === after.id && fromCurrent(it));
  const unedited = (it: BillItem) =>
    !it.paid &&
    (before === null ||
      (before.isCreditCard ? it.isEstimate : it.amountCents === before.defaultAmountCents));

  const wasActive = before?.active ?? false;

  if (after.active) {
    for (const it of mine.filter(unedited)) {
      plan.update.push({ id: it.id, name: after.name, amountCents: after.defaultAmountCents, categoryId: after.categoryId });
    }
    if (!wasActive) {
      for (const m of existingMonths.filter(fromCurrent)) {
        if (!mine.some((it) => compareYm(it, m) === 0)) plan.addTo.push(m);
      }
    }
  } else if (wasActive) {
    plan.remove = mine.filter((it) => compareYm(it, current) > 0 && unedited(it)).map((it) => it.id);
  }
  return plan;
}
