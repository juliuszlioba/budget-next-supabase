"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { withToast } from "@/lib/action-toast";
import { ChevronDown, ChevronLeft, ChevronRight, Lock, LockOpen, Plus, TriangleAlert, Wallet } from "lucide-react";
import type { Bill, Category, Item, Month, NameMemory } from "@/lib/dal/types";
import { monthTotals } from "@/lib/domain/totals";
import { yearSeries } from "@/lib/domain/charts";
import { addMonths, compareYm, monthName, monthShort, shortDate, ymKey, type YM } from "@/lib/domain/dates";
import { collectionDate } from "@/lib/domain/billing";
import { isLockedMonth, isMonthReadOnly, UNLOCKED_MONTH_COOKIE } from "@/lib/domain/lock";
import { formatEUR, formatEURWhole, formatPlain } from "@/lib/domain/money";
import { setPaid } from "@/lib/actions/items";
import { PaidCheck } from "./paid-check";
import { CategoryGlyph, CategoryIcon } from "./category-badge";
import { ItemSheet, type ItemSheetTarget } from "./item-sheet";
import { MonthPicker } from "./month-picker";
import { IncomeSheet } from "./income-sheet";
import { cn } from "@/lib/utils";
import { CategorySpend } from "@/components/category-spend";
import { ADD_ITEM_EVENT } from "@/components/app-nav";
import { Money } from "@/components/money";

type OptimisticAction =
  | { type: "paid"; id: string; paid: boolean }
  | { type: "upsert"; item: Item }
  | { type: "remove"; id: string };

function reduce(items: Item[], a: OptimisticAction): Item[] {
  switch (a.type) {
    case "paid":
      return items.map((it) => (it.id === a.id ? { ...it, paid: a.paid } : it));
    case "upsert":
      return items.some((it) => it.id === a.item.id)
        ? items.map((it) => (it.id === a.item.id ? a.item : it))
        : [...items, a.item];
    case "remove":
      return items.filter((it) => it.id !== a.id && it.parentItemId !== a.id);
  }
}

