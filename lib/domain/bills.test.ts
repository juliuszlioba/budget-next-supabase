import { describe, expect, it } from "vitest";
import { planBillChange, type BillItem } from "./bills";
import type { BillDef } from "./newMonth";

const internet: BillDef = {
  id: "internet",
  name: "Internet",
  defaultAmountCents: 3500,
  categoryId: "housing",
  isCreditCard: false,
  active: true,
  sortOrder: 9,
};

const nov = { year: 2026, month: 11 };
const dec = { year: 2026, month: 12 };
const jan = { year: 2027, month: 1 };
const oct = { year: 2026, month: 10 };

const bi = (id: string, m: { year: number; month: number }, o: Partial<BillItem> = {}): BillItem => ({
  id,
  billId: "internet",
  amountCents: 3500,
  paid: false,
  isEstimate: false,
  ...m,
  ...o,
});

describe("planBillChange", () => {
  it("updates unpaid, unedited items from the current month on", () => {
    const plan = planBillChange(
      internet,
      { ...internet, defaultAmountCents: 4500 },
      [
        bi("oct", oct),
        bi("nov-paid", nov, { paid: true }),
        bi("dec", dec),
        bi("jan-edited", jan, { amountCents: 4400 }),
      ],
      nov,
      [oct, nov, dec, jan],
    );
    expect(plan.update.map((u) => [u.id, u.amountCents])).toEqual([["dec", 4500]]);
    expect(plan.addTo).toEqual([]);
    expect(plan.remove).toEqual([]);
  });

  it("adds a new bill to the current and later months", () => {
    const plan = planBillChange(null, internet, [], nov, [oct, nov, dec]);
    expect(plan.addTo).toEqual([nov, dec]);
  });

  it("removes a deactivated bill from later months only", () => {
    const plan = planBillChange(
      internet,
      { ...internet, active: false },
      [bi("nov", nov), bi("dec", dec), bi("jan-edited", jan, { amountCents: 1 })],
      nov,
      [nov, dec, jan],
    );
    expect(plan.remove).toEqual(["dec"]);
    expect(plan.update).toEqual([]);
  });

  it("treats a credit bill as unedited while it is still an estimate", () => {
    const credit = { ...internet, id: "credit", isCreditCard: true, defaultAmountCents: 30000 };
    const plan = planBillChange(
      credit,
      { ...credit, defaultAmountCents: 40000 },
      [
        bi("dec-est", dec, { billId: "credit", amountCents: 30000, isEstimate: true }),
        bi("jan-real", jan, { billId: "credit", amountCents: 30000, isEstimate: false }),
      ],
      nov,
      [nov, dec, jan],
    );
    expect(plan.update.map((u) => u.id)).toEqual(["dec-est"]);
  });
});
