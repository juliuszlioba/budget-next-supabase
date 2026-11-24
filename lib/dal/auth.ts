import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifies the session for this request (memoised per request) and returns the user and a
 * Supabase client acting as that user. Redirects to /login when there is no valid session.
 * Every page and Server Action that touches data must go through this.
 */
export const requireUser = cache(async () => {
  // Personal data is always read at request time, never prerendered (token expiry checks use the clock).
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) redirect("/login");
  return { id, email: (data.claims.email as string | undefined) ?? "", supabase };
});

export type Db = Awaited<ReturnType<typeof requireUser>>["supabase"];