/** Tells Server Actions which locked month (if any) the user unlocked. Expires on its own after 30 minutes. */
function writeUnlockedCookie(key: string | null) {
  document.cookie = key
    ? `${UNLOCKED_MONTH_COOKIE}=${key}; path=/; max-age=1800; samesite=lax`
    : `${UNLOCKED_MONTH_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export type MonthScreenProps = {
  month: Month;
  categories: Category[];
  bills: Bill[];
  names: NameMemory[];
  today: string;
  isCurrent: boolean;
  current: YM;
  /** Earliest year with a month, for the month picker. */
  firstYear: number;
  /** ymKeys of months that have items. */
  monthsWithItems: string[];
};

export function MonthScreen({
  month,
  categories,
  bills,
  names,
  today,
  isCurrent,
  current,
  firstYear,
  monthsWithItems,
}: MonthScreenProps) {
  const [items, applyOptimistic] = useOptimistic(month.items, reduce);
  const [, startTransition] = useTransition();
  const [sheet, setSheet] = useState<ItemSheetTarget | null>(null);
  const [incomeOpen, setIncomeOpen] = useState(false);

  // Months before last month are locked; one can be unlocked while you're on it.
  const [unlockedKey, setUnlockedKey] = useState<string | null>(null);
  if (unlockedKey !== null && unlockedKey !== month.key) setUnlockedKey(null);
  const locked = isLockedMonth(month, today);
  const readOnly = locked && unlockedKey !== month.key;
  const isReadOnly = useCallback((ym: YM) => isMonthReadOnly(ym, today, unlockedKey), [today, unlockedKey]);
  // Leaving the month (or the page) locks it again.
  useEffect(() => {
    writeUnlockedCookie(null);
    return () => writeUnlockedCookie(null);
  }, [month.key]);
  const monthLabel = `${monthName(month.month)} ${month.year}`;
  const unlock = useCallback(() => {
    writeUnlockedCookie(month.key);
    setUnlockedKey(month.key);
    toast.info(`${monthLabel} unlocked`, {
      id: "month-lock",
      description: "It locks again when you leave this month.",
      icon: <LockOpen className="size-4" strokeWidth={2} />,
    });
  }, [month.key, monthLabel]);
  const relock = () => {
    writeUnlockedCookie(null);
    setUnlockedKey(null);
    toast.info(`${monthLabel} locked`, { id: "month-lock", icon: <Lock className="size-4" strokeWidth={2} /> });
  };
  /** Runs `fn` if the month is open; on a locked month asks to unlock it first. */
  const whenOpen = useCallback(
    (fn: () => void) => {
      if (readOnly) {
        toast.warning(`${monthLabel} is locked`, {
          id: "month-locked",
          icon: <Lock className="size-4" strokeWidth={2} />,
          description: "Past months are locked so they don't change by accident.",
          action: {
            label: "Unlock",
            onClick: () => {
              unlock();
              fn();
            },
          },
        });
        return;
      }
      fn();
    },
    [readOnly, monthLabel, unlock],
  );

  // The "+" in the bottom bar opens the add panel (directly, or via /?add=1 from another page).
  useEffect(() => {
    const open = () => whenOpen(() => setSheet({ mode: "add" }));
    window.addEventListener(ADD_ITEM_EVENT, open);
    return () => window.removeEventListener(ADD_ITEM_EVENT, open);
  }, [whenOpen]);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("add")) return;
    url.searchParams.delete("add");
    window.history.replaceState(null, "", url.pathname + url.search);
    const timer = setTimeout(() => setSheet({ mode: "add" }), 0);
    return () => clearTimeout(timer);
  }, []);

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const essentialIds = useMemo(() => new Set(categories.filter((c) => c.isEssential).map((c) => c.id)), [categories]);
  const billById = useMemo(() => new Map(bills.map((b) => [b.id, b])), [bills]);

  const totals = useMemo(
    () =>
      monthTotals({
        incomeCents: month.incomeCents,
        savingsCents: month.savingsCents,
        carryCents: month.totals.carryCents,
        items,
        essentialCategoryIds: essentialIds,
      }),
    [items, month, essentialIds],
  );

  const byCategory = useMemo(
    () => yearSeries([{ ...month, items, totals }])[0]?.byCategory ?? {},
    [month, items, totals],
  );

  const top = items.filter((it) => !it.parentItemId);
  const childrenOf = (id: string) =>
    items.filter((it) => it.parentItemId === id).sort((a, b) => b.date.localeCompare(a.date));
  const unpaid = top
    .filter((it) => !it.paid)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const paid = top
    .filter((it) => it.paid)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const togglePaid = (it: Item, value: boolean) =>
    whenOpen(() =>
      startTransition(async () => {
        applyOptimistic({ type: "paid", id: it.id, paid: value });
        await withToast(setPaid(it.id, value));
      }),
    );
  const openSheet = (target: ItemSheetTarget) => whenOpen(() => setSheet(target));
  const openIncome = () => whenOpen(() => setIncomeOpen(true));

  const prev = addMonths(month, -1);
  const next = addMonths(month, 1);
  const paidCents = totals.expenseCents - totals.unpaidCents;
  // List headers show only money going out; money back is left out of them.
  const outgoingCents = (list: Item[]) =>
    list.reduce((acc, it) => acc + Math.max(totals.effective[it.id] ?? 0, 0), 0);
  // Unpaid money back is waiting to come in, so it gets its own list instead of "To pay".
  const toReceive = unpaid.filter((it) => (totals.effective[it.id] ?? 0) < 0);
  const toPay = unpaid.filter((it) => (totals.effective[it.id] ?? 0) >= 0);
  const toReceiveCents = toReceive.reduce((acc, it) => acc - (totals.effective[it.id] ?? 0), 0);
  // Money back that has arrived, shown together with income under "Available now".
  const moneyBackCents = paid.reduce((acc, it) => acc - Math.min(totals.effective[it.id] ?? 0, 0), 0);

  const renderRow = (it: Item) =>
    it.isCreditBill ? (
      <CreditBillRow
        key={it.id}
        item={it}
        purchases={childrenOf(it.id)}
        info={totals.credit[it.id]}
        effectiveCents={totals.effective[it.id]}
        catById={catById}
        onToggle={togglePaid}
        onOpen={openSheet}
      />
    ) : (
      <ItemRow
        key={it.id}
        item={it}
        category={catById.get(it.categoryId)}
        regular={!!it.billId && billById.has(it.billId)}
        onToggle={(v) => togglePaid(it, v)}
        onOpen={() => openSheet({ mode: "edit", item: it, hasChildren: false })}
      />
    );

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-4 lg:max-w-5xl lg:px-8 lg:pt-8">
      <header className="mb-4 flex items-center justify-between">
        <Link
          href={`/month/${ymKey(prev)}`}
          aria-label={monthName(prev.month)}
          className="flex size-10 items-center justify-center rounded-full bg-card text-muted-foreground ring-1 ring-border hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            {locked && (
              <button
                type="button"
                onClick={readOnly ? unlock : relock}
                aria-label={readOnly ? "Month locked. Unlock to edit" : "Month unlocked. Lock again"}
                title={readOnly ? "Locked. Tap to unlock" : "Unlocked. Tap to lock"}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full transition-colors hover:bg-accent",
                  readOnly ? "text-muted-foreground hover:text-foreground" : "text-signal",
                )}
              >
                {readOnly ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
              </button>
            )}
            <h1>
              <MonthPicker
                month={{ year: month.year, month: month.month }}
                current={current}
                firstYear={firstYear}
                withItems={new Set(monthsWithItems)}
              />
            </h1>
          </div>
          {!isCurrent && (
            <Link href="/" className="text-xs font-medium text-signal">
              Back to this month
            </Link>
          )}
        </div>
        <Link
          href={`/month/${ymKey(next)}`}
          aria-label={monthName(next.month)}
          className="flex size-10 items-center justify-center rounded-full bg-card text-muted-foreground ring-1 ring-border hover:text-foreground"
        >
          <ChevronRight className="size-5" />
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-x-12">
        <div className="flex min-w-0 flex-col gap-4">
          <BalanceCard
            ended={compareYm(month, current) < 0}
            availableCents={totals.availableNowCents}
            forecastCents={totals.endForecastCents}
            unpaidCount={toPay.length}
            unpaidCents={outgoingCents(toPay)}
            paidCents={paidCents}
            carryCents={totals.carryCents}
            incomeCents={totals.incomeCents + moneyBackCents}
            onAdd={() => openSheet({ mode: "add" })}
            onIncome={openIncome}
          />

          {top.length === 0 && (
            <p className="rounded-3xl bg-card px-4 py-10 text-center text-sm text-muted-foreground ring-1 ring-border">
              Nothing here yet. Tap <span className="font-semibold text-foreground">Add item</span> to log what you paid.
            </p>
          )}
          {toPay.length > 0 && (
            <ListCard title="To pay" totalCents={outgoingCents(toPay)}>
              {toPay.map(renderRow)}
            </ListCard>
          )}
          {toReceive.length > 0 && (
            <ListCard title="To receive" totalCents={toReceiveCents}>
              {toReceive.map(renderRow)}
            </ListCard>
          )}
          {paid.length > 0 && (
            <ListCard title="Paid" totalCents={outgoingCents(paid)}>
              {paid.map(renderRow)}
            </ListCard>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-8">
          <div className="grid grid-cols-3 divide-x divide-border px-1 py-1">
            <Stat label="Income" value={<Money value={formatEURWhole(totals.incomeCents + totals.carryCents)} />} onClick={openIncome} />
            <Stat label="Saved" value={<Money value={formatEURWhole(totals.savingsCents)} />} onClick={openIncome} />
            <Stat label="Spent" value={<Money value={formatEURWhole(totals.expenseCents)} />} />
          </div>
          <CategorySpend byCategory={byCategory} catById={catById} emptyText="Nothing spent yet this month." />
        </aside>
      </div>

      <ItemSheet
        target={sheet}
        onClose={() => setSheet(null)}
        month={month}
        today={today}
        categories={categories}
        names={names}
        availableCents={totals.availableNowCents}
        forecastCents={totals.endForecastCents}
        isReadOnly={isReadOnly}
        applyOptimistic={(a) => applyOptimistic(a)}
      />
      <IncomeSheet open={incomeOpen} onOpenChange={setIncomeOpen} month={month} carryCents={totals.carryCents} />
    </div>
  );
}

function BalanceCard(props: {
  /** A past month: lead with what it ended with (what carried into the next month). */
  ended: boolean;
  availableCents: number;
  forecastCents: number;
  unpaidCount: number;
  unpaidCents: number;
  paidCents: number;
  carryCents: number;
  incomeCents: number;
  onAdd: () => void;
  onIncome: () => void;
}) {
  const { ended, availableCents, forecastCents, unpaidCount, unpaidCents, paidCents, carryCents, incomeCents } = props;
  // A past month's end figure counts its unpaid items as paid, the same figure that carries forward.
  const heroCents = ended ? forecastCents : availableCents;
  const spentTotal = Math.max(paidCents + Math.max(unpaidCents, 0), 1);
  const paidPct = Math.max(0, Math.min(100, (paidCents / spentTotal) * 100));
  return (
    <section className="rounded-3xl bg-hero p-5 text-hero-foreground shadow-xl shadow-black/20 ring-1 ring-white/5 lg:p-6">
      <div className="flex items-center justify-between text-sm opacity-80">
        <span>{ended ? "Ended with" : "Available now"}</span>
        <Wallet className="size-4.5 opacity-80" />
      </div>
      <p className={cn("tabular mt-1 text-[2.6rem] leading-none font-semibold tracking-tight", heroCents < 0 && "text-signal")}>
        <Money value={formatEUR(heroCents)} />
      </p>
      <p className="mt-2 text-xs opacity-60">
        <Money value={formatEUR(incomeCents)} /> income
        {carryCents ? (
          <>
            , <Money value={formatEUR(carryCents)} /> carried over
          </>
        ) : null}
      </p>

      <div className="mt-5 grid grid-cols-2">
        <div className="pr-4">
          <p className="flex items-center gap-1.5 text-xs opacity-70">
            <i className="size-1.5 rounded-full bg-hero-foreground" /> {ended ? "Paid" : "End forecast"}
          </p>
          {ended ? (
            <p className="tabular mt-1 text-xl font-medium"><Money value={formatEUR(paidCents)} /></p>
          ) : (
            <p className={cn("tabular mt-1 text-xl font-medium", forecastCents < 0 && "text-signal")}><Money value={formatEUR(forecastCents)} /></p>
          )}
        </div>
        <div className="border-l border-white/10 pl-4">
          <p className="flex items-center gap-1.5 text-xs opacity-70">
            <i className="size-1.5 rounded-full bg-signal" /> {unpaidCount === 0 ? "All paid" : `${unpaidCount} to pay`}
          </p>
          <p className="tabular mt-1 text-xl font-medium"><Money value={formatEUR(unpaidCents)} /></p>
        </div>
      </div>

      <div className="mt-4 flex h-1 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <span className="h-full bg-bar" style={{ width: `${paidPct}%` }} />
        <span className="h-full flex-1 bg-signal" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={props.onAdd}
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground transition-transform active:scale-[0.98]"
        >
          <Plus className="size-4" /> Add item
        </button>
        <button
          type="button"
          onClick={props.onIncome}
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-white/8 text-sm font-medium ring-1 ring-white/10 transition-colors hover:bg-white/12"
        >
          Income &amp; savings
        </button>
      </div>
    </section>
  );
}

/** One figure in the plain Income / Saved / Spent row (thin dividers, no card). */
function Stat({ label, value, onClick }: { label: string; value: React.ReactNode; onClick?: () => void }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="group px-4 text-left first:pl-0 last:pr-0"
    >
      <span className="eyebrow block">{label}</span>
      <span className="tabular mt-0.5 block text-xl font-semibold tracking-tight transition-colors group-enabled:group-hover:text-primary">
        {value}
      </span>
    </Comp>
  );
}

function ListCard({ title, totalCents, children }: { title: string; totalCents: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <span className="tabular text-sm text-muted-foreground"><Money value={formatEUR(totalCents)} /></span>
      </div>
      <ul className="rounded-3xl bg-card p-1.5 ring-1 ring-border">{children}</ul>
    </section>
  );
}


/** An item amount without a sign: money going out in the row's colour, money coming back in green. */
function Amount({ cents, className }: { cents: number; className?: string }) {
  return (
    <span className={cn("tabular font-semibold", className, cents < 0 && "text-positive")}>
      <Money value={formatEUR(Math.abs(cents))} />
      {cents < 0 && <span className="sr-only"> back</span>}
    </span>
  );
}

function ItemRow({
  item,
  category,
  regular,
  onToggle,
  onOpen,
}: {
  item: Item;
  category?: Category;
  regular: boolean;
  onToggle: (paid: boolean) => void;
  onOpen: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl px-3 transition-colors hover:bg-inset">
      <PaidCheck paid={item.paid} name={item.name} onChange={onToggle} />
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left">
        <CategoryIcon category={category} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] leading-tight font-medium">{item.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {category?.name ?? "No category"}
            {regular && ", every month"}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <Amount cents={item.amountCents} className={cn(!item.paid && "text-signal")} />
          {!regular && <span className="block text-[11px] text-muted-foreground">{shortDate(item.date)}</span>}
        </span>
      </button>
    </li>
  );
}

function CreditBillRow({
  item,
  purchases,
  info,
  effectiveCents,
  catById,
  onToggle,
  onOpen,
}: {
  item: Item;
  purchases: Item[];
  info: { trackedCents: number; untrackedCents: number; overTracked: boolean };
  effectiveCents: number;
  catById: Map<string, Category>;
  onToggle: (it: Item, paid: boolean) => void;
  onOpen: (t: ItemSheetTarget) => void;
}) {
  const [open, setOpen] = useState(false);
  const [y, m] = item.date.split("-").map(Number);
  const collected = shortDate(collectionDate(y, m));
  return (
    <li className={cn("rounded-2xl transition-colors", open ? "bg-inset" : "hover:bg-inset")}>
      <div className="flex items-center gap-3 px-3">
        <PaidCheck paid={item.paid} name={item.name} onChange={(v) => onToggle(item, v)} />
        <button
          type="button"
          onClick={() => onOpen({ mode: "edit", item, hasChildren: purchases.length > 0 })}
          className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left"
        >
          <CategoryIcon category={catById.get(item.categoryId)} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 truncate text-[15px] leading-tight font-medium">
              {item.name}
              {item.isEstimate && (
                <span className="rounded-full bg-signal-soft px-1.5 py-px text-[10px] font-semibold tracking-wide text-signal uppercase">
                  est.
                </span>
              )}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              Card bill for {monthShort(m === 1 ? 12 : m - 1)}, collected {collected}
            </span>
          </span>
          <Amount cents={effectiveCents} />
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Hide card purchases" : "Show card purchases"}
          className="-mr-1 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
        >
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open && (
        <ul className="mr-3 mb-2 ml-11 border-l border-border pl-3">
          {purchases.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpen({ mode: "edit", item: p, hasChildren: false })}
                className="flex w-full items-center gap-2 py-1.5 text-left text-sm"
              >
                <CategoryGlyph category={catById.get(p.categoryId)} />
                <span className="min-w-0 flex-1 truncate">
                  {p.name} <span className="text-xs text-muted-foreground">· {shortDate(p.date)}</span>
                </span>
                <span className={cn("tabular font-medium", p.amountCents < 0 && "text-positive")}>
                  {formatPlain(Math.abs(p.amountCents))}
                </span>
              </button>
            </li>
          ))}
          <li className="flex items-center gap-2 py-1.5 text-sm text-muted-foreground">
            {info.overTracked ? <TriangleAlert className="size-4 text-signal" /> : <span aria-hidden className="w-4" />}
            <span className="flex-1">{info.overTracked ? "Purchases exceed the statement" : "Untracked"}</span>
            <span className="tabular">{formatPlain(info.untrackedCents)}</span>
          </li>
          {purchases.length === 0 && (
            <li className="pb-1 text-xs text-muted-foreground">
              Add a purchase with “On credit card” switched on to see it here.
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
