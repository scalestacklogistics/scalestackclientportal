import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage, clientCol, fmtDate } from "@/components/portal/ResourcePage";
import { StatusBadge } from "@/components/portal/AppShell";

export const Route = createFileRoute("/_authenticated/admin/tickets")({
  head: () => ({ meta: [{ title: "Support Tickets | ScaleStack Admin" }] }),
  component: Tickets,
});

function Tickets() {
  return (
    <ResourcePage
      title="Support tickets"
      description="Requests opened by clients."
      table="tickets"
      select="*, clients(company_name)"
      canCreate={false}
      editFields={[
        { name: "status", label: "Status", type: "select", options: ["open", "in_progress", "resolved", "closed"].map((v) => ({ value: v, label: v.replace("_", " ") })) },
        { name: "priority", label: "Priority", type: "select", options: ["low", "normal", "high", "urgent"].map((v) => ({ value: v, label: v })) },
      ]}
      prepare={async (v) => ({ ...v, updated_at: new Date().toISOString() })}
      columns={[
        { key: "subject", label: "Subject", render: (r) => <div><div className="font-medium">{r.subject}</div><div className="max-w-md text-xs text-muted-foreground">{r.description}</div></div> },
        clientCol,
        { key: "priority", label: "Priority", render: (r) => <StatusBadge value={r.priority} /> },
        { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
        { key: "created_at", label: "Opened", render: (r) => fmtDate(r.created_at) },
      ]}
    />
  );
}
