/** Money is handled as integer cents everywhere in TypeScript. */

const AMOUNT_RE = /^-?\d{0,9}([.,]\d{0,2})?$/;

/** Parses user input like "14,46", "14.46", "-20", ",5" into cents. Returns null for junk. */
export function parseAmount(input: string): number | null {
  const s = input.replace(/\s|€/g, "");
  if (s === "" || s === "-" || !AMOUNT_RE.test(s)) return null;
  const negative = s.startsWith("-");
  const [whole, frac = ""] = s.replace("-", "").split(/[.,]/);
  if (whole === "" && frac === "") return null;
  const cents = Number(whole || "0") * 100 + Number(frac.padEnd(2, "0") || "0");
  return negative ? -cents : cents;
}

/** Converts a numeric value from Postgres (number or string) into cents. */
export function toCents(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Math.round(Number(value) * 100);
}

/** Converts cents into a plain decimal number for writing to Postgres. */
export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

const eur = new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" });
const eurWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/** €1,793.20 / -€20.00 */
export function formatEUR(cents: number): string {
  return eur.format(cents / 100);
}

const eurSigned = new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", signDisplay: "exceptZero" });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** An item amount as money leaving (-€8.99) or coming back (+€20.00). */
export function formatOutflow(cents: number): string {
  return eurSigned.format(-cents / 100);
}

/** 1.2K style numbers for chart axes. */
export function formatCompact(value: number): string {
  return compact.format(value);
}

/** €1,793 (for compact figures and chart axes) */
export function formatEURWhole(cents: number): string {
  return eurWhole.format(cents / 100);
}

/** 1,793.20 without the currency sign (for list rows). */
export function formatPlain(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
