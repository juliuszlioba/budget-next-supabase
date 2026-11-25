"use client";

import { useState, useTransition } from "react";
import { withToast } from "@/lib/action-toast";
import { Plus, Trash2 } from "lucide-react";
import type { Month } from "@/lib/dal/types";
import { updateMonthMeta } from "@/lib/actions/items";
import { formatEUR, formatPlain, parseAmount } from "@/lib/domain/money";
import { monthName } from "@/lib/domain/dates";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useIsDesktop } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Money } from "@/components/money";

type Line = { key: number; label: string; amount: string; isRecurring: boolean };

const plain = (c: number) => formatPlain(c).replace(/,/g, "");

export function IncomeSheet({
  open,
  onOpenChange,
  month,
  carryCents,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  month: Month;
  carryCents: number;
}) {
  const isDesktop = useIsDesktop();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "gap-0 overflow-y-auto overscroll-contain",
          isDesktop ? "w-[420px] bg-card sm:max-w-[420px]" : "max-h-[94dvh] rounded-t-3xl border-t-0 bg-card pb-[env(safe-area-inset-bottom)] ring-1 ring-border",
        )}
      >
        {open && <IncomeForm month={month} carryCents={carryCents} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function IncomeForm({ month, carryCents, onDone }: { month: Month; carryCents: number; onDone: () => void }) {
  const [lines, setLines] = useState<Line[]>(
    month.income.map((e, i) => ({ key: i, label: e.label, amount: plain(e.amountCents), isRecurring: e.isRecurring })),
  );
  const [savings, setSavings] = useState(plain(month.savingsCents));
  const [pending, startTransition] = useTransition();

  const update = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const parsedLines = lines.map((l) => ({ ...l, cents: parseAmount(l.amount) }));
  const savingsCents = parseAmount(savings);
  const valid = savingsCents !== null && parsedLines.every((l) => l.cents !== null && l.label.trim() !== "");

  function save() {
    if (!valid || savingsCents === null) return;
    startTransition(async () => {
      const saved = await withToast(
        updateMonthMeta({
          monthId: month.id,
          savingsCents,
          income: parsedLines.map((l) => ({ label: l.label.trim(), amountCents: l.cents!, isRecurring: l.isRecurring })),
        }),
        "Income and savings saved",
      );
      if (saved) onDone();
    });
  }

  return (
    <>
      <SheetHeader className="px-4 pt-4">
        <SheetTitle>
          {monthName(month.month)} {month.year}: income &amp; savings
        </SheetTitle>
        <SheetDescription>
          Carried over from last month: <span className="tabular font-medium text-foreground"><Money value={formatEUR(carryCents)} /></span>
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 px-4 pb-4">
        <div className="flex flex-col gap-3">
          <Label>Income</Label>
          {lines.map((l) => (
            <div key={l.key} className="rounded-xl bg-inset p-3">
              <div className="flex gap-2">
                <Input autoComplete="off"
                  value={l.label}
                  onChange={(e) => update(l.key, { label: e.target.value })}
                  aria-label="Income label"
                  className="h-10 flex-1 bg-card"
                />
                <Input autoComplete="off"
                  value={l.amount}
                  onChange={(e) => update(l.key, { amount: e.target.value })}
                  inputMode="decimal"
                  aria-label="Income amount"
                  aria-invalid={parseAmount(l.amount) === null}
                  className="tabular h-10 w-28 bg-card text-right"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove income line"
                  onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <label className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                Every month (copied into new months)
                <Switch size="sm" checked={l.isRecurring} onCheckedChange={(v) => update(l.key, { isRecurring: Boolean(v) })} />
              </label>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setLines((ls) => [...ls, { key: Date.now(), label: "Extra", amount: "", isRecurring: false }])
            }
          >
            <Plus className="size-4" /> Add income line
          </Button>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="savings">Savings this month</Label>
          <Input autoComplete="off"
            id="savings"
            value={savings}
            onChange={(e) => setSavings(e.target.value)}
            inputMode="decimal"
            aria-invalid={savingsCents === null}
            className="tabular h-11 text-right text-base"
          />
        </div>
        <Button onClick={save} disabled={!valid || pending} className="h-12 rounded-full text-base font-semibold">
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </>
  );
}
