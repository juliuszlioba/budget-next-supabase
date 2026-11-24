import { describe, expect, it } from "vitest";
import { chainMonths, monthTotals, type CalcItem } from "./totals";

const HOUSING = "housing";
const OTHER = "other";
const CARD = "card";

let n = 0;
function item(amount: number, opts: Partial<CalcItem> = {}): CalcItem {
  return {
    id: `i${++n}`,
    amountCents: Math.round(amount * 100),
    paid: true,
    categoryId: OTHER,
    isEstimate: false,
    isCreditBill: false,
    parentItemId: null,
    ...opts,
  };
}

/** A typical month: everything paid except one subscription. */
function typicalMonthItems(): CalcItem[] {
  const housing = { categoryId: HOUSING };
  return [
    item(300, { isCreditBill: true, categoryId: CARD }),
    item(400),
    item(800, housing),
    item(60, housing),
    item(40, housing),
    item(25),
    item(30, housing),
    item(15),
    item(10, { paid: false }),
    ...[20, 35, 45].map((a) => item(a)),
  ];
}

const essentials = new Set([HOUSING]);

describe("monthTotals", () => {
  it("computes a typical month", () => {
    const t = monthTotals({
      incomeCents: [300000],
      savingsCents: 100000,
      carryCents: 20000,
      items: typicalMonthItems(),
      essentialCategoryIds: essentials,
    });
    expect(t.expenseCents).toBe(178000);
    expect(t.essentialsCents).toBe(93000);
    expect(t.availableNowCents).toBe(43000);
    expect(t.endForecastCents).toBe(42000);
    expect(t.unpaidCount).toBe(1);
    expect(t.unpaidCents).toBe(1000);
  });

  it("treats negative items (cashback) as money back", () => {
    const t = monthTotals({
      incomeCents: [100000],
      savingsCents: 0,
      carryCents: 0,
      items: [item(50), item(-20)],
      essentialCategoryIds: essentials,
    });
    expect(t.expenseCents).toBe(3000);
    expect(t.availableNowCents).toBe(97000);
  });

  it("ignores card purchases in the totals and reports untracked", () => {
    const bill = item(300, { isCreditBill: true, categoryId: CARD, paid: false });
    const t = monthTotals({
      incomeCents: [100000],
      savingsCents: 0,
      carryCents: 0,
      items: [bill, item(94.6, { parentItemId: bill.id }), item(13.85, { parentItemId: bill.id })],
      essentialCategoryIds: essentials,
    });
    expect(t.expenseCents).toBe(30000);
    expect(t.endForecastCents).toBe(70000);
    expect(t.availableNowCents).toBe(100000);
    expect(t.credit[bill.id]).toEqual({
      itemId: bill.id,
      effectiveCents: 30000,
      trackedCents: 10845,
      untrackedCents: 19155,
      overTracked: false,
    });
  });

  it("grows an estimated bill to the sum of its purchases", () => {
    const bill = item(100, { isCreditBill: true, isEstimate: true, categoryId: CARD, paid: false });
    const t = monthTotals({
      incomeCents: [100000],
      savingsCents: 0,
      carryCents: 0,
      items: [bill, item(80, { parentItemId: bill.id }), item(70, { parentItemId: bill.id })],
      essentialCategoryIds: essentials,
    });
    expect(t.expenseCents).toBe(15000);
    expect(t.credit[bill.id].untrackedCents).toBe(0);
    expect(t.credit[bill.id].overTracked).toBe(false);
  });

  it("flags a confirmed bill smaller than its logged purchases", () => {
    const bill = item(100, { isCreditBill: true, categoryId: CARD });
    const t = monthTotals({
      incomeCents: [0],
      savingsCents: 0,
      carryCents: 0,
      items: [bill, item(150, { parentItemId: bill.id })],
      essentialCategoryIds: essentials,
    });
    expect(t.expenseCents).toBe(10000);
    expect(t.credit[bill.id].overTracked).toBe(true);
    expect(t.credit[bill.id].untrackedCents).toBe(-5000);
  });
});

describe("chainMonths", () => {
  const base = { incomeCents: [100000], savingsCents: 20000 };
  it("carries end forecast into the next month and honours opening balance", () => {
    const [jan, feb, mar] = chainMonths(
      [
        { year: 2026, month: 2, openingBalanceCents: null, ...base, items: [item(500)] },
        { year: 2026, month: 1, openingBalanceCents: 150000, ...base, items: [item(100)] },
        { year: 2026, month: 3, openingBalanceCents: null, ...base, items: [] },
      ],
      essentials,
    );
    expect(jan.key).toBe("2026-01");
    expect(jan.totals.carryCents).toBe(150000);
    expect(jan.totals.endForecastCents).toBe(150000 + 100000 - 20000 - 10000);
    expect(feb.totals.carryCents).toBe(jan.totals.endForecastCents);
    expect(mar.totals.carryCents).toBe(feb.totals.endForecastCents);
  });

  it("chains across a year boundary but not across a gap", () => {
    const [dec, jan, mar] = chainMonths(
      [
        { year: 2026, month: 12, openingBalanceCents: 1000, ...base, items: [] },
        { year: 2027, month: 1, openingBalanceCents: null, ...base, items: [] },
        { year: 2027, month: 3, openingBalanceCents: null, ...base, items: [] },
      ],
      essentials,
    );
    expect(jan.totals.carryCents).toBe(dec.totals.endForecastCents);
    expect(mar.totals.carryCents).toBe(0);
  });
});
