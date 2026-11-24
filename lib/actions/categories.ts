"use server";

import { z } from "zod";
import { requireUser } from "@/lib/dal/auth";
import { loadCategories } from "@/lib/dal/budget";
import { fail, run, type ActionResult } from "./run";
import { CATEGORY_ICON_KEYS } from "@/lib/category-icons";

const categoryInput = z.object({
  id: z.uuid().nullable(),
  name: z.string().trim().min(1, "Give it a name.").max(40),
  icon: z.enum(CATEGORY_ICON_KEYS),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  isEssential: z.boolean(),
  archived: z.boolean(),
});

export type CategoryInput = z.infer<typeof categoryInput>;

export async function saveCategory(input: CategoryInput): Promise<ActionResult> {
  const parsed = categoryInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const v = parsed.data;
  return run(async () => {
    const { supabase } = await requireUser();
    const row = { name: v.name, icon: v.icon, color: v.color, is_essential: v.isEssential, archived: v.archived };
    if (v.id) {
      const r = await supabase.from("categories").update(row).eq("id", v.id);
      if (r.error) throw r.error;
    } else {
      const existing = await loadCategories(supabase);
      const r = await supabase
        .from("categories")
        .insert({ ...row, sort_order: Math.max(0, ...existing.map((c) => c.sortOrder)) + 1 });
      if (r.error) throw r.error;
    }
  });
}

export async function moveCategory(categoryId: string, direction: "up" | "down"): Promise<ActionResult> {
  const id = z.uuid().parse(categoryId);
  return run(async () => {
    const { supabase } = await requireUser();
    const cats = await loadCategories(supabase);
    const idx = cats.findIndex((c) => c.id === id);
    const j = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || j < 0 || j >= cats.length) return;
    const order = cats.map((c) => c.id);
    [order[idx], order[j]] = [order[j], order[idx]];
    for (const [i, cid] of order.entries()) {
      const r = await supabase.from("categories").update({ sort_order: i + 1 }).eq("id", cid);
      if (r.error) throw r.error;
    }
  });
}
