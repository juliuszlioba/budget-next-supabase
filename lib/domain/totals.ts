/**
 * Month calculations. Everything is in integer cents.
 *
 *   income        = sum(income lines)
 *   carry         = opening balance, else previous month's end forecast, else 0
 *   expense       = sum(top-level items)
 *   essentials    = sum(top-level items in essential categories)
 *   available_now = carry + income − savings − sum(paid top-level items)
 *   end_forecast  = carry + income − savings − expense
 *
 * Card purchases (items with a parent) never count directly — only the Credit bill does.
 */

import { addMonths, compareYm, ymKey, type YM } from "./dates";

export type CalcItem = {
  id: string;
  amountCents: number;
  paid: boolean;
  categoryId: string;
  isEstimate: boolean;
  isCreditBill: boolean;
  parentItemId: string | null;
};

export type CreditInfo = {
  itemId: string;
  /** What the bill counts as in the totals. */
  effectiveCents: number;
  trackedCents: number;
  /** effective − tracked. Negative only when a real statement is smaller than the logged purchases. */
  untrackedCents: number;
  /** A confirmed (non-estimate) bill whose logged purchases exceed it. */
  overTracked: boolean;
};

export type MonthTotals = {
  carryCents: number;
  incomeCents: number;
  savingsCents: number;
  expenseCents: number;
  essentialsCents: number;
  availableNowCents: number;
  endForecastCents: number;
  unpaidCount: number;
  unpaidCents: number;
  credit: Record<string, CreditInfo>;
  /** Effective amount per top-level item id (Credit bills may differ from their stored amount). */
  effective: Record<string, number>;
};

export type MonthInput = {
  incomeCents: number[];
  savingsCents: number;
  carryCents: number;
  items: CalcItem[];
  essentialCategoryIds: Set<string>;
};

export function monthTotals(input: MonthInput): MonthTotals {
  const { items, essentialCategoryIds } = input;
  const trackedByParent = new Map<string, number>();
  for (const it of items) {
    if (it.parentItemId) {
      trackedByParent.set(it.parentItemId, (trackedByParent.get(it.parentItemId) ?? 0) + it.amountCents);
    }
  }

  const top = items.filter((it) => !it.parentItemId);
  const credit: Record<string, CreditInfo> = {};
  const effective: Record<string, number> = {};

  for (const it of top) {
    let eff = it.amountCents;
    if (it.isCreditBill) {
      const tracked = trackedByParent.get(it.id) ?? 0;
      if (it.isEstimate && tracked > it.amountCents) eff = tracked;
      credit[it.id] = {
        itemId: it.id,
        effectiveCents: eff,
        trackedCents: tracked,
        untrackedCents: eff - tracked,
        overTracked: !it.isEstimate && tracked > it.amountCents,
      };
    }
    effective[it.id] = eff;
  }

  const sum = (xs: CalcItem[]) => xs.reduce((acc, it) => acc + effective[it.id], 0);
  const incomeCents = input.incomeCents.reduce((a, b) => a + b, 0);
  const expenseCents = sum(top);
  const paidCents = sum(top.filter((it) => it.paid));
  const unpaid = top.filter((it) => !it.paid);
  const base = input.carryCents + incomeCents - input.savingsCents;

  return {
    carryCents: input.carryCents,
    incomeCents,
    savingsCents: input.savingsCents,
    expenseCents,
    essentialsCents: sum(top.filter((it) => essentialCategoryIds.has(it.categoryId))),
    availableNowCents: base - paidCents,
    endForecastCents: base - expenseCents,
    unpaidCount: unpaid.length,
    unpaidCents: sum(unpaid),
    credit,
    effective,
  };
}

export type ChainMonth = YM & {
  openingBalanceCents: number | null;
  incomeCents: number[];
  savingsCents: number;
  items: CalcItem[];
};

export type ChainedMonth<T extends ChainMonth = ChainMonth> = T & { key: string; totals: MonthTotals };

/**
 * Computes every month's totals, carrying each month's end forecast into the next calendar month.
 * A month whose previous calendar month doesn't exist starts from its opening balance, or 0.
 */
export function chainMonths<T extends ChainMonth>(months: T[], essentialCategoryIds: Set<string>): ChainedMonth<T>[] {
  const sorted = [...months].sort(compareYm);
  const out: ChainedMonth<T>[] = [];
  let prev: ChainedMonth<T> | null = null;
  for (const m of sorted) {
    const prevIsAdjacent = prev !== null && ymKey(addMonths(prev, 1)) === ymKey(m);
    const carryCents =
      m.openingBalanceCents ?? (prevIsAdjacent && prev ? prev.totals.endForecastCents : 0);
    const totals = monthTotals({
      incomeCents: m.incomeCents,
      savingsCents: m.savingsCents,
      carryCents,
      items: m.items,
      essentialCategoryIds,
    });
    const chained = { ...m, key: ymKey(m), totals };
    out.push(chained);
    prev = chained;
  }
  return out;
}
