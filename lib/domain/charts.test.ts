import { describe, expect, it } from "vitest";
import { chainMonths, type CalcItem } from "./totals";
import { CREDIT_UNTRACKED, yearSeries, yearSummary } from "./charts";

const it_ = (id: string, amount: number, o: Partial<CalcItem> = {}): CalcItem => ({
  id,
  amountCents: amount,
  paid: true,
  categoryId: "food",
  isEstimate: false,
  isCreditBill: false,
  parentItemId: null,
  ...o,
});

describe("yearSeries", () => {
  const months = chainMonths(
    [
      {
        year: 2026,
        month: 1,
        openingBalanceCents: 0,
        incomeCents: [300000],
        savingsCents: 100000,
        items: [
          it_("rent", 80000, { categoryId: "housing" }),
          it_("groceries", 40000),
          it_("bill", 47525, { isCreditBill: true, categoryId: "card" }),
          it_("uniqlo", 9460, { parentItemId: "bill", categoryId: "shopping" }),
          it_("cash", -60000, { categoryId: "other" }),
        ],
      },
      {
        year: 2026,
        month: 2,
        openingBalanceCents: null,
        incomeCents: [300000],
        savingsCents: 50000,
        items: [it_("est", 10000, { isCreditBill: true, isEstimate: true, categoryId: "card" }), it_("p", 15000, { parentItemId: "est", categoryId: "fun" })],
      },
    ],
    new Set(["housing"]),
  );
  const series = yearSeries(months);

  it("splits the credit bill into purchases and an untracked remainder", () => {
    expect(series[0].byCategory).toEqual({
      housing: 80000,
      food: 40000,
      shopping: 9460,
      [CREDIT_UNTRACKED]: 47525 - 9460,
      other: -60000,
    });
  });

  it("leaves money back out of spending by category", () => {
    expect(series[0].spentByCategory).toEqual({
      housing: 80000,
      food: 40000,
      shopping: 9460,
      [CREDIT_UNTRACKED]: 47525 - 9460,
    });
  });

  it("each month's categories add up to its spent total", () => {
    for (const p of series) {
      const total = Object.values(p.byCategory).reduce((a, b) => a + b, 0);
      expect(total).toBe(p.spentCents);
    }
    expect(series[1].byCategory).toEqual({ fun: 15000 });
  });

  it("accumulates savings and summarises the year", () => {
    expect(series.map((p) => p.cumulativeSavingsCents)).toEqual([100000, 150000]);
    const s = yearSummary(series);
    expect(s.incomeCents).toBe(600000);
    expect(s.savingsCents).toBe(150000);
    expect(s.savingsRate).toBeCloseTo(0.25);
  });
});
