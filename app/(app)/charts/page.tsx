import { Suspense } from "react";
import { getBudget } from "@/lib/dal/budget";
import { yearSeries, yearSummary } from "@/lib/domain/charts";
import { todayIso } from "@/lib/domain/dates";
import { ChartsScreen } from "@/components/charts/charts-screen";
import { Skeleton } from "@/components/ui/skeleton";

async function Charts({ searchParams }: { searchParams: PageProps<"/charts">["searchParams"] }) {
  const { categories, months: allMonths } = await getBudget();
  const today = todayIso();
  const thisYear = Number(today.slice(0, 4));
  const thisMonth = Number(today.slice(5, 7));
  // Future months are only plans, so charts show what has happened up to this month.
  const months = allMonths.filter((m) => m.year < thisYear || (m.year === thisYear && m.month <= thisMonth));
  const years = [...new Set([...months.map((m) => m.year), thisYear])].sort();
  const requested = Number((await searchParams).year);
  const year = years.includes(requested) ? requested : thisYear;

  const points = yearSeries(months.filter((m) => m.year === year));
  return (
    <ChartsScreen
      year={year}
      years={years}
      points={points}
      summary={yearSummary(points)}
      categories={categories}
    />
  );
}

export default function ChartsPage({ searchParams }: PageProps<"/charts">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-xl px-4 pt-6 lg:max-w-6xl lg:px-8 lg:pt-9">
          <Skeleton className="mb-5 h-10 w-48" />
          <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-18 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-80 rounded-3xl" />
            <Skeleton className="h-80 rounded-3xl" />
          </div>
        </div>
      }
    >
      <Charts searchParams={searchParams} />
    </Suspense>
  );
}
