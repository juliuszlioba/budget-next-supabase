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

type TabDef = (typeof TABS)[number];
type IsActive = (m: (p: string) => boolean) => boolean;

/** The add action: a button on the client, a plain link before hydration. */
function AddControl({ onAdd, className, children }: { onAdd?: () => void; className: string; children: React.ReactNode }) {
  return onAdd ? (
    <button type="button" onClick={onAdd} aria-label="Add item" className={className}>
      {children}
    </button>
  ) : (
    <Link href="/?add=1" aria-label="Add item" className={className}>
      {children}
    </Link>
  );
}

function TabLink({ tab, active, className, children }: { tab: TabDef; active: boolean; className: string; children: React.ReactNode }) {
  return (
    <Link href={tab.href} aria-label={tab.label} aria-current={active ? "page" : undefined} className={className}>
      {children}
    </Link>
  );
}

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Compact tabs where only the active one shows its name; add is a wide key running into the corner. */
export function BottomTabsView({ isActive = () => false, onAdd }: { isActive?: IsActive; onAdd?: () => void }) {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-card lg:hidden">
      <div className="flex h-16 flex-1 items-center justify-around gap-1 px-2 mb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => {
          const active = isActive(t.match);
          const Icon = t.icon;
          return (
            <TabLink
              key={t.href}
              tab={t}
              active={active}
              className={cn(
                "flex h-10 items-center justify-center gap-2 rounded-full text-sm font-medium text-muted-foreground transition-[background-color,color,padding] hover:text-foreground motion-reduce:transition-none",
                focusRing,
                active ? "bg-secondary px-3.5 text-foreground" : "w-11",
              )}
            >
              <Icon className={cn("size-5.5 shrink-0", active && "text-primary")} strokeWidth={active ? 2.1 : 1.7} />
              {active && t.label}
            </TabLink>
          );
        })}
      </div>
      <AddControl
        onAdd={onAdd}
        className="shrink-0 bg-primary px-6 pb-[env(safe-area-inset-bottom)] text-[15px] font-semibold text-primary-foreground outline-none active:brightness-95 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-foreground"
      >
        <span className="flex h-16 items-center gap-1.5">
          <Plus className="size-5" strokeWidth={2.4} />
          Add
        </span>
      </AddControl>
    </nav>
  );
}

export function SideNav() {
  const isActive = useActive();
  return <SideNavView isActive={isActive} />;
}

export function SideNavView({ isActive = () => false }: { isActive?: IsActive }) {
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
