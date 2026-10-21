import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import {
  Bell,
  Building2,
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
  Users,
} from "lucide-react";
import { AppShell, type NavItem } from "@/components/portal/AppShell";
import { isStaff } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ context }) => {
    if (!isStaff(context.roles)) throw redirect({ to: "/portal" });
    return { isAdmin: context.roles.includes("admin") };
  },
  head: () => ({ meta: [{ title: "Admin | ScaleStack" }] }),
  component: AdminLayout,
});

const all: (NavItem & { adminOnly?: boolean })[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/clients", label: "Clients", icon: Building2 },
  { to: "/admin/team", label: "Team", icon: Users, adminOnly: true },
  { to: "/admin/services", label: "Services & Plans", icon: Package },
  { to: "/admin/projects", label: "Projects", icon: FolderKanban },
  { to: "/admin/reports", label: "Reports", icon: LineChart },
  { to: "/admin/files", label: "Files", icon: FolderOpen },
  { to: "/admin/invoices", label: "Invoices & Payments", icon: CreditCard },
  { to: "/admin/tickets", label: "Support Tickets", icon: LifeBuoy },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/meetings", label: "Meetings", icon: CalendarDays },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminLayout() {
  const { user, isAdmin } = Route.useRouteContext();
  return (
    <AppShell
      items={all.filter((i) => isAdmin || !i.adminOnly)}
      subtitle={isAdmin ? "Admin" : "Team"}
      userLabel={user.email ?? ""}
      notificationsTo="/admin/notifications"
    >
      <Outlet />
    </AppShell>
  );
}
