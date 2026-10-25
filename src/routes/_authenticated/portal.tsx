import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import {
  Bell,
  CalendarDays,
  CreditCard,
  FolderKanban,
  FolderOpen,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  MessageSquare,
  Package,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, type NavItem } from "@/components/portal/AppShell";
import { isStaff } from "@/lib/auth";
import { Logo } from "@/components/portal/Logo";

export const Route = createFileRoute("/_authenticated/portal")({
  beforeLoad: async ({ context }) => {
    if (isStaff(context.roles)) throw redirect({ to: "/admin" });
    const { data } = await supabase
      .from("client_members")
      .select("client_id, clients(*)")
      .eq("user_id", context.user.id)
      .limit(1)
      .maybeSingle();
    return { client: data?.clients ?? null };
  },
  head: () => ({ meta: [{ title: "Client Portal | ScaleStack" }] }),
  component: PortalLayout,
});

const nav: NavItem[] = [
  { to: "/portal", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/portal/services", label: "Services & Plans", icon: Package },
  { to: "/portal/projects", label: "Projects", icon: FolderKanban },
  { to: "/portal/reports", label: "Reports", icon: LineChart },
  { to: "/portal/files", label: "Files", icon: FolderOpen },
  { to: "/portal/billing", label: "Billing", icon: CreditCard },
  { to: "/portal/support", label: "Support", icon: LifeBuoy },
  { to: "/portal/messages", label: "Messages", icon: MessageSquare },
  { to: "/portal/meetings", label: "Meetings", icon: CalendarDays },
  { to: "/portal/notifications", label: "Notifications", icon: Bell },
  { to: "/portal/settings", label: "Account", icon: Settings },
];

function PortalLayout() {
  const { client, user } = Route.useRouteContext();
  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-xl border bg-card p-8 text-center shadow-card">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <h1 className="text-lg font-bold">Your account is not linked yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as {user.email}. Your ScaleStack account manager needs to invite this email address to your company
            workspace. Contact us if you think this is a mistake.
          </p>
          <button
            className="mt-6 text-sm font-medium text-primary"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }
  return (
    <AppShell items={nav} subtitle={client.company_name} userLabel={user.email ?? ""} notificationsTo="/portal/notifications">
      <Outlet />
    </AppShell>
  );
}

