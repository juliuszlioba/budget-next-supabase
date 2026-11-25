import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/dal/auth";
import { ensureMonth, getBudget, getNameMemory } from "@/lib/dal/budget";
import { compareYm, parseYm, todayIso, ymKey, ymOfDate } from "@/lib/domain/dates";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthScreen } from "./month-screen";

/**
 * Loads (creating if needed) a month and renders it. `ym` is "YYYY-MM", or null for the current month.
 * The read-only demo never creates months: outside its data it goes to the nearest month it has.
 */
export async function MonthView({ ym }: { ym: string | null }) {
  const { isDemo } = await requireUser();
  const today = todayIso();
  const current = ymOfDate(today);
  const target = ym === null ? current : parseYm(ym);
  if (!target) notFound();

  if (!isDemo) await ensureMonth(target);
  const [{ categories, bills, byKey, months }, names] = await Promise.all([getBudget(), getNameMemory()]);
  const month = byKey.get(ymKey(target));
  if (!month) {
    const nearest = isDemo && months.length ? (compareYm(target, months[0]) < 0 ? months[0] : months.at(-1)!) : null;
    if (nearest) redirect(`/month/${nearest.key}`);
    notFound();
  }

  return (
    <MonthScreen
      month={month}
      categories={categories}
      bills={bills}
      names={names}
      today={today}
      isCurrent={ymKey(target) === ymKey(current)}
      current={current}
      firstYear={months.reduce((y, m) => Math.min(y, m.year), current.year)}
      monthsWithItems={months.filter((m) => m.items.length > 0).map((m) => m.key)}
    />
  );
}

export function MonthSkeleton() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-4 lg:max-w-2xl lg:pt-8" aria-busy>
      <Skeleton className="mx-auto mb-3 h-10 w-40 rounded-full" />
      <Skeleton className="mb-3 h-40 rounded-3xl" />
      <div className="mb-5 grid grid-cols-3 gap-2">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
