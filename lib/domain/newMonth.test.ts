import { describe, expect, it } from "vitest";
import { monthsToCreate, planNewMonth, type BillDef } from "./newMonth";

const bill = (o: Partial<BillDef>): BillDef => ({
  id: "b",
  name: "Rent",
  defaultAmountCents: 80000,
  categoryId: "housing",
  isCreditCard: false,
  active: true,
  sortOrder: 1,
  ...o,
});

describe("planNewMonth", () => {
  it("copies recurring income, savings and active bills", () => {
    const plan = planNewMonth(
      { year: 2026, month: 12 },
      {
        savingsCents: 110000,
        income: [
          { label: "Salary", amountCents: 300000, isRecurring: true },
          { label: "Extra salary", amountCents: 250000, isRecurring: false },
        ],
      },
      [
        bill({ id: "rent", sortOrder: 2 }),
        bill({ id: "credit", name: "Credit", defaultAmountCents: 30000, isCreditCard: true, sortOrder: 1, categoryId: "card" }),
        bill({ id: "old", name: "Old gym", active: false }),
      ],
    );
    expect(plan.savingsCents).toBe(110000);
    expect(plan.income).toEqual([{ label: "Salary", amountCents: 300000, isRecurring: true }]);
    expect(plan.items.map((i) => [i.billId, i.isEstimate, i.paid, i.date])).toEqual([
      ["credit", true, false, "2026-12-01"],
      ["rent", false, false, "2026-12-01"],
    ]);
  });

  it("starts empty with no previous month", () => {
    const plan = planNewMonth({ year: 2026, month: 1 }, null, []);
    expect(plan).toMatchObject({ savingsCents: 0, income: [], items: [] });
  });
});

describe("monthsToCreate", () => {
  const existing = [
    { year: 2026, month: 10 },
    { year: 2026, month: 11 },
  ];
  it("creates nothing for an existing month", () => {
    expect(monthsToCreate(existing, { year: 2026, month: 11 })).toEqual([]);
  });
  it("creates the next month", () => {
    expect(monthsToCreate(existing, { year: 2026, month: 12 })).toEqual([{ year: 2026, month: 12 }]);
  });
  it("fills the gap when jumping ahead", () => {
    expect(monthsToCreate(existing, { year: 2027, month: 2 })).toEqual([
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
      { year: 2027, month: 2 },
    ]);
  });
  it("creates only the target before the first month", () => {
    expect(monthsToCreate(existing, { year: 2025, month: 6 })).toEqual([{ year: 2025, month: 6 }]);
  });
  it("creates only the target with no data", () => {
    expect(monthsToCreate([], { year: 2026, month: 11 })).toEqual([{ year: 2026, month: 11 }]);
  });
});
