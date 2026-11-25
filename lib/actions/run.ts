import "server-only";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireUser } from "@/lib/dal/auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

export const fail = (error: string): ActionResult => ({ ok: false, error });

export const DEMO_READ_ONLY = "This is a read-only demo, so changes aren’t saved.";

/**
 * Runs a mutation, turns errors into a message for the UI, and refreshes the page data on success.
 * The demo account is read-only (the database enforces it too), so it never gets this far.
 */
export async function run(fn: () => Promise<void>): Promise<ActionResult> {
  if ((await requireUser()).isDemo) return fail(DEMO_READ_ONLY);
  try {
    await fn();
  } catch (e) {
    // requireUser() redirects by throwing; let Next.js handle that.
    unstable_rethrow(e);
    console.error(e);
    return fail(e instanceof Error ? e.message : "Couldn’t save. Check that the app is online and try again.");
  }
  refresh();
  return { ok: true };
}
