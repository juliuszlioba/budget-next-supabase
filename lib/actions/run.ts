import "server-only";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";

export type ActionResult = { ok: true } | { ok: false; error: string };

export const fail = (error: string): ActionResult => ({ ok: false, error });

/** Runs a mutation, turns errors into a message for the UI, and refreshes the page data on success. */
export async function run(fn: () => Promise<void>): Promise<ActionResult> {
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
