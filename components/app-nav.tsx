"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ChartColumn, Plus, Receipt, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Month", icon: CalendarDays, match: (p: string) => p === "/" || p.startsWith("/month") },
  { href: "/bills", label: "Bills", icon: Receipt, match: (p: string) => p.startsWith("/bills") },
  { href: "/charts", label: "Charts", icon: ChartColumn, match: (p: string) => p.startsWith("/charts") },
  { href: "/settings", label: "Settings", icon: Settings, match: (p: string) => p.startsWith("/settings") },
];

function useActive() {
  const pathname = usePathname();
  return (match: (p: string) => boolean) => match(pathname);
}

/** Event the month screen listens for to open its add panel. */
export const ADD_ITEM_EVENT = "budget:add-item";

export function BottomTabs() {
  const isActive = useActive();
  const pathname = usePathname();
  const router = useRouter();
  const onMonth = pathname === "/" || pathname.startsWith("/month");
  return (
    <BottomTabsView
      isActive={isActive}
      onAdd={() => (onMonth ? window.dispatchEvent(new Event(ADD_ITEM_EVENT)) : router.push("/?add=1"))}
    />
  );
}

function Tab({ tab, active }: { tab: (typeof TABS)[number]; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-label={tab.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground",
        active && "text-primary hover:text-primary",
      )}
    >
      <Icon className="size-5.5" strokeWidth={active ? 2.2 : 1.7} />
    </Link>
  );
}

export function BottomTabsView({
  isActive = () => false,
  onAdd,
}: {
  isActive?: (m: (p: string) => boolean) => boolean;
  onAdd?: () => void;
}) {
  const [left, right] = [TABS.slice(0, 2), TABS.slice(2)];
  const addClass =
    "flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95";
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="mx-auto flex h-16 max-w-sm items-center justify-between rounded-full bg-card/90 px-3 shadow-2xl shadow-black/50 ring-1 ring-border backdrop-blur-md">
        {left.map((t) => (
          <Tab key={t.href} tab={t} active={isActive(t.match)} />
        ))}
        {onAdd ? (
          <button type="button" onClick={onAdd} aria-label="Add item" className={addClass}>
            <Plus className="size-6" strokeWidth={2.4} />
          </button>
        ) : (
          <Link href="/?add=1" aria-label="Add item" className={addClass}>
            <Plus className="size-6" strokeWidth={2.4} />
          </Link>
        )}
        {right.map((t) => (
          <Tab key={t.href} tab={t} active={isActive(t.match)} />
        ))}
      </div>
    </nav>
  );
}

export function SideNav() {
  const isActive = useActive();
  return <SideNavView isActive={isActive} />;
}

export function SideNavView({ isActive = () => false }: { isActive?: (m: (p: string) => boolean) => boolean }) {
  return (
    <nav className="flex flex-col gap-1">
      {TABS.map(({ href, label, icon: Icon, match }) => {
        const active = isActive(match);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              active && "bg-accent text-accent-foreground",
            )}
          >
            <Icon className="size-4.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
