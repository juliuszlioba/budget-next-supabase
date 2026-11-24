import type { ChainedMonth } from "./totals";

/** Bucket key used for the part of a Credit bill not covered by logged card purchases. */
export const CREDIT_UNTRACKED = "credit-untracked";

export type YearPoint = {
  month: number;
  incomeCents: number;
  savingsCents: number;
  spentCents: number;
  essentialsCents: number;
  cumulativeSavingsCents: number;
  /** categoryId (or CREDIT_UNTRACKED) → cents. Sums to spentCents. */
  byCategory: Record<string, number>;
};

/**
 * Builds per-month chart data. Card purchases count in their own categories, in the month of the
 * bill that pays them; the uncovered remainder of each bill goes to CREDIT_UNTRACKED.
 */
export function yearSeries(months: ChainedMonth[]): YearPoint[] {
  let cumulative = 0;
  return [...months]
    .sort((a, b) => a.month - b.month)
    .map((m) => {
      const byCategory: Record<string, number> = {};
      const add = (key: string, cents: number) => {
        if (cents !== 0) byCategory[key] = (byCategory[key] ?? 0) + cents;
      };
      for (const it of m.items) {
        if (it.parentItemId) {
          add(it.categoryId, it.amountCents);
        } else if (it.isCreditBill) {
          add(CREDIT_UNTRACKED, m.totals.credit[it.id].untrackedCents);
        } else {
          add(it.categoryId, it.amountCents);
        }
      }
      cumulative += m.totals.savingsCents;
      return {
        month: m.month,
        incomeCents: m.totals.incomeCents,
        savingsCents: m.totals.savingsCents,
        spentCents: m.totals.expenseCents,
        essentialsCents: m.totals.essentialsCents,
        cumulativeSavingsCents: cumulative,
        byCategory,
      };
    });
}

export type YearSummary = {
  incomeCents: number;
  savingsCents: number;
  spentCents: number;
  essentialsCents: number;
  /** 0–1, or null when there was no income. */
  savingsRate: number | null;
};

export function yearSummary(points: YearPoint[]): YearSummary {
  const sum = (f: (p: YearPoint) => number) => points.reduce((a, p) => a + f(p), 0);
  const incomeCents = sum((p) => p.incomeCents);
  const savingsCents = sum((p) => p.savingsCents);
  return {
    incomeCents,
    savingsCents,
    spentCents: sum((p) => p.spentCents),
    essentialsCents: sum((p) => p.essentialsCents),
    savingsRate: incomeCents > 0 ? savingsCents / incomeCents : null,
  };
}
