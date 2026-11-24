import { describe, expect, it } from "vitest";
import { monthName, monthShort, shortDate } from "./dates";

describe("date labels", () => {
  it("formats months and short dates", () => {
    expect(monthName(11)).toBe("November");
    expect(monthShort(9)).toBe("Sep");
    expect(shortDate("2026-11-24")).toBe("24 Nov");
  });
});
