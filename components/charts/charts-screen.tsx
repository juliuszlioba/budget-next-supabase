"use client";

import Link from "next/link";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { Category } from "@/lib/dal/types";
import { CREDIT_UNTRACKED, type YearPoint, type YearSummary } from "@/lib/domain/charts";
import { monthName, monthShort } from "@/lib/domain/dates";
import { formatCompact, formatEUR, formatEURWhole } from "@/lib/domain/money";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { CategorySpend, UNTRACKED_COLOR } from "@/components/category-spend";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

type Props = {
  year: number;
  years: number[];
  points: YearPoint[];
  summary: YearSummary;
  categories: Category[];
};

const euros = (cents: number) => Math.round(cents) / 100;
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 });

type TooltipRow = { value?: unknown; color?: string; dataKey?: unknown };

function MoneyTooltip({
  active,
  payload,
  label,
  config,
  showTotal,
}: {
  active?: boolean;
  payload?: TooltipRow[];
  label?: string | number;
  config: ChartConfig;
  showTotal?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => typeof p.value === "number" && p.value !== 0);
  const total = rows.reduce((a, p) => a + (p.value as number), 0);
  return (
    <div className="min-w-44 rounded-2xl bg-popover px-3.5 py-2.5 text-xs shadow-xl shadow-black/30 ring-1 ring-border">
      <p className="mb-1 font-medium">{label}</p>
      {rows.map((p) => {
        const key = String(p.dataKey);
        return (
          <div key={key} className="flex items-center gap-2 py-0.5">
            <i className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: p.color }} />
            <span className="flex-1 text-muted-foreground">{config[key]?.label ?? key}</span>
            <span className="tabular font-medium">{formatEUR(Math.round((p.value as number) * 100))}</span>
          </div>
        );
      })}
      {showTotal && rows.length > 1 && (
        <div className="mt-1 flex justify-between border-t pt-1 font-medium">
          <span>Total</span>
          <span className="tabular">{formatEUR(Math.round(total * 100))}</span>
        </div>
      )}
    </div>
  );
}

/** Colour key shown on the right of a section heading, like the totals on the month screen. */
function Key({ config, keys }: { config: ChartConfig; keys: string[] }) {
  return (
    <span className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {keys.map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <i className="size-2.5 rounded-[3px]" style={{ backgroundColor: config[k].color }} />
          {config[k].label}
        </span>
      ))}
    </span>
  );
}

function Section({
  title,
  aside,
  className,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-4 px-1">
        <h2 className="shrink-0 text-lg font-semibold tracking-tight">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** One figure in a plain row split by thin lines (same as the month screen). */
function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 first:pl-0 last:pr-0">
      <span className="eyebrow block">{label}</span>
      <span className="tabular mt-0.5 block text-xl font-semibold tracking-tight">{value}</span>
    </div>
  );
}

