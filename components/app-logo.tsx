import { cn } from "@/lib/utils";

/** App mark: a donut ring with an amber share — the part of the month that's spent. */
export function AppLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("shrink-0", className)}>
      <rect width="64" height="64" rx="15" fill="#1f1f21" />
      <circle cx="32" cy="32" r="16" fill="none" stroke="#3a3a3c" strokeWidth="8" />
      <path d="M32 16A16 16 0 1 1 18.68 40.85" fill="none" stroke="#f2b340" strokeWidth="8" />
    </svg>
  );
}
