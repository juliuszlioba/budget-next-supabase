"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { History } from "lucide-react";
import type { Category, Item, Month, NameMemory } from "@/lib/dal/types";
import { createItem, deleteItem, updateItem, type ItemInput } from "@/lib/actions/items";
import { creditBillMonthFor } from "@/lib/domain/billing";
import { addMonths, monthName, shortDate, ymKey, ymOfDate, isoDate, type YM } from "@/lib/domain/dates";
import { formatEUR, formatPlain, parseAmount } from "@/lib/domain/money";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useIsDesktop } from "@/lib/hooks";
import { CategoryIcon } from "./category-badge";
import { cn } from "@/lib/utils";
import { Money } from "@/components/money";

export type ItemSheetTarget = { mode: "add" } | { mode: "edit"; item: Item; hasChildren: boolean };

type Props = {
  target: ItemSheetTarget | null;
  onClose: () => void;
  month: Month;
  today: string;
  categories: Category[];
  names: NameMemory[];
  /** The month's "Available now" and end forecast, before this item is added or changed. */
  availableCents: number;
  forecastCents: number;
  applyOptimistic: (a: { type: "upsert"; item: Item } | { type: "remove"; id: string }) => void;
};

export function ItemSheet(props: Props) {
  const isDesktop = useIsDesktop();
  const { target, onClose } = props;
  const dirtyRef = useRef(false);
  const amountRef = useRef<HTMLInputElement>(null);
  // Closing by backdrop, swipe or Esc must not silently drop what was typed.
  const requestClose = () => {
    if (dirtyRef.current && !window.confirm("Discard this item? What you typed will be lost.")) return;
    onClose();
  };
  return (
    <Sheet open={target !== null} onOpenChange={(o) => !o && requestClose()}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        // A new item starts at the amount, so the keyboard comes up ready for digits.
        initialFocus={target?.mode === "add" ? amountRef : true}
        className={cn(
          "gap-0 overflow-y-auto overscroll-contain",
          isDesktop ? "w-[420px] bg-card sm:max-w-[420px]" : "max-h-[94dvh] rounded-t-3xl border-t-0 bg-card pb-[env(safe-area-inset-bottom)] ring-1 ring-border",
        )}
      >
        {target && (
          <ItemForm
            key={target.mode === "edit" ? target.item.id : "add"}
            {...props}
            target={target}
            dirtyRef={dirtyRef}
            amountRef={amountRef}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function toDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function fromDate(d: Date) {
  return isoDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * Keeps the amount field to what parseAmount accepts: digits, one comma or point with up to
 * two decimals, and a leading minus for money back. Pasted "€ 1 234,50" becomes "1234,50".
 */
function cleanAmount(raw: string) {
  const negative = raw.trimStart().startsWith("-");
  const [whole, ...rest] = raw.replace(/[^\d.,]/g, "").split(/([.,])/);
  const sep = rest[0] ?? "";
  const frac = rest.slice(1).join("").replace(/[.,]/g, "").slice(0, 2);
  return `${negative ? "-" : ""}${whole.slice(0, 9)}${sep}${frac}`;
}

/** Default date for a new item: today if viewing this month, otherwise the 1st of the viewed month. */
function defaultDate(month: Month, today: string) {
  return ymKey(ymOfDate(today)) === month.key ? today : isoDate(month.year, month.month, 1);
}

function ItemForm({
  target,
  onClose,
  month,
  today,
  categories,
  names,
  availableCents,
  forecastCents,
  applyOptimistic,
  dirtyRef,
  amountRef,
}: Props & {
  target: ItemSheetTarget;
  dirtyRef: React.RefObject<boolean>;
  amountRef: React.RefObject<HTMLInputElement | null>;
}) {
  const editing = target.mode === "edit" ? target.item : null;
  const isBillItem = !!editing && (!!editing.billId || editing.isCreditBill || (target.mode === "edit" && target.hasChildren));
  const wasCardPurchase = !!editing?.parentItemId;

  const [initial] = useState(() => ({
    amount: editing ? formatPlain(editing.amountCents).replace(/,/g, "") : "",
    name: editing?.name ?? "",
    categoryId: editing?.categoryId ?? null,
    date: editing?.date ?? defaultDate(month, today),
  }));
  const [amount, setAmount] = useState(initial.amount);
  const [name, setName] = useState(initial.name);
  const [categoryId, setCategoryId] = useState<string | null>(initial.categoryId);
  const [date, setDate] = useState(initial.date);
  const [paid, setPaid] = useState(editing ? editing.paid : true);
  const [paidTouched, setPaidTouched] = useState(!!editing);
  const [onCard, setOnCard] = useState(wasCardPurchase);
  const [billMonth, setBillMonth] = useState<YM | null>(wasCardPurchase ? { year: month.year, month: month.month } : null);
  const [nameFocused, setNameFocused] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  const dirty =
    amount !== initial.amount || name !== initial.name || categoryId !== initial.categoryId || date !== initial.date;

  // Share "has unsaved input" with the sheet, and warn before leaving the page.
  useEffect(() => {
    dirtyRef.current = dirty;
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      dirtyRef.current = false;
    };
  }, [dirty, dirtyRef]);

  const cents = parseAmount(amount);
  const isFuture = date > today;
  const effectivePaid = paidTouched ? paid : !isFuture;
  const cardMonth = billMonth ?? creditBillMonthFor(date);
  const active = categories.filter((c) => !c.archived || c.id === categoryId);

  // The remembered amount for a name typed in full, shown as a hint next to it.
  const usual = names.find((n) => n.name.toLowerCase() === name.trim().toLowerCase());

  // What saving does to the month screen's figures, in one line under the amount.
  const impact = (() => {
    if (onCard) {
      const y = cardMonth.year !== month.year ? ` ${cardMonth.year}` : "";
      return { text: `Goes on ${monthName(cardMonth.month)}${y}'s card bill` };
    }
    const where = ymOfDate(date);
    if (ymKey(where) !== month.key) return { text: `Goes into ${monthName(where.month)} ${where.year}` };
    if (editing?.isCreditBill) return null; // its effective amount depends on the tracked purchases
    // What this item already counts for (a card purchase counts only through its bill).
    const counted = editing && !wasCardPurchase ? editing.amountCents : 0;
    const now = cents ?? counted;
    if (effectivePaid) {
      const left = availableCents - now + (editing?.paid ? counted : 0);
      return { cents: left, before: "Leaves ", after: " available now" };
    }
    return { cents: forecastCents - now + counted, before: "Month ends at ", after: "" };
  })();

  const suggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    const list = q ? names.filter((n) => n.name.toLowerCase().includes(q) && n.name.toLowerCase() !== q) : names;
    return list.slice(0, q ? 5 : 6);
  }, [name, names]);

  const negative = amount.startsWith("-");
  function flipSign() {
    setAmount((a) => (a.startsWith("-") ? a.slice(1) : `-${a}`));
    amountRef.current?.focus();
  }

  function pickSuggestion(n: NameMemory) {
    setName(n.name);
    setCategoryId(n.categoryId);
    if (!amount) setAmount(formatPlain(n.amountCents).replace(/,/g, ""));
    nameRef.current?.blur();
  }

  const canSave = cents !== null && name.trim() !== "" && categoryId !== null && !pending;

  function save() {
    if (cents === null || !categoryId) return;
    const input: ItemInput = {
      name: name.trim(),
      amountCents: cents,
      categoryId,
      date,
      paid: onCard ? true : effectivePaid,
      onCard,
      billMonth: onCard ? billMonth : null,
    };
    const targetYm = onCard ? cardMonth : ymOfDate(date);
    const landsHere = ymKey(targetYm) === month.key;
    // The card bill item this purchase would sit under, if it's in the month on screen.
    const keepsParent = onCard && editing?.parentItemId && landsHere ? editing.parentItemId : null;
    startTransition(async () => {
      if (landsHere && (!onCard || keepsParent)) {
        applyOptimistic({
          type: "upsert",
          item: {
            ...(editing ?? {
              id: `tmp-${Date.now()}`,
              monthId: month.id,
              billId: null,
              isCreditBill: false,
              createdAt: new Date().toISOString(),
            }),
            parentItemId: keepsParent,
            name: input.name,
            amountCents: cents,
            categoryId,
            date,
            paid: input.paid,
            isEstimate: editing ? editing.isEstimate && editing.amountCents === cents : false,
          } as Item,
        });
      } else if (editing && !landsHere) {
        applyOptimistic({ type: "remove", id: editing.id });
      }
      onClose();
      const res = editing ? await updateItem(editing.id, input) : await createItem(input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (!landsHere || (onCard && !keepsParent)) {
        const where = onCard
          ? `${monthName(targetYm.month)}'s card bill`
          : `${monthName(targetYm.month)} ${targetYm.year}`;
        toast.success(`${editing ? "Moved" : "Added"} to ${where}`);
      }
    });
  }

  function remove() {
    if (!editing) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      applyOptimistic({ type: "remove", id: editing.id });
      onClose();
      const res = await deleteItem(editing.id);
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <>
      <SheetHeader className="px-4 pt-4 pb-0">
        <SheetTitle className="text-[15px]">{editing ? "Edit item" : "New item"}</SheetTitle>
        <SheetDescription className="sr-only">Amount, name, category and date</SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-4 px-4 pt-3 pb-4">
        {/* The amount, set like the "Available now" figure on the month screen, and typed in place. */}
        <div>
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <i
                className={cn(
                  "size-1.5 rounded-full",
                  negative ? "bg-positive" : onCard ? "bg-muted-foreground" : "bg-signal",
                )}
              />
              {negative ? "Money back" : onCard ? "Card purchase" : "Expense"}
            </p>
            <button
              type="button"
              onClick={flipSign}
              aria-pressed={negative}
              className="rounded-sm underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {negative ? "Make it an expense" : "Mark as money back"}
            </button>
          </div>
          <label
            className={cn(
              "tabular mt-1.5 flex items-baseline border-b border-input pb-1.5 text-[2.9rem] leading-none font-semibold tracking-tight transition-colors focus-within:border-ring",
              negative && "text-positive",
            )}
          >
            <span className="currency">€</span>
            <input
              ref={amountRef}
              value={amount.replace(/^-/, "")}
              onChange={(e) => {
                // The sign lives in the toggle above; typing a minus flips it instead of showing it.
                const raw = e.target.value;
                const neg = raw.includes("-") ? !negative : negative;
                setAmount(`${neg ? "-" : ""}${cleanAmount(raw.replace(/-/g, ""))}`);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  nameRef.current?.focus();
                }
              }}
              name="amount"
              inputMode="decimal"
              enterKeyHint="next"
              autoComplete="off"
              placeholder="0"
              aria-label={negative ? "Money back in euros" : "Amount in euros"}
              aria-invalid={amount !== "" && amount !== "-" && cents === null}
              className="min-w-0 flex-1 bg-transparent caret-primary outline-none placeholder:text-muted-foreground/40"
            />
          </label>
          {impact && (
            <p className="tabular mt-2 text-xs text-muted-foreground">
              {impact.cents !== undefined ? (
                <>
                  {impact.before}
                  <span className={cn("font-medium text-foreground", impact.cents < 0 && "text-signal")}>
                    <Money value={formatEUR(impact.cents)} />
                  </span>
                  {impact.after}
                </>
              ) : (
                impact.text
              )}
            </p>
          )}
        </div>

        <div className="relative">
          <div className="flex items-baseline gap-2 border-b border-input pb-2 transition-colors focus-within:border-ring">
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => {
                const value = e.target.value;
                setName(value);
                // Remember a name's usual category once it's typed in full.
                if (!editing && !categoryId) {
                  const hit = names.find((n) => n.name.toLowerCase() === value.trim().toLowerCase());
                  if (hit) setCategoryId(hit.categoryId);
                }
              }}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setTimeout(() => setNameFocused(false), 150)}
              name="name"
              placeholder="What did you pay for?"
              aria-label="Name"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSave) {
                  e.preventDefault();
                  save();
                }
              }}
              enterKeyHint="done"
              className="min-w-0 flex-1 bg-transparent text-[17px] font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground"
            />
            {usual && (
              <span className="tabular shrink-0 text-[13px] text-muted-foreground">usually <Money value={formatEUR(usual.amountCents)} /></span>
            )}
          </div>
          {nameFocused && suggestions.length > 0 && name.trim() !== "" && (
            <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl bg-popover shadow-lg ring-1 ring-border">
              {suggestions.map((n) => (
                <li key={n.name}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickSuggestion(n)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-accent"
                  >
                    <span>
                      {n.name}
                      <span className="text-muted-foreground">
                        {", "}
                        {categories.find((c) => c.id === n.categoryId)?.name}
                      </span>
                    </span>
                    <span className={cn("tabular font-medium", n.amountCents < 0 && "text-positive")}>{formatPlain(Math.abs(n.amountCents))}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!editing && name.trim() === "" && suggestions.length > 0 && (
          <div className="-mt-1">
            <p className="eyebrow mb-1 flex items-center gap-1">
              <History className="size-3" /> Recent
            </p>
            <ChipScroller>
              {suggestions.map((n) => (
                <button
                  key={n.name}
                  type="button"
                  onClick={() => pickSuggestion(n)}
                  aria-label={`${n.name}, ${formatPlain(n.amountCents)}`}
                  className="inline-flex shrink-0 items-baseline gap-1.5 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-secondary"
                >
                  {n.name}
                  <span className={cn("tabular font-semibold", n.amountCents < 0 ? "text-positive" : "text-primary")}>{formatPlain(Math.abs(n.amountCents))}</span>
                </button>
              ))}
            </ChipScroller>
          </div>
        )}

        {/* The month list's tinted category tiles; the chosen one is ringed in its own colour. */}
        <div className="grid grid-cols-5 gap-x-0.5 gap-y-1" role="radiogroup" aria-label="Category">
          {active.map((c) => {
            const on = categoryId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1.5 rounded-xl px-0.5 py-1.5 text-[11px] leading-tight outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  on ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <CategoryIcon
                  category={c}
                  className="size-10"
                  // Chosen: the outline sits on the tile's own edge and the tint deepens, so it reads as one shape.
                  style={
                    on
                      ? {
                          boxShadow: `inset 0 0 0 1.5px ${c.color}`,
                          backgroundColor: `color-mix(in oklab, ${c.color} 26%, transparent)`,
                        }
                      : undefined
                  }
                />
                <span className="w-full truncate text-center">{c.name}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col divide-y divide-border border-b border-border text-sm">
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger render={<button type="button" className="flex items-center justify-between py-3 text-left" />}>
              <span>Date</span>
              <span className="text-muted-foreground">
                {date === today ? `Today, ${shortDate(date)}` : shortDate(date)}
                {date.slice(0, 4) !== today.slice(0, 4) && ` ${date.slice(0, 4)}`}
              </span>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={toDate(date)}
                defaultMonth={toDate(date)}
                weekStartsOn={1}
                onSelect={(d) => {
                  if (d) {
                    setDate(fromDate(d));
                    if (onCard) setBillMonth(null);
                  }
                  setDateOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          {!isBillItem && (
            <label className="flex items-center justify-between py-2.5">
              <span>On credit card</span>
              <Switch checked={onCard} onCheckedChange={(v) => setOnCard(Boolean(v))} />
            </label>
          )}
          {onCard && wasCardPurchase && (
            <div className="flex items-center justify-between py-1.5">
              <span>Card bill month</span>
              <span className="flex items-center gap-1">
                <Button variant="ghost" size="sm" aria-label="Earlier card bill" onClick={() => setBillMonth(addMonths(cardMonth, -1))}>‹</Button>
                <span className="w-20 text-center">{monthName(cardMonth.month).slice(0, 3)} {cardMonth.year}</span>
                <Button variant="ghost" size="sm" aria-label="Later card bill" onClick={() => setBillMonth(addMonths(cardMonth, 1))}>›</Button>
              </span>
            </div>
          )}
          {!onCard && (
            <label className="flex items-center justify-between py-2.5">
              <span>Paid already</span>
              <Switch
                checked={effectivePaid}
                onCheckedChange={(v) => {
                  setPaid(Boolean(v));
                  setPaidTouched(true);
                }}
              />
            </label>
          )}
        </div>

        <Button onClick={save} disabled={!canSave} className="h-12 rounded-full text-base font-semibold">
          {editing ? (
            "Save"
          ) : cents !== null ? (
            // One span, so the button's gap doesn't split the € from its digits.
            <span>
              Add <Money value={formatEUR(Math.abs(cents))} />
            </span>
          ) : (
            "Add"
          )}
        </Button>
        {editing && (
          <Button variant={confirmDelete ? "destructive" : "ghost"} onClick={remove} disabled={pending} className="h-11 rounded-full text-signal hover:text-signal">
            {confirmDelete ? "Confirm delete" : "Delete"}
            {confirmDelete && editing.isCreditBill ? " (and its purchases)" : ""}
          </Button>
        )}
      </div>
    </>
  );
}

/**
 * A single row of chips that scrolls sideways without a visible scrollbar: swipe on touch,
 * mouse wheel or trackpad on desktop. Vertical padding keeps the chips' outlines from being clipped.
 */
function ChipScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // already horizontal (trackpad)
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const next = Math.max(0, Math.min(max, el.scrollLeft + e.deltaY));
      if (next === el.scrollLeft) return; // at an end: let the panel scroll instead
      e.preventDefault();
      el.scrollLeft = next;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  return (
    <div
      ref={ref}
      className="-mr-4 -mb-1 flex gap-1.5 overflow-x-auto py-1 pr-4 pl-px [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_85%,transparent)] [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </div>
  );
}