export function ChartsScreen({ year, years, points, summary, categories }: Props) {
  const allMonths = Array.from({ length: 12 }, (_, i) => i + 1);
  const byMonth = new Map(points.map((p) => [p.month, p]));
  const catById = new Map(categories.map((c) => [c.id, c]));

  // Savings: the hero
  const savingsConfig = { cumulative: { label: "Saved so far", color: "var(--primary)" } } satisfies ChartConfig;
  const savingsData = points.map((p) => ({ label: monthShort(p.month), cumulative: euros(p.cumulativeSavingsCents) }));
  const best = points.reduce<YearPoint | null>((b, p) => (!b || p.savingsCents > b.savingsCents ? p : b), null);
  const avgSaved = points.length ? summary.savingsCents / points.length : 0;

  // Income vs savings vs spent per month
  const flowConfig = {
    income: { label: "Income", color: "var(--chart-1)" },
    savings: { label: "Saved", color: "var(--chart-2)" },
    spent: { label: "Spent", color: "var(--chart-3)" },
  } satisfies ChartConfig;
  const flowData = allMonths.map((m) => {
    const p = byMonth.get(m);
    return {
      label: monthShort(m),
      income: p ? euros(p.incomeCents) : 0,
      savings: p ? euros(p.savingsCents) : 0,
      spent: p ? euros(p.spentCents) : 0,
    };
  });

  // Spending per month by category
  const yearByCategory: Record<string, number> = {};
  for (const p of points) {
    for (const [k, c] of Object.entries(p.byCategory)) yearByCategory[k] = (yearByCategory[k] ?? 0) + c;
  }
  const catKeys = Object.entries(yearByCategory)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
  const catConfig: ChartConfig = Object.fromEntries(
    catKeys.map((k) => [
      k,
      k === CREDIT_UNTRACKED
        ? { label: "Card, untracked", color: UNTRACKED_COLOR }
        : { label: catById.get(k)?.name ?? "Other", color: catById.get(k)?.color ?? "#8e8c87" },
    ]),
  );
  const catData = allMonths.map((m) => {
    const p = byMonth.get(m);
    return {
      label: monthShort(m),
      ...Object.fromEntries(catKeys.map((k) => [k, p ? euros(p.byCategory[k] ?? 0) : 0])),
    };
  });

  const axis = { tickLine: false, axisLine: false, fontSize: 11 } as const;

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-4 lg:max-w-5xl lg:px-8 lg:pt-8">
      <PageHeader title="Charts" subtitle={points.length ? `${points.length} months of ${year}` : `No data for ${year} yet`}>
        <nav className="flex gap-1 rounded-full bg-card p-1 ring-1 ring-border" aria-label="Year">
          {years.map((y) => (
            <Link
              key={y}
              href={`/charts?year=${y}`}
              aria-current={y === year ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium",
                y === year ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {y}
            </Link>
          ))}
        </nav>
      </PageHeader>

      {points.length === 0 ? (
        <p className="rounded-3xl bg-card px-5 py-12 text-center text-sm text-muted-foreground ring-1 ring-border">
          Add items to a month in {year} and the charts fill in here.
        </p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-x-12">
          {/* Full width on desktop: the year at a glance, above the savings card and the side column. */}
          <Section className="min-w-0 lg:col-span-2" title="Income and spending" aside={<Key config={flowConfig} keys={["income", "savings", "spent"]} />}>
            <ChartContainer config={flowConfig} className="aspect-auto h-60 w-full lg:h-72">
              <BarChart data={flowData} barGap={2} margin={{ left: -12, right: 4 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" {...axis} interval={0} />
                <YAxis {...axis} tickFormatter={formatCompact} width={44} />
                <ChartTooltip cursor={{ fillOpacity: 0.3 }} content={<MoneyTooltip config={flowConfig} />} />
                <Bar dataKey="income" fill="var(--color-income)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="savings" fill="var(--color-savings)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="spent" fill="var(--color-spent)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </Section>

          <div className="flex min-w-0 flex-col gap-8">
            {/* Hero: savings, styled like the month's balance card */}
            <section className="rounded-3xl bg-hero p-5 text-hero-foreground shadow-xl shadow-black/20 ring-1 ring-white/5 lg:p-6">
              <p className="text-sm opacity-80">Saved in {year}</p>
              <p className="tabular mt-1 text-[2.6rem] leading-none font-semibold tracking-tight">
                {formatEUR(summary.savingsCents)}
              </p>
              <p className="mt-2 text-xs opacity-60">
                {summary.savingsRate === null
                  ? "No income recorded yet"
                  : `${percent.format(summary.savingsRate)} of your ${formatEURWhole(summary.incomeCents)} income`}
              </p>

              <ChartContainer config={savingsConfig} className="mt-4 aspect-auto h-32 w-full">
                <AreaChart data={savingsData} margin={{ left: 0, right: 0, top: 6, bottom: 0 }}>
                  <defs>
                    <linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-cumulative)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--color-cumulative)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
                  <ChartTooltip content={<MoneyTooltip config={savingsConfig} />} />
                  <Area dataKey="cumulative" type="monotone" stroke="var(--color-cumulative)" strokeWidth={2.5} fill="url(#savingsFill)" />
                </AreaChart>
              </ChartContainer>

              <div className="mt-4 grid grid-cols-2">
                <div className="pr-4">
                  <p className="flex items-center gap-1.5 text-xs opacity-70">
                    <i className="size-1.5 rounded-full bg-hero-foreground" /> Average a month
                  </p>
                  <p className="tabular mt-1 text-xl font-medium">{formatEURWhole(avgSaved)}</p>
                </div>
                <div className="border-l border-white/10 pl-4">
                  <p className="flex items-center gap-1.5 text-xs opacity-70">
                    <i className="size-1.5 rounded-full bg-primary" /> Best month{best ? `, ${monthName(best.month)}` : ""}
                  </p>
                  <p className="tabular mt-1 text-xl font-medium">{best ? formatEURWhole(best.savingsCents) : "–"}</p>
                </div>
              </div>
            </section>
            <Section
              title="Spending by month"
              aside={<span className="text-right text-xs text-muted-foreground">Card purchases count when their bill is paid</span>}
            >
              <ChartContainer config={catConfig} className="aspect-auto h-72 w-full">
                <BarChart data={catData} margin={{ left: -12, right: 4 }} stackOffset="sign">
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" {...axis} interval={0} />
                  <YAxis {...axis} tickFormatter={formatCompact} width={44} />
                  <ChartTooltip cursor={{ fillOpacity: 0.3 }} content={<MoneyTooltip config={catConfig} showTotal />} />
                  {catKeys.map((k) => (
                    <Bar key={k} dataKey={k} stackId="spend" fill={catConfig[k].color} />
                  ))}
                </BarChart>
              </ChartContainer>
            </Section>
          </div>

          <aside className="flex min-w-0 flex-col gap-8 lg:sticky lg:top-8">
            <div className="grid grid-cols-3 divide-x divide-border px-1 py-1">
              <Figure label="Income" value={formatEURWhole(summary.incomeCents)} />
              <Figure label="Spent" value={formatEURWhole(summary.spentCents)} />
              <Figure label="Essentials" value={formatEURWhole(summary.essentialsCents)} />
            </div>
            <CategorySpend byCategory={yearByCategory} catById={catById} title={`Spending in ${year}`} />
          </aside>
        </div>
      )}
    </div>
  );
}
