import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MailPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourcePage, fmtDate, clientField } from "@/components/portal/ResourcePage";
import { StatusBadge, money } from "@/components/portal/AppShell";
import { InviteDialog } from "@/components/portal/InviteDialog";
import { useAdmin } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/admin/clients")({
  head: () => ({ meta: [{ title: "Clients | ScaleStack Admin" }] }),
  component: Clients,
});

function Clients() {
  const { isAdmin } = useAdmin();
  const [inviteFor, setInviteFor] = useState<string | null>(null);
  const clientFields = [
    { name: "company_name", label: "Company name", required: true },
    { name: "contact_name", label: "Contact name" },
    { name: "contact_email", label: "Contact email", type: "email" as const },
    { name: "phone", label: "Phone" },
    { name: "website", label: "Website" },
    { name: "status", label: "Status", type: "select" as const, default: "active", options: ["active", "paused", "archived"].map((v) => ({ value: v, label: v })) },
    { name: "notes", label: "Internal notes", type: "textarea" as const },
  ];
  return (
    <div className="space-y-10">
      <ResourcePage
        title="Client management"
        description="Companies you work with. Invite their staff to give them portal access."
        table="clients"
        createLabel="New client"
        canCreate={isAdmin}
        canEdit={isAdmin}
        canDelete={isAdmin}
        fields={clientFields}
        columns={[
          { key: "company_name", label: "Company", className: "font-medium" },
          { key: "contact_name", label: "Contact", render: (r) => <div>{r.contact_name ?? "—"}<div className="text-xs text-muted-foreground">{r.contact_email}</div></div> },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          { key: "created_at", label: "Since", render: (r) => fmtDate(r.created_at) },
        ]}
        rowActions={(r) => isAdmin ? (
          <Button variant="ghost" size="sm" onClick={() => setInviteFor(r.id)}><MailPlus /> Invite</Button>
        ) : null}
      />
      <div>
        <h2 className="mb-1 text-lg font-semibold">Assigned plans</h2>
        <p className="mb-3 text-sm text-muted-foreground">Which services each client is subscribed to.</p>
        <ResourcePage
          header={false}
          title="Subscriptions"
          table="subscriptions"
          select="*, clients(company_name), plans(name, price, services(name))"
          createLabel="Assign plan"
          fields={[
            clientField,
            { name: "plan_id", label: "Plan", type: "select", required: true, source: { table: "plans_with_service", label: "label" } },
            { name: "status", label: "Status", type: "select", default: "active", options: ["active", "paused", "cancelled"].map((v) => ({ value: v, label: v })) },
            { name: "start_date", label: "Start date", type: "date" },
            { name: "renewal_date", label: "Renewal date", type: "date" },
          ]}
          editFields={[
            { name: "status", label: "Status", type: "select", options: ["active", "paused", "cancelled"].map((v) => ({ value: v, label: v })) },
            { name: "renewal_date", label: "Renewal date", type: "date" },
          ]}
          prepare={async (v) => { if (!v.start_date) delete v.start_date; return v; }}
          columns={[
            { key: "client", label: "Client", render: (r) => r.clients?.company_name },
            { key: "plan", label: "Service / plan", render: (r) => `${r.plans?.services?.name} — ${r.plans?.name}` },
            { key: "price", label: "Price", render: (r) => money(r.plans?.price) },
            { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
            { key: "renewal_date", label: "Renews", render: (r) => fmtDate(r.renewal_date) },
          ]}
        />
      </div>
      <InviteDialog open={!!inviteFor} onClose={() => setInviteFor(null)} role="client" clientId={inviteFor ?? undefined} />
    </div>
  );
}
