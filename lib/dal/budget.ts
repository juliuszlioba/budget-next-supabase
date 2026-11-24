import "server-only";

import { cache } from "react";
import { requireUser, type Db } from "./auth";
import type { Bill, Category, IncomeEntry, Item, Month, MonthData, NameMemory } from "./types";
import { chainMonths } from "@/lib/domain/totals";
import { compareYm, ymKey, type YM } from "@/lib/domain/dates";
import { fromCents, toCents } from "@/lib/domain/money";
import { monthsToCreate, planNewMonth } from "@/lib/domain/newMonth";

export async function loadCategories(db: Db): Promise<Category[]> {
  const { data, error } = await db.from("categories").select("*").order("sort_order").order("name");
  if (error) throw error;
  return data.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    isEssential: c.is_essential,
    sortOrder: c.sort_order,
    archived: c.archived,
  }));
}

export async function loadBills(db: Db): Promise<Bill[]> {
  const { data, error } = await db.from("bills").select("*").order("sort_order").order("name");
  if (error) throw error;
  return data.map((b) => ({
    id: b.id,
    name: b.name,
    defaultAmountCents: toCents(b.default_amount),
    categoryId: b.category_id,
    isCreditCard: b.is_credit_card,
    active: b.active,
    sortOrder: b.sort_order,
  }));
}

async function loadMonths(db: Db, creditBillIds: Set<string>): Promise<MonthData[]> {
  const { data, error } = await db
    .from("months")
    .select("*, income_entries(*), items(*)")
    .order("year")
    .order("month");
  if (error) throw error;

  return data.map((m) => {
    const items: Item[] = m.items
      .map((it) => ({
        id: it.id,
        monthId: it.month_id,
        name: it.name,
        amountCents: toCents(it.amount),
        categoryId: it.category_id,
        date: it.date,
        paid: it.paid,
        isEstimate: it.is_estimate,
        billId: it.bill_id,
        parentItemId: it.parent_item_id,
        createdAt: it.created_at,
        isCreditBill: !it.parent_item_id && !!it.bill_id && creditBillIds.has(it.bill_id),
      }))
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    const income: IncomeEntry[] = m.income_entries
      .map((e) => ({
        id: e.id,
        label: e.label,
        amountCents: toCents(e.amount),
        isRecurring: e.is_recurring,
        sortOrder: e.sort_order,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return {
      id: m.id,
      year: m.year,
      month: m.month,
      savingsCents: toCents(m.savings),
      openingBalanceCents: m.opening_balance === null ? null : toCents(m.opening_balance),
      income,
      incomeCents: income.map((e) => e.amountCents),
      items,
    };
  });
}

export type Budget = {
  categories: Category[];
  bills: Bill[];
  months: Month[];
  byKey: Map<string, Month>;
};

/** Everything for the logged-in user, with carry-over chained across all months. Memoised per request. */
export const getBudget = cache(async (): Promise<Budget> => {
  const { supabase } = await requireUser();
  const [categories, bills] = await Promise.all([loadCategories(supabase), loadBills(supabase)]);
  const creditBillIds = new Set(bills.filter((b) => b.isCreditCard).map((b) => b.id));
  const monthData = await loadMonths(supabase, creditBillIds);
  const essentials = new Set(categories.filter((c) => c.isEssential).map((c) => c.id));
  const months = chainMonths(monthData, essentials);
  return { categories, bills, months, byKey: new Map(months.map((m) => [m.key, m])) };
});

/**
 * Makes sure `target` exists, creating any months in between. Safe to call repeatedly:
 * a concurrent duplicate insert is ignored thanks to the unique (user, year, month) constraint.
 * Returns the id of the target month.
 */
export async function ensureMonth(target: YM): Promise<string> {
  const { supabase } = await requireUser();

  const existingMonth = await supabase
    .from("months")
    .select("id")
    .eq("year", target.year)
    .eq("month", target.month)
    .maybeSingle();
  if (existingMonth.error) throw existingMonth.error;
  if (existingMonth.data) return existingMonth.data.id;

  const [{ data: all, error }, bills] = await Promise.all([
    supabase.from("months").select("id, year, month, savings, income_entries(label, amount, is_recurring)"),
    loadBills(supabase),
  ]);
  if (error) throw error;

  const existing = all.map((m) => ({ year: m.year, month: m.month }));
  const toCreate = monthsToCreate(existing, target);
  const beforeAll = existing.length > 0 && existing.every((m) => compareYm(target, m) < 0);

  const latestBefore = all
    .filter((m) => compareYm(m, target) < 0)
    .sort(compareYm)
    .at(-1);
  let prev = latestBefore
    ? {
        savingsCents: toCents(latestBefore.savings),
        income: latestBefore.income_entries.map((e) => ({
          label: e.label,
          amountCents: toCents(e.amount),
          isRecurring: e.is_recurring,
        })),
      }
    : null;

  let targetId: string | null = null;
  for (const ym of toCreate) {
    // An older month before all existing data starts empty and doesn't take bills.
    const plan = planNewMonth(ym, prev, beforeAll ? [] : bills);
    const inserted = await supabase
      .from("months")
      .upsert(
        { year: ym.year, month: ym.month, savings: fromCents(plan.savingsCents) },
        { onConflict: "user_id,year,month", ignoreDuplicates: true },
      )
      .select("id");
    if (inserted.error) throw inserted.error;
    const monthId = inserted.data[0]?.id;

    if (monthId) {
      if (plan.income.length) {
        const r = await supabase.from("income_entries").insert(
          plan.income.map((l, i) => ({
            month_id: monthId,
            label: l.label,
            amount: fromCents(l.amountCents),
            is_recurring: l.isRecurring,
            sort_order: i,
          })),
        );
        if (r.error) throw r.error;
      }
      if (plan.items.length) {
        const r = await supabase.from("items").insert(
          plan.items.map((it) => ({
            month_id: monthId,
            name: it.name,
            amount: fromCents(it.amountCents),
            category_id: it.categoryId,
            date: it.date,
            paid: it.paid,
            is_estimate: it.isEstimate,
            bill_id: it.billId,
          })),
        );
        if (r.error) throw r.error;
      }
    }
    if (ymKey(ym) === ymKey(target)) targetId = monthId ?? null;
    prev = { savingsCents: plan.savingsCents, income: plan.income };
  }

  if (targetId) return targetId;
  // Someone else created it concurrently.
  const again = await supabase
    .from("months")
    .select("id")
    .eq("year", target.year)
    .eq("month", target.month)
    .single();
  if (again.error) throw again.error;
  return again.data.id;
}

/** Item names used before, most recent first, with their last category and amount. */
export const getNameMemory = cache(async (): Promise<NameMemory[]> => {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("items")
    .select("name, category_id, amount, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  const seen = new Set<string>();
  const out: NameMemory[] = [];
  for (const it of data) {
    const key = it.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: it.name.trim(), categoryId: it.category_id, amountCents: toCents(it.amount) });
  }
  return out;
});
