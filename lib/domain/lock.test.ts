import { describe, expect, it } from "vitest";
import { isLockedMonth, isMonthReadOnly } from "./lock";

describe("isLockedMonth", () => {
  const today = "2026-11-25";
  it("keeps this month, last month and future months open", () => {
    expect(isLockedMonth({ year: 2026, month: 11 }, today)).toBe(false);
    expect(isLockedMonth({ year: 2026, month: 10 }, today)).toBe(false);
    expect(isLockedMonth({ year: 2027, month: 1 }, today)).toBe(false);
  });
  it("locks two months back and older", () => {
    expect(isLockedMonth({ year: 2026, month: 9 }, today)).toBe(true);
    expect(isLockedMonth({ year: 2025, month: 12 }, today)).toBe(true);
  });
  it("handles the year boundary", () => {
    expect(isLockedMonth({ year: 2025, month: 12 }, "2026-01-01")).toBe(false);
    expect(isLockedMonth({ year: 2025, month: 11 }, "2026-01-31")).toBe(true);
  });
});

describe("isMonthReadOnly", () => {
  it("lets the unlocked month through, and only that one", () => {
    expect(isMonthReadOnly({ year: 2026, month: 9 }, "2026-11-25", "2026-09")).toBe(false);
    expect(isMonthReadOnly({ year: 2026, month: 8 }, "2026-11-25", "2026-09")).toBe(true);
    expect(isMonthReadOnly({ year: 2026, month: 8 }, "2026-11-25", null)).toBe(true);
  });
});
