import { Suspense } from "react";
import { MonthSkeleton, MonthView } from "@/components/month/month-view";

export default function CurrentMonthPage() {
  return (
    <Suspense fallback={<MonthSkeleton />}>
      <MonthView ym={null} />
    </Suspense>
  );
}
