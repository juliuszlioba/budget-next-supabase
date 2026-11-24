import type { ChainedMonth, CalcItem, ChainMonth } from "@/lib/domain/totals";

/** Plain, serialisable shapes handed to components (all money in cents). */

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  isEssential: boolean;
  sortOrder: number;
  archived: boolean;
};

export type Bill = {
  id: string;
  name: string;
  defaultAmountCents: number;
  categoryId: string;
  isCreditCard: boolean;
  active: boolean;
  sortOrder: number;
};

export type Item = CalcItem & {
  monthId: string;
  name: string;
  date: string;
  billId: string | null;
  createdAt: string;
};

export type IncomeEntry = {
  id: string;
  label: string;
  amountCents: number;
  isRecurring: boolean;
  sortOrder: number;
};

export type MonthData = ChainMonth & {
  id: string;
  income: IncomeEntry[];
  items: Item[];
};

export type Month = ChainedMonth<MonthData>;

export type NameMemory = { name: string; categoryId: string; amountCents: number };
