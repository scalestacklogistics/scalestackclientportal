import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage, fmtDate } from "@/components/portal/ResourcePage";
import { StatusBadge } from "@/components/portal/AppShell";
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
      description="Open a ticket and our team will respond as soon as possible."
      table="tickets"
      filter={(q) => q.eq("client_id", client.id)}
      createLabel="New ticket"
      canEdit={false}
      canDelete={false}
      fields={[
        { name: "subject", label: "Subject", required: true },
        { name: "description", label: "Describe the issue", type: "textarea", required: true },
        { name: "priority", label: "Priority", type: "select", default: "normal", options: ["low", "normal", "high", "urgent"].map((v) => ({ value: v, label: v })) },
      ]}
      prepare={async (v) => ({ ...v, client_id: client.id, created_by: user.id })}
      columns={[
        { key: "subject", label: "Subject", className: "font-medium" },
        { key: "priority", label: "Priority", render: (r) => <StatusBadge value={r.priority} /> },
        { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
        { key: "created_at", label: "Opened", render: (r) => fmtDate(r.created_at) },
      ]}
    />
  );
}
