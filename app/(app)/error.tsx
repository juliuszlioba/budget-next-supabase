"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 px-4 py-20 text-center">
      <h1 className="text-lg font-semibold text-balance">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">The data couldn&apos;t be loaded. Check that Supabase is running.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
