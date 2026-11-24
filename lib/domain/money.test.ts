import { describe, expect, it } from "vitest";
import { formatCompact, formatEUR, formatOutflow, parseAmount, toCents } from "./money";

describe("parseAmount", () => {
  it("accepts comma and dot decimals", () => {
    expect(parseAmount("14,46")).toBe(1446);
    expect(parseAmount("14.46")).toBe(1446);
    expect(parseAmount("14,5")).toBe(1450);
    expect(parseAmount("14")).toBe(1400);
    expect(parseAmount(",5")).toBe(50);
  });
  it("accepts negatives for cashback", () => {
    expect(parseAmount("-20")).toBe(-2000);
    expect(parseAmount("-0,03")).toBe(-3);
  });
  it("rejects junk", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("-")).toBeNull();
    expect(parseAmount("1,2,3")).toBeNull();
    expect(parseAmount("1.234")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("formatOutflow / formatCompact", () => {
  it("signs outgoing and incoming money", () => {
    expect(formatOutflow(899)).toBe("-€8.99");
    expect(formatOutflow(-2000)).toBe("+€20.00");
    expect(formatOutflow(0)).toBe("€0.00");
  });
  it("compacts axis numbers", () => {
    expect(formatCompact(1200)).toBe("1.2K");
    expect(formatCompact(450)).toBe("450");
  });
});

describe("formatEUR / toCents", () => {
  it("formats like the spreadsheet", () => {
    expect(formatEUR(179320)).toBe("€1,793.20");
    expect(formatEUR(-2000)).toBe("-€20.00");
  });
  it("converts Postgres numerics without float drift", () => {
    expect(toCents("812.34")).toBe(81234);
    expect(toCents(0.1 + 0.2)).toBe(30);
  });
});
