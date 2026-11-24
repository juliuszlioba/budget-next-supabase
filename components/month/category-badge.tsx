import { createElement } from "react";
import type { Category } from "@/lib/dal/types";
import { categoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

/** Rounded tile with the category's line icon, tinted with the category colour. */
export function CategoryIcon({
  category,
  className,
  style,
}: {
  category?: Category;
  className?: string;
  style?: React.CSSProperties;
}) {
  const color = category?.color ?? "#8e8c87";
  return (
    <span
      aria-hidden
      className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", className)}
      style={{ backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`, color, ...style }}
    >
      {createElement(categoryIcon(category?.icon), { className: "size-4.5", strokeWidth: 1.9 })}
    </span>
  );
}

/** Bare line icon in the category colour, for chips and small rows. */
export function CategoryGlyph({ category, plain, className }: { category?: Category; plain?: boolean; className?: string }) {
  return createElement(categoryIcon(category?.icon), {
    "aria-hidden": true,
    className: cn("size-4 shrink-0", className),
    style: plain ? undefined : { color: category?.color },
    strokeWidth: 2,
  });
}
