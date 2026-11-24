import { Suspense } from "react";
import { AppLogo } from "@/components/app-logo";
import { BottomTabs, BottomTabsView, SideNav, SideNavView } from "@/components/app-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 pt-[env(safe-area-inset-top)]">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-8 border-r bg-sidebar px-4 py-6 lg:flex">
        <div className="flex items-center gap-2.5 px-2">
          <AppLogo className="size-9" />
          <span className="text-lg font-semibold tracking-tight">Budget</span>
        </div>
        <Suspense fallback={<SideNavView />}>
          <SideNav />
        </Suspense>
      </aside>
      <main id="main" tabIndex={-1} className="min-w-0 flex-1 outline-none pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-10">{children}</main>
      <Suspense fallback={<BottomTabsView />}>
        <BottomTabs />
      </Suspense>
    </div>
  );
}
