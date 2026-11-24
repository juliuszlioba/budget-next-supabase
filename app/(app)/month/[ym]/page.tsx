import { Suspense } from "react";
import { MonthSkeleton, MonthView } from "@/components/month/month-view";

async function MonthFromParams({ params }: { params: PageProps<"/month/[ym]">["params"] }) {
  const { ym } = await params;
  return <MonthView ym={ym} />;
}

export default function MonthPage({ params }: PageProps<"/month/[ym]">) {
  return (
    <Suspense fallback={<MonthSkeleton />}>
      <MonthFromParams params={params} />
    </Suspense>
  );
}
