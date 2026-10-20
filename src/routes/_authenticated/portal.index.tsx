import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CreditCard, FolderKanban, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, PageHeader, Panel, StatCard, StatusBadge, money } from "@/components/portal/AppShell";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime } from "@/components/portal/ResourcePage";
import { usePortal } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/portal/")({
  head: () => ({ meta: [{ title: "Overview | ScaleStack Portal" }] }),
  component: Overview,
});

function Overview() {
  const { client, user } = usePortal();
  const data = useQuery({
    queryKey: ["portal-overview", client.id],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [subs, projects, reports, invoices, milestones, notifs] = await Promise.all([
        supabase.from("subscriptions").select("*, plans(name, price, services(name))").eq("client_id", client.id).eq("status", "active"),
        supabase.from("projects").select("*").eq("client_id", client.id).neq("status", "completed").order("due_date"),
        supabase.from("reports").select("*").eq("client_id", client.id).eq("published", true).order("created_at", { ascending: false }).limit(4),
        supabase.from("invoices").select("*").eq("client_id", client.id).in("status", ["pending", "overdue"]).order("due_date"),
        supabase.from("milestones").select("*, projects(name)").eq("client_id", client.id).eq("completed", false).gte("due_date", today).order("due_date").limit(5),
        supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);
      return {
        subs: subs.data ?? [],
        projects: projects.data ?? [],
        reports: reports.data ?? [],
        invoices: invoices.data ?? [],
        milestones: milestones.data ?? [],
        notifs: notifs.data ?? [],
      };
    },
  });
  const d = data.data;
  const due = d?.invoices.reduce((s, i) => s + Number(i.amount), 0) ?? 0;

  return (
    <div>
      <PageHeader title={`Welcome, ${client.company_name}`} description="Here is what is happening across your account." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active services" value={d?.subs.length ?? "—"} icon={Package} />
        <StatCard label="Projects in progress" value={d?.projects.length ?? "—"} icon={FolderKanban} />
        <StatCard label="Outstanding balance" value={money(due)} icon={CreditCard} hint={`${d?.invoices.length ?? 0} pending invoices`} />
        <StatCard label="Upcoming deadlines" value={d?.milestones.length ?? "—"} icon={CalendarClock} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Project progress" className="lg:col-span-2" action={<Link to="/portal/projects" className="text-xs text-primary">View all</Link>}>
          {!d?.projects.length ? (
            <EmptyState text="No active projects." />
          ) : (
            <div className="space-y-5">
              {d.projects.map((p) => (
                <div key={p.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <StatusBadge value={p.status} /> {p.progress}%
                    </span>
                  </div>
                  <Progress value={p.progress} className="h-1.5" />
                  <div className="mt-1 text-xs text-muted-foreground">Due {fmtDate(p.due_date)}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Active services">
          {!d?.subs.length ? (
            <EmptyState text="No active services." />
          ) : (
            <ul className="space-y-3">
              {d.subs.map((s) => (
                <li key={s.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{s.plans?.services?.name}</div>
                    <div className="text-xs text-muted-foreground">{s.plans?.name} plan</div>
                  </div>
                  <span className="text-muted-foreground">{money(s.plans?.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Pending invoices" action={<Link to="/portal/billing" className="text-xs text-primary">Billing</Link>}>
          {!d?.invoices.length ? (
            <EmptyState text="No outstanding invoices." />
          ) : (
            <ul className="space-y-3 text-sm">
              {d.invoices.map((i) => (
                <li key={i.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{i.number}</div>
                    <div className="text-xs text-muted-foreground">Due {fmtDate(i.due_date)}</div>
                  </div>
                  <div className="text-right">
                    <div>{money(i.amount)}</div>
                    <StatusBadge value={i.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Upcoming deadlines">
          {!d?.milestones.length ? (
            <EmptyState text="No upcoming deadlines." />
          ) : (
            <ul className="space-y-3 text-sm">
              {d.milestones.map((m) => (
                <li key={m.id}>
                  <div className="font-medium">{m.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.projects?.name} · {fmtDate(m.due_date)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent reports" action={<Link to="/portal/reports" className="text-xs text-primary">All reports</Link>}>
          {!d?.reports.length ? (
            <EmptyState text="No reports yet." />
          ) : (
            <ul className="space-y-3 text-sm">
              {d.reports.map((r) => (
                <li key={r.id}>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.period ?? fmtDate(r.created_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Notifications" className="lg:col-span-3" action={<Link to="/portal/notifications" className="text-xs text-primary">View all</Link>}>
          {!d?.notifs.length ? (
            <EmptyState text="You're all caught up." />
          ) : (
            <ul className="divide-y text-sm">
              {d.notifs.map((n) => (
                <li key={n.id} className="flex justify-between py-2.5">
                  <span className={n.read ? "" : "font-medium"}>{n.title}</span>
                  <span className="text-xs text-muted-foreground">{fmtDateTime(n.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
