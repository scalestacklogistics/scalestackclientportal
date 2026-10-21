import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, CreditCard, FolderKanban, LifeBuoy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, PageHeader, Panel, StatCard, StatusBadge, money } from "@/components/portal/AppShell";
import { fmtDate } from "@/components/portal/ResourcePage";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin overview | ScaleStack" }] }),
  component: AdminOverview,
});

function AdminOverview() {
  const q = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [clients, projects, invoices, tickets] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("projects").select("*, clients(company_name)").neq("status", "completed").order("due_date").limit(6),
        supabase.from("invoices").select("*, clients(company_name)").in("status", ["pending", "overdue"]).order("due_date"),
        supabase.from("tickets").select("*, clients(company_name)").neq("status", "closed").order("created_at", { ascending: false }).limit(6),
      ]);
      return { clients: clients.count ?? 0, projects: projects.data ?? [], invoices: invoices.data ?? [], tickets: tickets.data ?? [] };
    },
  });
  const d = q.data;
  return (
    <div>
      <PageHeader title="Agency overview" description="Everything across the clients you can access." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Clients" value={d?.clients ?? "—"} icon={Building2} />
        <StatCard label="Active projects" value={d?.projects.length ?? "—"} icon={FolderKanban} />
        <StatCard label="Outstanding" value={money(d?.invoices.reduce((s, i) => s + Number(i.amount), 0))} icon={CreditCard} />
        <StatCard label="Open tickets" value={d?.tickets.length ?? "—"} icon={LifeBuoy} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Active projects" action={<Link to="/admin/projects" className="text-xs text-primary">Manage</Link>}>
          {!d?.projects.length ? <EmptyState text="No active projects." /> : (
            <ul className="divide-y text-sm">
              {d.projects.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <div><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.clients?.company_name} · due {fmtDate(p.due_date)}</div></div>
                  <span className="text-muted-foreground">{p.progress}%</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Open tickets" action={<Link to="/admin/tickets" className="text-xs text-primary">Manage</Link>}>
          {!d?.tickets.length ? <EmptyState text="No open tickets." /> : (
            <ul className="divide-y text-sm">
              {d.tickets.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2.5">
                  <div><div className="font-medium">{t.subject}</div><div className="text-xs text-muted-foreground">{t.clients?.company_name}</div></div>
                  <StatusBadge value={t.priority} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
