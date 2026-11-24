import { Suspense } from "react";
import { requireUser } from "@/lib/dal/auth";
import { loadCategories } from "@/lib/dal/budget";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Skeleton } from "@/components/ui/skeleton";

async function Settings() {
  const { supabase, email } = await requireUser();
  const categories = await loadCategories(supabase);
  return <SettingsScreen categories={categories} email={email} />;
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-xl px-4 pt-6 lg:max-w-2xl lg:pt-9">
          <Skeleton className="mb-5 h-8 w-32" />
          <Skeleton className="h-[480px] rounded-2xl" />
        </div>
      }
    >
      <Settings />
    </Suspense>
  );
}
