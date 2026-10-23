import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage, clientCol, fmtDate } from "@/components/portal/ResourcePage";
import { StatusBadge } from "@/components/portal/AppShell";
import { TicketThreadButton } from "@/components/portal/TicketThread";
import { useAdmin } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/admin/tickets")({
  head: () => ({ meta: [{ title: "Support Tickets | ScaleStack Admin" }] }),
  component: Tickets,
});

const statuses = ["open", "in_progress", "resolved", "closed"].map((v) => ({ value: v, label: v.replace("_", " ") }));
const priorities = ["low", "normal", "high", "urgent"].map((v) => ({ value: v, label: v }));

function Tickets() {
  const { user } = useAdmin();
  return (
    <ResourcePage
      title="Support tickets"
      description="Requests opened by clients. Reply, prioritise and close them here."
      table="tickets"
      select="*, clients(company_name)"
      canCreate={false}
      searchKeys={["subject", "description", "clients.company_name"]}
      filters={[{ key: "status", label: "Statuses", options: statuses }, { key: "priority", label: "Priorities", options: priorities }]}
      editFields={[
        { name: "status", label: "Status", type: "select", options: statuses },
        { name: "priority", label: "Priority", type: "select", options: priorities },
      ]}
      prepare={async (v) => ({ ...v, updated_at: new Date().toISOString() })}
      columns={[
        { key: "subject", label: "Subject", sortKey: "subject", render: (r) => <div><div className="font-medium">{r.subject}</div><div className="max-w-md truncate text-xs text-muted-foreground">{r.description}</div></div> },
        { ...clientCol, sortKey: "clients.company_name" },
        { key: "priority", label: "Priority", sortKey: "priority", render: (r) => <StatusBadge value={r.priority} /> },
        { key: "status", label: "Status", sortKey: "status", render: (r) => <StatusBadge value={r.status} /> },
        { key: "created_at", label: "Opened", sortKey: "created_at", render: (r) => fmtDate(r.created_at) },
      ]}
      rowActions={(r) => <TicketThreadButton ticket={r} userId={user.id} />}
    />
  );
}
