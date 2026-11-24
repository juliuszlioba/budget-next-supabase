/**
 * One-off import of the budget spreadsheet into the local database.
 *
 *   pnpm import:xlsx <file.xlsx> --dry-run   # writes scripts/import/category-map.json to review
 *   pnpm import:xlsx <file.xlsx>             # replaces each year found in the file and verifies the totals
 *
 * Sheets are named by month, optionally followed by the year ("January 2026", "Mai 2025").
 * Sheets without a year belong to --year.
 *
 * Options: --year 2026, --email test@email.com
 * Needs SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env.local — from `supabase status`.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import {
  MAP_FILE, categoryMapFor, forecastOf, incomeLines, readWorkbook, ym, yearsOf,
} from "./import/workbook";
import { chainMonths, type CalcItem } from "../lib/domain/totals";
import { fromCents, toCents } from "../lib/domain/money";
import { isoDate } from "../lib/domain/dates";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "dry-run": { type: "boolean", default: false },
    year: { type: "string", default: "2026" },
    email: { type: "string", default: "test@email.com" },
  },
});

const file = positionals[0];
if (!file) {
  console.error("Usage: pnpm import:xlsx <file.xlsx> [--dry-run] [--year 2026] [--email test@email.com]");
  process.exit(1);
}
const DEFAULT_YEAR = Number(values.year);

// ---------- main ----------

const sheet = await readWorkbook(file, DEFAULT_YEAR);
const years = yearsOf(sheet);
console.log(
  `Read ${sheet.length} months (${years.join(", ")}), ${sheet.reduce((a, m) => a + m.items.length, 0)} items from ${path.basename(file)}`,
);
const incomeOf = incomeLines(sheet);
const categoryMap = categoryMapFor(sheet);
const distinct = Object.keys(categoryMap);

if (values["dry-run"]) {
  writeFileSync(MAP_FILE, JSON.stringify(categoryMap, null, 2) + "\n");
  const counts: Record<string, number> = {};
  for (const c of Object.values(categoryMap)) counts[c] = (counts[c] ?? 0) + 1;
  console.log(`Wrote ${distinct.length} names to ${path.relative(process.cwd(), MAP_FILE)}`);
  console.table(counts);
  console.log("Review/edit the category of each name, then run again without --dry-run.");
  process.exit(0);
}

try {
  process.loadEnvFile(".env.local");
} catch {
  /* env may come from the shell */
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (see `supabase status`) in .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

function check(r: { error: unknown }): void {
  if (r.error) throw r.error;
}

function must<T>(r: { data: T; error: unknown }): NonNullable<T> {
  if (r.error) throw r.error;
  if (r.data === null || r.data === undefined) throw new Error("No data returned");
  return r.data;
}

const { data: users, error: usersError } = await db.auth.admin.listUsers();
if (usersError) throw usersError;
const user = users.users.find((u) => u.email === values.email);
if (!user) throw new Error(`No user ${values.email}`);
const userId = user.id;

const categories = must(await db.from("categories").select("id, name, is_essential").eq("user_id", userId));
const catId = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
const missing = [...new Set(Object.values(categoryMap))].filter((c) => !catId.has(c.toLowerCase()));
if (missing.length) throw new Error(`Unknown categories in the map: ${missing.join(", ")}`);
const bills = must(
  await db.from("bills").select("id, name, is_credit_card, sort_order").eq("user_id", userId).order("sort_order"),
);

// Replace the years in the file.
check(await db.from("months").delete().eq("user_id", userId).in("year", years));

for (const m of sheet) {
  const monthRow = must(
    await db
      .from("months")
      .insert({
        user_id: userId,
        year: m.year,
        month: m.month,
        savings: fromCents(m.savingsCents),
        opening_balance: m.openingCents === null ? null : fromCents(m.openingCents),
      })
      .select("id")
      .single(),
  );

  const income = incomeOf(m);
  check(
    await db.from("income_entries").insert(
      income.map((l, i) => ({
        user_id: userId,
        month_id: monthRow.id,
        label: l.label,
        amount: fromCents(l.cents),
        is_recurring: l.recurring,
        sort_order: i,
      })),
    ),
  );

  // Match bills by name; duplicate names (e.g. two "Electricity" lines) are matched in order.
  const unusedBills = [...bills];
  const rows = m.items.map((it) => {
    const bi = unusedBills.findIndex((b) => b.name.toLowerCase() === it.name.trim().toLowerCase());
    const bill = bi >= 0 ? unusedBills.splice(bi, 1)[0] : null;
    return {
      user_id: userId,
      month_id: monthRow.id,
      name: it.name.trim(),
      amount: fromCents(it.cents),
      category_id: catId.get(categoryMap[it.name.trim()].toLowerCase())!,
      date: isoDate(m.year, m.month, 1),
      paid: it.paid,
      is_estimate: false,
      bill_id: bill?.id ?? null,
    };
  });
  if (rows.length) check(await db.from("items").insert(rows));
}

// ---------- verify against the sheet's own totals ----------

const creditBills = new Set(bills.filter((b) => b.is_credit_card).map((b) => b.id));
const essentials = new Set(categories.filter((c) => c.is_essential).map((c) => c.id));
const stored = must(
  await db
    .from("months")
    .select("year, month, savings, opening_balance, income_entries(amount), items(id, amount, paid, category_id, is_estimate, bill_id, parent_item_id)")
    .eq("user_id", userId)
    .order("year")
    .order("month"),
);
const chained = chainMonths(
  stored.map((m) => ({
    year: m.year,
    month: m.month,
    savingsCents: toCents(m.savings),
    openingBalanceCents: m.opening_balance === null ? null : toCents(m.opening_balance),
    incomeCents: m.income_entries.map((e) => toCents(e.amount)),
    items: m.items.map(
      (it): CalcItem => ({
        id: it.id,
        amountCents: toCents(it.amount),
        paid: it.paid,
        categoryId: it.category_id,
        isEstimate: it.is_estimate,
        isCreditBill: !it.parent_item_id && !!it.bill_id && creditBills.has(it.bill_id),
        parentItemId: it.parent_item_id,
      }),
    ),
  })),
  essentials,
);

const eur = (c: number) => (c / 100).toFixed(2);
let failures = 0;
const table = sheet.map((s) => {
  const app = chained.find((c) => c.year === s.year && c.month === s.month)!.totals;
  // A sheet whose carry-over checkbox isn't on yet; the app always carries it (expected).
  const prevSheet = sheet.find((p) => ym(p) === ym(s) - 1);
  const sheetCarryOff = s.carryOff && prevSheet ? forecastOf(prevSheet) : 0;
  const dAvail = app.availableNowCents - s.availableCents - sheetCarryOff;
  const dForecast = app.endForecastCents - forecastOf(s) - sheetCarryOff;
  const ok = Math.abs(dAvail) <= 1 && Math.abs(dForecast) <= 1;
  if (!ok) failures++;
  return {
    month: `${s.year}-${String(s.month).padStart(2, "0")}`,
    "sheet available": eur(s.availableCents),
    "app available": eur(app.availableNowCents),
    "sheet forecast": s.forecastCents === null ? "—" : eur(s.forecastCents),
    "app forecast": eur(app.endForecastCents),
    note: sheetCarryOff ? `+${eur(sheetCarryOff)} carry (expected)` : "",
    ok: ok ? "✓" : "✗",
  };
});
console.table(table);
if (failures) {
  console.error(`${failures} month(s) don't match the spreadsheet.`);
  process.exit(1);
}
console.log(`Imported ${years.join(", ")}: all months match the spreadsheet.`);
