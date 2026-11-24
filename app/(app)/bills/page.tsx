import { Suspense } from "react";
import { requireUser } from "@/lib/dal/auth";
import { loadBills, loadCategories } from "@/lib/dal/budget";
import { BillsScreen } from "@/components/bills/bills-screen";
import { Skeleton } from "@/components/ui/skeleton";

async function Bills() {
  const { supabase } = await requireUser();
  const [bills, categories] = await Promise.all([loadBills(supabase), loadCategories(supabase)]);
  return <BillsScreen bills={bills} categories={categories} />;
}

export default function BillsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-xl px-4 pt-6 lg:max-w-2xl lg:pt-9">
          <Skeleton className="mb-5 h-12 w-64" />
          <Skeleton className="h-[480px] rounded-2xl" />
        </div>
      }
    >
      <Bills />
    </Suspense>
  );
}
