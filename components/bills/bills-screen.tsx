"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import type { Bill, Category } from "@/lib/dal/types";
import { moveBill, saveBill } from "@/lib/actions/bills";
import { formatEUR, formatPlain, parseAmount } from "@/lib/domain/money";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CategoryGlyph, CategoryIcon } from "@/components/month/category-badge";
import { PageHeader } from "@/components/page-header";
import { useIsDesktop } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Money } from "@/components/money";

type Editing = { bill: Bill | null } | null;

export function BillsScreen({ bills, categories }: { bills: Bill[]; categories: Category[] }) {
  const [editing, setEditing] = useState<Editing>(null);
  const [pending, startTransition] = useTransition();
  const catById = new Map(categories.map((c) => [c.id, c]));
  const active = bills.filter((b) => b.active);
  const inactive = bills.filter((b) => !b.active);
  const monthlyCents = active.reduce((a, b) => a + b.defaultAmountCents, 0);

  const move = (id: string, dir: "up" | "down") =>
    startTransition(async () => {
      const res = await moveBill(id, dir);
      if (!res.ok) toast.error(res.error);
    });

  const row = (b: Bill, i: number, list: Bill[]) => (
    <li key={b.id} className="flex items-center gap-2 rounded-2xl pr-2 hover:bg-inset">
      <button
        type="button"
        onClick={() => setEditing({ bill: b })}
        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 text-left"
      >
        <CategoryIcon category={catById.get(b.categoryId)} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] leading-tight">{b.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {catById.get(b.categoryId)?.name}
            {b.isCreditCard && ", used as the card bill estimate"}
          </span>
        </span>
        <span className="tabular font-semibold">{formatPlain(b.defaultAmountCents)}</span>
      </button>
      {b.active && (
        <span className="flex flex-col">
          <button
            type="button"
            aria-label={`Move ${b.name} up`}
            disabled={pending || i === 0}
            onClick={() => move(b.id, "up")}
            className="rounded p-0.5 text-muted-foreground hover:bg-accent disabled:opacity-25"
          >
            <ArrowUp className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Move ${b.name} down`}
            disabled={pending || i === list.length - 1}
            onClick={() => move(b.id, "down")}
            className="rounded p-0.5 text-muted-foreground hover:bg-accent disabled:opacity-25"
          >
            <ArrowDown className="size-3.5" />
          </button>
        </span>
      )}
    </li>
  );

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-4 lg:max-w-2xl lg:pt-8">
      <PageHeader title="Regular bills" subtitle={
          <>
            <Money value={formatEUR(monthlyCents)} /> a month, added to each new month as unpaid
          </>
        } />
      <ul className="mb-4 overflow-hidden rounded-3xl bg-card p-1.5 ring-1 ring-border">{active.map(row)}</ul>
      <Button variant="outline" className="mb-6 h-11 w-full rounded-full" onClick={() => setEditing({ bill: null })}>
        <Plus className="size-4" /> Add a regular bill
      </Button>
      {inactive.length > 0 && (
        <>
          <p className="eyebrow mb-2 px-1">Paused</p>
          <ul className="overflow-hidden rounded-3xl bg-card p-1.5 opacity-70 ring-1 ring-border">{inactive.map(row)}</ul>
        </>
      )}
      <BillSheet editing={editing} onClose={() => setEditing(null)} categories={categories} />
    </div>
  );
}

function BillSheet({ editing, onClose, categories }: { editing: Editing; onClose: () => void; categories: Category[] }) {
  const isDesktop = useIsDesktop();
  return (
    <Sheet open={editing !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "gap-0 overflow-y-auto overscroll-contain",
          isDesktop ? "w-[420px] bg-card sm:max-w-[420px]" : "max-h-[94dvh] rounded-t-3xl border-t-0 bg-card pb-[env(safe-area-inset-bottom)] ring-1 ring-border",
        )}
      >
        {editing && <BillForm key={editing.bill?.id ?? "new"} bill={editing.bill} categories={categories} onDone={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function BillForm({ bill, categories, onDone }: { bill: Bill | null; categories: Category[]; onDone: () => void }) {
  const [name, setName] = useState(bill?.name ?? "");
  const [amount, setAmount] = useState(bill ? formatPlain(bill.defaultAmountCents).replace(/,/g, "") : "");
  const [categoryId, setCategoryId] = useState<string | null>(bill?.categoryId ?? null);
  const [active, setActive] = useState(bill?.active ?? true);
  const [pending, startTransition] = useTransition();
  const cents = parseAmount(amount);
  const valid = name.trim() !== "" && cents !== null && cents >= 0 && categoryId !== null;

  function save() {
    if (!valid || cents === null || !categoryId) return;
    startTransition(async () => {
      const res = await saveBill({ id: bill?.id ?? null, name: name.trim(), amountCents: cents, categoryId, active });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Saved. Unpaid entries from this month on were updated.");
        onDone();
      }
    });
  }

  return (
    <>
      <SheetHeader className="px-4 pt-4">
        <SheetTitle>{bill ? "Edit bill" : "New regular bill"}</SheetTitle>
        <SheetDescription>
          Changes reach this month and later months, but only unpaid entries you haven&apos;t edited by hand.
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 px-4 pb-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bill-name">Name</Label>
          <Input autoComplete="off" id="bill-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 text-base" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bill-amount">{bill?.isCreditCard ? "Usual amount (used as the estimate)" : "Usual amount"}</Label>
          <Input autoComplete="off"
            id="bill-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            aria-invalid={cents === null}
            className="tabular h-11 text-right text-base"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Category</Label>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Category">
            {categories
              .filter((c) => !c.archived || c.id === categoryId)
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={categoryId === c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm",
                    categoryId === c.id ? "bg-primary text-primary-foreground" : "text-secondary-foreground ring-1 ring-border hover:bg-accent",
                  )}
                >
                  <CategoryGlyph category={c} plain={categoryId === c.id} /> {c.name}
                </button>
              ))}
          </div>
        </div>
        {!bill?.isCreditCard && (
          <label className="flex items-center justify-between rounded-xl bg-inset px-3 py-3 text-sm">
            <span>
              Active
              <span className="block text-xs text-muted-foreground">Paused bills aren&apos;t added to new months</span>
            </span>
            <Switch checked={active} onCheckedChange={(v) => setActive(Boolean(v))} />
          </label>
        )}
        <Button onClick={save} disabled={!valid || pending} className="h-12 rounded-full text-base font-semibold">
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </>
  );
}
