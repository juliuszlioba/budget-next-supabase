"use server";

import { z } from "zod";
import { requireUser, type Db } from "@/lib/dal/auth";
import { fail, run, type ActionResult } from "./run";
import { ensureMonth } from "@/lib/dal/budget";
import { creditBillMonthFor } from "@/lib/domain/billing";
import { isIsoDate, isoDate, ymKey, ymOfDate, type YM } from "@/lib/domain/dates";
import { fromCents } from "@/lib/domain/money";


const cents = z.number().int().min(-99_999_999).max(99_999_999);
const isoDateSchema = z.string().refine(isIsoDate, "Invalid date");
const ymSchema = z.object({ year: z.number().int().min(2000).max(2100), month: z.number().int().min(1).max(12) });

/** Finds (or creates) the Credit bill item of a month. Returns its id and the month id. */
async function creditBillItemFor(db: Db, ym: YM): Promise<{ itemId: string; monthId: string }> {
  const monthId = await ensureMonth(ym);
  const { data: bill, error: billErr } = await db
    .from("bills")
    .select("id, name, default_amount, category_id")
    .eq("is_credit_card", true)
    .eq("active", true)
    .maybeSingle();
  if (billErr) throw billErr;
  if (!bill) throw new Error("No active credit-card bill. Add one on the Bills page.");

  const existing = await db
    .from("items")
    .select("id")
    .eq("month_id", monthId)
    .eq("bill_id", bill.id)
    .is("parent_item_id", null)
    .limit(1)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return { itemId: existing.data.id, monthId };

  const created = await db
    .from("items")
    .insert({
      month_id: monthId,
      name: bill.name,
      amount: bill.default_amount,
      category_id: bill.category_id,
      date: isoDate(ym.year, ym.month, 1),
      paid: false,
      is_estimate: true,
      bill_id: bill.id,
    })
    .select("id")
    .single();
  if (created.error) throw created.error;
  return { itemId: created.data.id, monthId };
}


export async function setPaid(itemId: string, paid: boolean): Promise<ActionResult> {
  const id = z.uuid().parse(itemId);
  return run(async () => {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("items").update({ paid: Boolean(paid) }).eq("id", id);
    if (error) throw error;
  });
}

const itemInput = z.object({
  name: z.string().trim().min(1, "Give it a name.").max(120),
  amountCents: cents,
  categoryId: z.uuid(),
  date: isoDateSchema,
  paid: z.boolean(),
  onCard: z.boolean(),
  /** Card purchases only: put it into this month's bill instead of the computed one. */
  billMonth: ymSchema.nullable().optional(),
});

export type ItemInput = z.infer<typeof itemInput>;

export async function createItem(input: ItemInput): Promise<ActionResult> {
  const parsed = itemInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const v = parsed.data;
  return run(async () => {
    const { supabase } = await requireUser();
    if (v.onCard) {
      const { itemId, monthId } = await creditBillItemFor(supabase, v.billMonth ?? creditBillMonthFor(v.date));
      const { error } = await supabase.from("items").insert({
        month_id: monthId,
        parent_item_id: itemId,
        name: v.name,
        amount: fromCents(v.amountCents),
        category_id: v.categoryId,
        date: v.date,
        paid: true,
      });
      if (error) throw error;
    } else {
      const monthId = await ensureMonth(ymOfDate(v.date));
      const { error } = await supabase.from("items").insert({
        month_id: monthId,
        name: v.name,
        amount: fromCents(v.amountCents),
        category_id: v.categoryId,
        date: v.date,
        paid: v.paid,
      });
      if (error) throw error;
    }
  });
}

export async function updateItem(itemId: string, input: ItemInput): Promise<ActionResult> {
  const id = z.uuid().safeParse(itemId);
  const parsed = itemInput.safeParse(input);
  if (!id.success) return fail("Unknown item.");
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const v = parsed.data;
  return run(async () => {
    const { supabase } = await requireUser();
    const { data: current, error } = await supabase
      .from("items")
      .select("id, amount, bill_id, parent_item_id, is_estimate, months!inner(year, month)")
      .eq("id", id.data)
      .single();
    if (error) throw error;
    const children = await supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("parent_item_id", id.data);
    if (children.error) throw children.error;
    const hasChildren = children.count ?? 0;

    // A card bill stays in its month: its purchases are stored in that month, and a month has one card bill.
    let isCardBill = hasChildren > 0;
    if (!isCardBill && current.bill_id && !current.parent_item_id) {
      const bill = await supabase.from("bills").select("is_credit_card").eq("id", current.bill_id).maybeSingle();
      if (bill.error) throw bill.error;
      isCardBill = !!bill.data?.is_credit_card;
    }
    if (isCardBill && ymKey(ymOfDate(v.date)) !== ymKey(current.months)) {
      throw new Error("A card bill can't move to another month. Pick a date in its own month.");
    }

    const base = {
      name: v.name,
      amount: fromCents(v.amountCents),
      category_id: v.categoryId,
      date: v.date,
    };

    if (v.onCard && !hasChildren) {
      // A card purchase (new or moved onto the card): attach to the right bill.
      const { itemId: parent, monthId } = await creditBillItemFor(
        supabase,
        v.billMonth ?? creditBillMonthFor(v.date),
      );
      if (parent === id.data) throw new Error("A bill can't be a purchase on itself.");
      const r = await supabase
        .from("items")
        .update({ ...base, month_id: monthId, parent_item_id: parent, paid: true, bill_id: null, is_estimate: false })
        .eq("id", id.data);
      if (r.error) throw r.error;
      return;
    }

    const monthId = await ensureMonth(ymOfDate(v.date));
    // Typing a new amount on an estimated bill confirms it (the real statement figure).
    const amountChanged = Math.round(Number(current.amount) * 100) !== v.amountCents;
    const r = await supabase
      .from("items")
      .update({
        ...base,
        month_id: monthId,
        parent_item_id: null,
        paid: v.paid,
        is_estimate: current.is_estimate && !amountChanged,
      })
      .eq("id", id.data);
    if (r.error) throw r.error;
  });
}

export async function deleteItem(itemId: string): Promise<ActionResult> {
  const id = z.uuid().parse(itemId);
  return run(async () => {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) throw error;
  });
}

const incomeLine = z.object({
  label: z.string().trim().min(1).max(60),
  amountCents: cents,
  isRecurring: z.boolean(),
});

const monthMetaInput = z.object({
  monthId: z.uuid(),
  savingsCents: cents,
  income: z.array(incomeLine).max(20),
});

export async function updateMonthMeta(input: z.infer<typeof monthMetaInput>): Promise<ActionResult> {
  const parsed = monthMetaInput.safeParse(input);
  if (!parsed.success) return fail("Check the amounts and labels.");
  const v = parsed.data;
  return run(async () => {
    const { supabase } = await requireUser();
    const m = await supabase.from("months").update({ savings: fromCents(v.savingsCents) }).eq("id", v.monthId);
    if (m.error) throw m.error;
    const del = await supabase.from("income_entries").delete().eq("month_id", v.monthId);
    if (del.error) throw del.error;
    if (v.income.length) {
      const ins = await supabase.from("income_entries").insert(
        v.income.map((l, i) => ({
          month_id: v.monthId,
          label: l.label,
          amount: fromCents(l.amountCents),
          is_recurring: l.isRecurring,
          sort_order: i,
        })),
      );
      if (ins.error) throw ins.error;
    }
  });
}
