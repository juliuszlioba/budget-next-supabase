import { describe, expect, it } from "vitest";
import { collectionDate, creditBillMonthFor, firstWorkday } from "./billing";

describe("firstWorkday", () => {
  it("skips weekends", () => {
    expect(firstWorkday(2026, 11)).toBe(2); // Sun 1 Nov → Mon 2 Nov
    expect(firstWorkday(2026, 12)).toBe(1); // Tue 1 Dec
    expect(firstWorkday(2026, 8)).toBe(3); // Sat 1 Aug → Mon 3 Aug
  });
});

describe("creditBillMonthFor", () => {
  it("puts a mid-month purchase into next month's bill", () => {
    expect(creditBillMonthFor("2026-11-15")).toEqual({ year: 2026, month: 12 });
  });
  it("puts a purchase before the clearing day into the same month's bill", () => {
    expect(creditBillMonthFor("2026-11-01")).toEqual({ year: 2026, month: 11 });
  });
  it("puts a purchase on the clearing day into next month's bill", () => {
    expect(creditBillMonthFor("2026-11-02")).toEqual({ year: 2026, month: 12 });
  });
  it("rolls over the year", () => {
    expect(creditBillMonthFor("2026-12-20")).toEqual({ year: 2027, month: 1 });
  });
});

describe("collectionDate", () => {
  it("is the 10th on a weekday", () => {
    expect(collectionDate(2026, 12)).toBe("2026-12-10");
  });
  it("moves to the next workday when the 10th is a weekend", () => {
    expect(collectionDate(2026, 10)).toBe("2026-10-12"); // Sat 10 Oct 2026
    expect(collectionDate(2027, 1)).toBe("2027-01-11"); // Sun 10 Jan 2027
  });
});
