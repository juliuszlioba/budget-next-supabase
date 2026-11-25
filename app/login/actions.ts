"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { demoCredentials } from "@/lib/demo";

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type LoginState = { error: string | null; email: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const parsed = schema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { error: "Enter your email and password to log in.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Wrong email or password. Check both and try again.", email };

  redirect("/");
}

/** Logs in to the shared, read-only demo account. */
export async function loginDemo(): Promise<string | null> {
  const credentials = demoCredentials();
  if (!credentials) return "The demo isn’t available right now.";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) return "Couldn’t open the demo. Try again in a moment.";

  redirect("/");
}
