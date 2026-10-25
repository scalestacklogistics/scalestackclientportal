import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Bell, LogOut, Menu, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

export type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean | undefined };

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav className="space-y-0.5">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to as never}
          onClick={onNavigate}
          activeOptions={{ exact: !!item.exact }}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-sidebar-foreground transition-colors hover:bg-muted"
          activeProps={{ className: "!bg-sidebar-accent !text-sidebar-accent-foreground !font-bold" }}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({
  items,
  subtitle,
  userLabel,
  notificationsTo,
  children,
}: {
  items: NavItem[];
  subtitle: string;
  userLabel: string;
  notificationsTo: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <Logo subtitle={subtitle} />
      </div>
      <div className="flex-1 overflow-y-auto px-3">
        <NavList items={items} onNavigate={() => setOpen(false)} />
      </div>
      <div className="border-t p-3">
        <div className="truncate px-3 pb-2 text-xs text-muted-foreground">{userLabel}</div>
        <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
          <LogOut /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r bg-sidebar lg:block">{sidebar}</aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-card/90 px-4 backdrop-blur lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex h-14 items-center justify-center lg:hidden">
            <Logo markOnly />
          </div>
          <div className="hidden lg:block" />
          <Button variant="ghost" size="icon" asChild aria-label="Notifications">
            <Link to={notificationsTo as never}>
              <Bell />
            </Link>
          </Button>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string | undefined; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card shadow-card", className)}>
      {title && (
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="text-sm font-bold">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, icon: Icon, hint }: { label: string; value: ReactNode; icon: LucideIcon; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

const statusTone: Record<string, string> = {
  active: "bg-success-soft text-success",
  paid: "bg-success-soft text-success",
  completed: "bg-success-soft text-success",
  resolved: "bg-success-soft text-success",
  closed: "bg-muted text-muted-foreground",
  published: "bg-success-soft text-success",
  pending: "bg-warning-soft text-warning",
  open: "bg-primary-soft text-primary",
  in_progress: "bg-primary-soft text-primary",
  overdue: "bg-destructive/10 text-destructive",
  high: "bg-destructive/10 text-destructive",
  urgent: "bg-destructive/10 text-destructive",
};

export function StatusBadge({ value }: { value?: string | null }) {
  if (!value) return null;
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-bold capitalize", statusTone[value] ?? "bg-muted text-muted-foreground")}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{text}</div>;
}

export const money = (n: number | string | null | undefined) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n ?? 0));
