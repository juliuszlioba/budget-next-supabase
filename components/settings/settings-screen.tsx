"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, LogOut, Plus } from "lucide-react";
import type { Category } from "@/lib/dal/types";
import { moveCategory, saveCategory } from "@/lib/actions/categories";
import { logout } from "@/lib/actions/auth";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CategoryIcon } from "@/components/month/category-badge";
import { PageHeader } from "@/components/page-header";
import { useIsDesktop } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { CATEGORY_ICONS, CATEGORY_ICON_KEYS, type CategoryIconKey } from "@/lib/category-icons";

export const PALETTE = [
  { hex: "#f2b340", name: "Amber" },
  { hex: "#e8954a", name: "Orange" },
  { hex: "#c9a46a", name: "Sand" },
  { hex: "#b8875c", name: "Copper" },
  { hex: "#8e8c87", name: "Grey" },
  { hex: "#d97a4a", name: "Rust" },
  { hex: "#e0c27a", name: "Gold" },
  { hex: "#f0a35e", name: "Apricot" },
  { hex: "#6e6c68", name: "Graphite" },
  { hex: "#a8a49c", name: "Stone" },
];

type Editing = { category: Category | null } | null;

export function SettingsScreen({ categories, email }: { categories: Category[]; email: string }) {
  const [editing, setEditing] = useState<Editing>(null);
  const [pending, startTransition] = useTransition();

  const move = (id: string, dir: "up" | "down") =>
    startTransition(async () => {
      const res = await moveCategory(id, dir);
      if (!res.ok) toast.error(res.error);
    });

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-4 lg:max-w-2xl lg:pt-8">
      <PageHeader title="Settings" />
      <p className="eyebrow mb-2 px-1">Categories</p>
      <ul className="mb-3 overflow-hidden rounded-3xl bg-card p-1.5 ring-1 ring-border">
        {categories.map((c, i) => (
          <li key={c.id} className={cn("flex items-center gap-2 rounded-2xl pr-2 hover:bg-inset", c.archived && "opacity-50")}>
            <button
              type="button"
              onClick={() => setEditing({ category: c })}
              className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 text-left"
            >
              <CategoryIcon category={c} />
              <span className="min-w-0 flex-1 truncate text-[15px]">{c.name}</span>
              {c.isEssential && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">essential</span>
              )}
              {c.archived && <span className="text-[11px] text-muted-foreground">archived</span>}
            </button>
            <span className="flex flex-col">
              <button
                type="button"
                aria-label={`Move ${c.name} up`}
                disabled={pending || i === 0}
                onClick={() => move(c.id, "up")}
                className="rounded p-0.5 text-muted-foreground hover:bg-accent disabled:opacity-25"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Move ${c.name} down`}
                disabled={pending || i === categories.length - 1}
                onClick={() => move(c.id, "down")}
                className="rounded p-0.5 text-muted-foreground hover:bg-accent disabled:opacity-25"
              >
                <ArrowDown className="size-3.5" />
              </button>
            </span>
          </li>
        ))}
      </ul>
      <Button variant="outline" className="mb-8 h-11 w-full rounded-full" onClick={() => setEditing({ category: null })}>
        <Plus className="size-4" /> Add a category
      </Button>

      <p className="eyebrow mb-2 px-1">Account</p>
      <div className="flex items-center justify-between rounded-3xl bg-card px-5 py-4 ring-1 ring-border">
        <span className="truncate text-sm">{email}</span>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut className="size-4" /> Log out
          </Button>
        </form>
      </div>

      <CategorySheet editing={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function CategorySheet({ editing, onClose }: { editing: Editing; onClose: () => void }) {
  const isDesktop = useIsDesktop();
  return (
    <Sheet open={editing !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "gap-0 overflow-y-auto overscroll-contain",
          isDesktop ? "w-[420px] bg-card sm:max-w-[420px]" : "max-h-[94dvh] rounded-t-3xl border-t-0 bg-card pb-[env(safe-area-inset-bottom)] ring-1 ring-border",
        )}
      >
        {editing && <CategoryForm key={editing.category?.id ?? "new"} category={editing.category} onDone={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function CategoryForm({ category, onDone }: { category: Category | null; onDone: () => void }) {
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState<CategoryIconKey>(
    CATEGORY_ICON_KEYS.includes(category?.icon as CategoryIconKey) ? (category!.icon as CategoryIconKey) : "package",
  );
  const [color, setColor] = useState(category?.color ?? PALETTE[0].hex);
  const [isEssential, setIsEssential] = useState(category?.isEssential ?? false);
  const [archived, setArchived] = useState(category?.archived ?? false);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await saveCategory({ id: category?.id ?? null, name: name.trim(), icon, color, isEssential, archived });
      if (!res.ok) toast.error(res.error);
      else onDone();
    });
  }

  return (
    <>
      <SheetHeader className="px-4 pt-4">
        <SheetTitle>{category ? "Edit category" : "New category"}</SheetTitle>
        <SheetDescription>Essential categories make up the Essentials total.</SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 px-4 pb-4">
        <div className="flex items-end gap-3">
          <CategoryIcon category={{ id: "", name, icon, color, isEssential, sortOrder: 0, archived }} className="size-11" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input autoComplete="off" id="cat-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 text-base" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Icon</Label>
          <div className="grid grid-cols-9 gap-1" role="radiogroup" aria-label="Icon">
            {CATEGORY_ICON_KEYS.map((key) => {
              const Icon = CATEGORY_ICONS[key];
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={icon === key}
                  aria-label={key.replace(/-/g, " ")}
                  onClick={() => setIcon(key)}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    icon === key && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  )}
                >
                  <Icon className="size-4.5" strokeWidth={1.9} />
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Colour</Label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
            {PALETTE.map((c) => (
              <button
                key={c.hex}
                type="button"
                role="radio"
                aria-checked={color === c.hex}
                aria-label={c.name}
                title={c.name}
                onClick={() => setColor(c.hex)}
                className={cn("size-9 rounded-full ring-offset-2 ring-offset-background", color === c.hex && "ring-2 ring-foreground")}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1 rounded-xl bg-inset px-3 py-1">
          <label className="flex items-center justify-between py-2 text-sm">
            Essential
            <Switch checked={isEssential} onCheckedChange={(v) => setIsEssential(Boolean(v))} />
          </label>
          {category && (
            <label className="flex items-center justify-between py-2 text-sm">
              <span>
                Archived
                <span className="block text-xs text-muted-foreground">Hidden when adding, kept in history</span>
              </span>
              <Switch checked={archived} onCheckedChange={(v) => setArchived(Boolean(v))} />
            </label>
          )}
        </div>
        <Button onClick={save} disabled={pending || !name.trim()} className="h-12 rounded-full text-base font-semibold">
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </>
  );
}
