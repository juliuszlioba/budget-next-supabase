import { requireUser } from "@/lib/dal/auth";

/** A strip across the top of every page while you're in the read-only demo account. */
export async function DemoBanner() {
  const { isDemo } = await requireUser();
  if (!isDemo) return null;
  return (
    <p className="border-b border-primary/20 bg-primary/10 px-4 py-2 text-center text-sm text-pretty">
      <span className="font-semibold">Read-only demo.</span>{" "}
      <span className="text-muted-foreground">All data is made up, and changes aren’t saved.</span>
    </p>
  );
}
