"use server";

import { z } from "zod";
import { requireUser } from "@/lib/dal/auth";
import { loadBills } from "@/lib/dal/budget";
import { planBillChange } from "@/lib/domain/bills";
import { isoDate, todayIso, ymOfDate } from "@/lib/domain/dates";
import { fromCents, toCents } from "@/lib/domain/money";
import type { BillDef } from "@/lib/domain/newMonth";
import { run, type ActionResult } from "./run";

const billInput = z.object({
  id: z.uuid().nullable(),
  name: z.string().trim().min(1, "Give it a name.").max(120),
  amountCents: z.number().int().min(0).max(99_999_999),
  categoryId: z.uuid(),
  active: z.boolean(),
});

export type BillInput = z.infer<typeof billInput>;


/** Creates or updates a regular bill and carries the change into this and later months. */
export async function saveBill(input: BillInput): Promise<ActionResult> {
  const parsed = billInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  return run(async () => {
    const { supabase } = await requireUser();
    const bills = await loadBills(supabase);
    const before: BillDef | null = v.id ? (bills.find((b) => b.id === v.id) ?? null) : null;
    if (v.id && !before) throw new Error("Unknown bill.");

    let id = v.id;
    if (id) {
      const r = await supabase
        .from("bills")
        .update({ name: v.name, default_amount: fromCents(v.amountCents), category_id: v.categoryId, active: v.active })
        .eq("id", id);
      if (r.error) throw r.error;
    } else {
      const r = await supabase
        .from("bills")
        .insert({
          name: v.name,
          default_amount: fromCents(v.amountCents),
          category_id: v.categoryId,
          active: v.active,
          sort_order: Math.max(0, ...bills.map((b) => b.sortOrder)) + 1,
        })
        .select("id")
        .single();
      if (r.error) throw r.error;
      id = r.data.id;
    }

    const after: BillDef = {
      id,
      name: v.name,
      defaultAmountCents: v.amountCents,
      categoryId: v.categoryId,
      isCreditCard: before?.isCreditCard ?? false,
      active: v.active,
      sortOrder: before?.sortOrder ?? 0,
    };

    const [{ data: months, error: mErr }, { data: items, error: iErr }] = await Promise.all([
      supabase.from("months").select("id, year, month"),
      supabase
        .from("items")
        .select("id, bill_id, amount, paid, is_estimate, months!inner(year, month)")
        .eq("bill_id", id)
        .is("parent_item_id", null),
    ]);
    if (mErr) throw mErr;
    if (iErr) throw iErr;

    const plan = planBillChange(
      before,
      after,
      items.map((it) => ({
        id: it.id,
        billId: it.bill_id!,
        amountCents: toCents(it.amount),
        paid: it.paid,
        isEstimate: it.is_estimate,
        year: it.months.year,
        month: it.months.month,
      })),
      ymOfDate(todayIso()),
      months,
    );

    for (const u of plan.update) {
      const r = await supabase
        .from("items")
        .update({ name: u.name, amount: fromCents(u.amountCents), category_id: u.categoryId })
        .eq("id", u.id);
      if (r.error) throw r.error;
    }
    if (plan.remove.length) {
      const r = await supabase.from("items").delete().in("id", plan.remove);
      if (r.error) throw r.error;
    }
    if (plan.addTo.length) {
      const monthId = new Map(months.map((m) => [`${m.year}-${m.month}`, m.id]));
      const r = await supabase.from("items").insert(
        plan.addTo.map((m) => ({
          month_id: monthId.get(`${m.year}-${m.month}`)!,
          name: after.name,
          amount: fromCents(after.defaultAmountCents),
          category_id: after.categoryId,
          date: isoDate(m.year, m.month, 1),
          paid: false,
          is_estimate: after.isCreditCard,
          bill_id: id,
        })),
      );
      if (r.error) throw r.error;
    }
  });
}

/** Swaps a bill with its neighbour in the list. */
export async function moveBill(billId: string, direction: "up" | "down"): Promise<ActionResult> {
  const id = z.uuid().parse(billId);
  return run(async () => {
    const { supabase } = await requireUser();
    const bills = await loadBills(supabase);
    const idx = bills.findIndex((b) => b.id === id);
    const other = bills[direction === "up" ? idx - 1 : idx + 1];
    if (idx < 0 || !other) return;
    // Normalise order first so equal sort_order values can't get stuck.
    const order = bills.map((b) => b.id);
    [order[idx], order[bills.indexOf(other)]] = [other.id, id];
    for (const [i, bid] of order.entries()) {
      const r = await supabase.from("bills").update({ sort_order: i + 1 }).eq("id", bid);
      if (r.error) throw r.error;
    }
  });
}
