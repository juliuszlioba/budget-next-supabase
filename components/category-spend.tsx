"use client";

import { useId } from "react";
import type { Category } from "@/lib/dal/types";
import { CREDIT_UNTRACKED } from "@/lib/domain/charts";
import { formatEUR } from "@/lib/domain/money";

export const UNTRACKED_COLOR = "#5f5d59";

/**
 * Where the money went: one strip split by category share, then a plain list
 * (colour key, share, amount) on the page itself, no card.
 */
export function CategorySpend({
  byCategory,
  catById,
  title = "Spending by category",
  emptyText = "Nothing spent yet.",
}: {
  byCategory: Record<string, number>;
  catById: Map<string, Category>;
  title?: string;
  emptyText?: string;
}) {
  const rows = Object.entries(byCategory)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, cents]) => {
      const cat = catById.get(key);
      return {
        key,
        cents,
        label: key === CREDIT_UNTRACKED ? "Card, untracked" : (cat?.name ?? "Other"),
        color: key === CREDIT_UNTRACKED ? UNTRACKED_COLOR : (cat?.color ?? "#8e8c87"),
      };
    });
  const total = rows.reduce((a, r) => a + r.cents, 0);
  const headingId = useId();
  const pct = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 });

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 id={headingId} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {total > 0 && <span className="tabular text-sm text-muted-foreground">{formatEUR(total)}</span>}
      </div>
      {rows.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <>
          <div className="mx-1 mb-1 flex h-2.5 gap-0.5" aria-hidden>
            {rows.map((r) => (
              <span
                key={r.key}
                className="min-w-1 rounded-[3px]"
                style={{ flexGrow: r.cents, flexBasis: 0, backgroundColor: r.color }}
              />
            ))}
          </div>
          <ul className="divide-y divide-border px-1">
            {rows.map((r) => (
              <li key={r.key} className="grid grid-cols-[0.625rem_minmax(0,1fr)_auto_5.5rem] items-center gap-2.5 py-2.5 text-sm">
                <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: r.color }} aria-hidden />
                <span className="truncate">{r.label}</span>
                <span className="tabular text-xs text-muted-foreground">{pct.format(r.cents / total)}</span>
                <span className="tabular text-right font-semibold">{formatEUR(r.cents)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
