import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage, fmtDate } from "@/components/portal/ResourcePage";
import { PageHeader, StatusBadge, money } from "@/components/portal/AppShell";
import { usePortal } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/portal/billing")({
  head: () => ({ meta: [{ title: "Billing | ScaleStack Portal" }] }),
  component: Billing,
});

function Billing() {
  const { client } = usePortal();
  return (
    <div className="space-y-8">
      <PageHeader title="Billing & invoices" description="Your invoices and payment history. Contact your account manager to pay by bank transfer." />
      <ResourcePage
        header={false}
        title="Invoices"
        table="invoices"
        filter={(q) => q.eq("client_id", client.id)}
        canCreate={false}
        canEdit={false}
        canDelete={false}
        order="issue_date"
        columns={[
          { key: "number", label: "Invoice", className: "font-medium" },
          { key: "description", label: "Description", className: "text-muted-foreground" },
          { key: "issue_date", label: "Issued", render: (r) => fmtDate(r.issue_date) },
          { key: "due_date", label: "Due", render: (r) => fmtDate(r.due_date) },
          { key: "amount", label: "Amount", render: (r) => money(r.amount) },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
        ]}
      />
      <div>
        <h2 className="mb-3 text-sm font-semibold">Payments</h2>
        <ResourcePage
          header={false}
          title="Payments"
          table="payments"
          select="*, invoices(number)"
          filter={(q) => q.eq("client_id", client.id)}
          canCreate={false}
          canEdit={false}
          canDelete={false}
          order="paid_at"
          columns={[
            { key: "paid_at", label: "Date", render: (r) => fmtDate(r.paid_at) },
            { key: "invoice", label: "Invoice", render: (r) => r.invoices?.number },
            { key: "method", label: "Method" },
            { key: "amount", label: "Amount", render: (r) => money(r.amount) },
          ]}
        />
      </div>
    </div>
  );
}
