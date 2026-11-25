"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The paid toggle on a list row. Paid is the normal state, so it's just a quiet grey tick;
 * unpaid is an empty ring in the same orange as the amount still to pay.
 */
export function PaidCheck({
  paid,
  name,
  onChange,
}: {
  paid: boolean;
  name: string;
  onChange: (paid: boolean) => void;
}) {
  return (
    <CheckboxPrimitive.Root
      checked={paid}
      onCheckedChange={(v) => onChange(Boolean(v))}
      aria-label={paid ? `Mark ${name} unpaid` : `Mark ${name} paid`}
      className={cn(
        // The ::after keeps the tap target large while the mark stays small.
        "group relative flex size-5.5 shrink-0 items-center justify-center rounded-full outline-none after:absolute after:-inset-x-3 after:-inset-y-2.5",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        "text-muted-foreground transition-colors hover:text-foreground",
        "not-data-checked:shadow-[inset_0_0_0_1.5px_var(--signal)] not-data-checked:hover:bg-signal-soft",
      )}
    >
      <CheckboxPrimitive.Indicator className="flex data-starting-style:scale-50 data-starting-style:opacity-0 transition-[scale,opacity] duration-150 motion-reduce:transition-none">
        <Check className="size-4.5" strokeWidth={2.4} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
