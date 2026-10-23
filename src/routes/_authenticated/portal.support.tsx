import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage, fmtDate } from "@/components/portal/ResourcePage";
import { StatusBadge } from "@/components/portal/AppShell";
import { TicketThreadButton } from "@/components/portal/TicketThread";
import { usePortal } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/portal/support")({
  head: () => ({ meta: [{ title: "Support | ScaleStack Portal" }] }),
  component: Support,
});

function Support() {
  const { client, user } = usePortal();
  return (
    <ResourcePage
      title="Support center"
      description="Open a ticket and follow the conversation with our team."
      table="tickets"
      filter={(q) => q.eq("client_id", client.id)}
      createLabel="New ticket"
      canEdit={false}
      canDelete={false}
      searchKeys={["subject", "description"]}
      filters={[{ key: "status", label: "Statuses", options: ["open", "in_progress", "resolved", "closed"].map((v) => ({ value: v, label: v.replace("_", " ") })) }]}
      fields={[
        { name: "subject", label: "Subject", required: true },
        { name: "description", label: "Describe the issue", type: "textarea", required: true },
        { name: "priority", label: "Priority", type: "select", default: "normal", options: ["low", "normal", "high", "urgent"].map((v) => ({ value: v, label: v })) },
      ]}
      prepare={async (v) => {
        if (String(v.subject).length > 200) throw new Error("Subject must be under 200 characters.");
        if (String(v.description).length > 5000) throw new Error("Description must be under 5000 characters.");
        return { ...v, client_id: client.id, created_by: user.id };
      }}
      columns={[
        { key: "subject", label: "Subject", className: "font-medium" },
        { key: "priority", label: "Priority", render: (r) => <StatusBadge value={r.priority} /> },
        { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
        { key: "created_at", label: "Opened", sortKey: "created_at", render: (r) => fmtDate(r.created_at) },
      ]}
      rowActions={(r) => <TicketThreadButton ticket={r} userId={user.id} />}
    />
  );
}
