"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { monthName, monthShort, ymKey, type YM } from "@/lib/domain/dates";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * The month title, which opens a year of months to jump to. Months with items get a dot;
 * the current month is outlined, the one on screen is filled.
 */
export function MonthPicker({
  month,
  current,
  firstYear,
  withItems,
}: {
  month: YM;
  current: YM;
  /** The earliest year with a month in it; the picker goes from there to next year. */
  firstYear: number;
  /** ymKeys of months that have at least one item. */
  withItems: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(month.year);
  const lastYear = current.year + 1;
  const minYear = Math.min(firstYear, month.year);
  const maxYear = Math.max(lastYear, month.year);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setYear(month.year);
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-1 rounded-full px-2 py-0.5 outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
          />
        }
        aria-label={`${monthName(month.month)} ${month.year}, choose a month`}
      >
        <span className="text-lg font-semibold tracking-tight">
          {monthName(month.month)} {month.year}
        </span>
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform motion-reduce:transition-none", open && "rotate-180")}
        />
      </PopoverTrigger>
      <PopoverContent align="center" className="w-76 gap-2 rounded-2xl p-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            disabled={year <= minYear}
            aria-label="Previous year"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
          >
            <ChevronLeft className="size-4.5" />
          </button>
          <span className="tabular text-[15px] font-semibold">{year}</span>
          <button
            type="button"
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= maxYear}
            aria-label="Next year"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
          >
            <ChevronRight className="size-4.5" />
          </button>
        </div>
        <ul className="grid grid-cols-4 gap-1">
          {Array.from({ length: 12 }, (_, i) => {
            const ym = { year, month: i + 1 };
            const key = ymKey(ym);
            const isShown = key === ymKey(month);
            const isCurrent = key === ymKey(current);
            const hasItems = withItems.has(key);
            return (
              <li key={key}>
                <Link
                  href={isCurrent ? "/" : `/month/${key}`}
                  onClick={() => setOpen(false)}
                  aria-current={isShown ? "page" : undefined}
                  aria-label={`${monthName(ym.month)} ${year}${hasItems ? "" : ", empty"}`}
                  className={cn(
                    "flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isShown
                      ? "bg-primary font-semibold text-primary-foreground"
                      : cn("hover:bg-accent", hasItems ? "text-foreground" : "text-muted-foreground"),
                    isCurrent && !isShown && "ring-1 ring-primary/60",
                  )}
                >
                  {monthShort(ym.month)}
                  <i
                    aria-hidden
                    className={cn(
                      "size-1 rounded-full",
                      hasItems ? (isShown ? "bg-primary-foreground/70" : "bg-primary") : "bg-transparent",
                    )}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
