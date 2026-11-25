"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail, Sparkles, TriangleAlert } from "lucide-react";
import { login, loginDemo, type LoginState } from "./actions";
import { cn } from "@/lib/utils";

const initial: LoginState = { error: null, email: "" };

const field =
  "h-12 w-full rounded-xl bg-inset pl-11 text-base text-foreground ring-1 ring-border outline-none transition-shadow placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring aria-invalid:ring-signal";

export function LoginForm({ demo }: { demo: boolean }) {
  const [state, action, pending] = useActionState(login, initial);
  const [showPassword, setShowPassword] = useState(false);
  const invalid = Boolean(state.error);

  return (
    <>
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="eyebrow">
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            spellCheck={false}
            autoCapitalize="none"
            placeholder="name@example.com…"
            required
            defaultValue={state.email}
            aria-invalid={invalid}
            className={cn(field, "pr-4")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="eyebrow">
          Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Your password…"
            required
            aria-invalid={invalid}
            className={cn(field, "pr-12")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div aria-live="polite" className="empty:hidden">
        {state.error && (
          <p className="flex items-center gap-2 rounded-xl bg-signal-soft px-3 py-2 text-sm text-signal">
            <TriangleAlert className="size-4 shrink-0" />
            {state.error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex h-12 items-center justify-center gap-2 rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98] disabled:opacity-70"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> Logging in…
          </>
        ) : (
          <>
            Log in
          </>
        )}
      </button>
    </form>
    {demo && <DemoLogin />}
    </>
  );
}

/** Opens the shared, read-only demo account. */
function DemoLogin() {
  const [error, action, pending] = useActionState(loginDemo, null);
  return (
    <form action={action} className="mt-6 flex flex-col gap-3 border-t border-border pt-6">
      <button
        type="submit"
        disabled={pending}
        className="flex h-12 items-center justify-center gap-2 rounded-full text-base font-semibold text-foreground ring-1 ring-border transition-[background-color,transform] hover:bg-accent active:scale-[0.98] disabled:opacity-70"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> Opening the demo…
          </>
        ) : (
          <>
            <Sparkles className="size-4 text-primary" /> Try the demo
          </>
        )}
      </button>
      <p aria-live="polite" className="text-center text-xs text-muted-foreground">
        {error ? <span className="text-signal">{error}</span> : "Look around two years of made-up data. Nothing is saved."}
      </p>
    </form>
  );
}
