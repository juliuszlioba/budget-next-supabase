import type { Metadata } from "next";
import { AppLogo } from "@/components/app-logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in · Budget" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 pt-[calc(3rem+env(safe-area-inset-top))] pb-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3 px-1">
          <AppLogo className="size-10" />
          <span className="text-lg font-semibold tracking-tight">Budget</span>
        </div>

        <section className="rounded-3xl bg-card p-6 shadow-2xl shadow-black/40 ring-1 ring-border">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Log in to your budget</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">Private access. Your data stays yours.</p>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
