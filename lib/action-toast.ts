"use client";

import { toast } from "sonner";
import type { ActionResult } from "@/lib/actions/run";

const UNREACHABLE = "Couldn’t reach the server. Check your connection and try again.";

/**
 * Awaits a Server Action and reports the outcome as a toast: its error, or `success` when given.
 * A request that never reaches the server (offline, timeout) is reported too instead of crashing the page.
 * Returns whether the action worked.
 */
export async function withToast(action: Promise<ActionResult>, success?: string): Promise<boolean> {
  let res: ActionResult | undefined;
  try {
    res = await action;
  } catch (e) {
    console.error(e);
    toast.error(UNREACHABLE);
    return false;
  }
  // An action that redirects (e.g. an expired session) navigates away and returns nothing.
  if (!res) return false;
  if (!res.ok) {
    toast.error(res.error);
    return false;
  }
  if (success) toast.success(success);
  return true;
}
