import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CreditCard, Download, FolderKanban, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Panel, StatCard, StatusBadge, money } from "@/components/portal/AppShell";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, openClientFile } from "@/components/portal/ResourcePage";
import { MetricGrid } from "@/components/portal/MetricGrid";
import type { Metric } from "@/lib/metrics";
import { sectionsFor } from "@/lib/personalize";
import { usePortal } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/portal/")({
  head: () => ({ meta: [{ title: "Overview | ScaleStack Portal" }] }),
  component: Overview,
});

function Overview() {
  const { client, user } = usePortal();
  const data = useQuery({
    queryKey: ["portal-overview", client.id, user.id],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [subs, projects, reports, invoices, milestones, notifs, files, meetings] = await Promise.all([
        supabase.from("subscriptions").select("id, plans(name, price, services(name, service_categories(slug)))").eq("client_id", client.id).eq("status", "active"),
        supabase.from("projects").select("*").eq("client_id", client.id).neq("status", "completed").order("due_date"),
        supabase.from("reports").select("id, title, period, metrics, created_at, file_path").eq("client_id", client.id).eq("published", true).order("created_at", { ascending: false }).limit(3),
        supabase.from("invoices").select("*").eq("client_id", client.id).in("status", ["pending", "overdue"]).order("due_date"),
        supabase.from("milestones").select("*, projects(name)").eq("client_id", client.id).eq("completed", false).gte("due_date", today).order("due_date").limit(5),
        supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("files").select("id, name, storage_path, created_at").eq("client_id", client.id).eq("is_deliverable", true).order("created_at", { ascending: false }).limit(5),
        supabase.from("meetings").select("*").eq("client_id", client.id).gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(3),
      ]);
      const err = [subs, projects, reports, invoices, milestones, notifs, files, meetings].find((r) => r.error)?.error;
      if (err) throw err;
      return {
        subs: subs.data ?? [], projects: projects.data ?? [], reports: reports.data ?? [], invoices: invoices.data ?? [],
        milestones: milestones.data ?? [], notifs: notifs.data ?? [], files: files.data ?? [], meetings: meetings.data ?? [],
      };
    },
  });
  const d = data.data;

  if (data.isLoading) return <div className="rounded-xl border bg-card"><EmptyState text="Loading your dashboard..." /></div>;
  if (data.error || !d) return <div className="rounded-xl border bg-card"><EmptyState text="Your dashboard could not be loaded. Please refresh the page." /></div>;

  const slugs = d.subs.map((s) => s.plans?.services?.service_categories?.slug).filter((x): x is string => !!x);
  const sec = sectionsFor(slugs);
  // Always show a section that already has real data, even if the service mix changed.
  const showProjects = sec.projects || d.projects.length > 0;
  const showPerformance = sec.performance || d.reports.length > 0;
  const showDeliverables = sec.deliverables || d.files.length > 0;
  const due = d.invoices.reduce((s, i) => s + Number(i.amount), 0);
  const latest = d.reports[0];

  return (
    <div>
      <PageHeader title={`Welcome, ${client.company_name}`} description="Here is what is happening across your account." />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Active services" value={d.subs.length} icon={Package} />
        {showProjects && <StatCard label="Projects in progress" value={d.projects.length} icon={FolderKanban} />}
        <StatCard label="Outstanding" value={money(due)} icon={CreditCard} hint={`${d.invoices.length} pending invoice${d.invoices.length === 1 ? "" : "s"}`} />
        {showProjects && <StatCard label="Upcoming deadlines" value={d.milestones.length} icon={CalendarClock} />}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {showPerformance && (
          <Panel title={latest ? `Latest performance — ${latest.period ?? fmtDate(latest.created_at)}` : "Performance"} className="lg:col-span-2"
            action={<Link to="/portal/reports" className="text-xs text-primary">All reports</Link>}>
            {latest && (latest.metrics as Metric[])?.length ? (
              <><div className="mb-3 text-sm font-medium">{latest.title}</div><MetricGrid metrics={latest.metrics as Metric[]} /></>
            ) : (
              <EmptyState text={latest ? "Your latest report has no headline metrics. Open it for details." : "Your first performance report will appear here once published."} />
            )}
          </Panel>
        )}
        {showProjects && (
          <Panel title="Project progress" className="lg:col-span-2" action={<Link to="/portal/projects" className="text-xs text-primary">View all</Link>}>
            {!d.projects.length ? <EmptyState text="No active projects." /> : (
              <div className="space-y-5">
                {d.projects.map((p) => (
                  <div key={p.id}>
                    <div className="mb-1.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-sm">
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="flex items-center gap-2 text-muted-foreground"><StatusBadge value={p.status} /> {p.progress}%</span>
                    </div>
                    <Progress value={p.progress} className="h-1.5" />
                    <div className="mt-1 text-xs text-muted-foreground">Due {fmtDate(p.due_date)}</div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}
        <Panel title="Your services">
          {!d.subs.length ? <EmptyState text="No active services yet." /> : (
            <ul className="space-y-3">
              {d.subs.map((s) => (
                <li key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-sm">
                  <div className="min-w-0"><div className="truncate font-medium">{s.plans?.services?.name}</div><div className="text-xs text-muted-foreground">{s.plans?.name} plan</div></div>
                  <span className="text-muted-foreground">{money(s.plans?.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {d.invoices.length > 0 && (
          <Panel title="Pending invoices" action={<Link to="/portal/billing" className="text-xs text-primary">Billing</Link>}>
            <ul className="space-y-3 text-sm">
              {d.invoices.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2">
                  <div><div className="font-medium">{i.number}</div><div className="text-xs text-muted-foreground">Due {fmtDate(i.due_date)}</div></div>
                  <div className="text-right"><div>{money(i.amount)}</div><StatusBadge value={i.status} /></div>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {showProjects && d.milestones.length > 0 && (
          <Panel title="Upcoming deadlines">
            <ul className="space-y-3 text-sm">
              {d.milestones.map((m) => (
                <li key={m.id}><div className="font-medium">{m.title}</div><div className="text-xs text-muted-foreground">{m.projects?.name} · {fmtDate(m.due_date)}</div></li>
              ))}
            </ul>
          </Panel>
        )}
        {showDeliverables && (
          <Panel title="Latest deliverables" action={<Link to="/portal/files" className="text-xs text-primary">All files</Link>}>
            {!d.files.length ? <EmptyState text="Deliverables will appear here when shared." /> : (
              <ul className="space-y-2 text-sm">
                {d.files.map((f) => (
                  <li key={f.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <span className="truncate">{f.name}</span>
                    <Button variant="ghost" size="icon" aria-label={`Download ${f.name}`} onClick={() => openClientFile(f.storage_path)}><Download /></Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
        {d.meetings.length > 0 && (
          <Panel title="Upcoming meetings" action={<Link to="/portal/meetings" className="text-xs text-primary">All meetings</Link>}>
            <ul className="space-y-3 text-sm">
              {d.meetings.map((m) => <li key={m.id}><div className="font-medium">{m.title}</div><div className="text-xs text-muted-foreground">{fmtDateTime(m.scheduled_at)}</div></li>)}
            </ul>
          </Panel>
        )}
        <Panel title="Notifications" className="lg:col-span-3" action={<Link to="/portal/notifications" className="text-xs text-primary">View all</Link>}>
          {!d.notifs.length ? <EmptyState text="You're all caught up." /> : (
            <ul className="divide-y text-sm">
              {d.notifs.map((n) => (
                <li key={n.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 py-2.5">
                  <span className={`truncate ${n.read ? "" : "font-medium"}`}>{n.title}</span>
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
