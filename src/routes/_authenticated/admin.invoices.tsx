import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ResourcePage, clientCol, clientField, fmtDate } from "@/components/portal/ResourcePage";
import { StatusBadge, money } from "@/components/portal/AppShell";

export const Route = createFileRoute("/_authenticated/admin/invoices")({
  head: () => ({ meta: [{ title: "Invoices & Payments | ScaleStack Admin" }] }),
  component: Invoices,
});

const statuses = ["draft", "pending", "paid", "overdue", "void"].map((v) => ({ value: v, label: v }));

function Invoices() {
  const qc = useQueryClient();
  const fields = [
    { name: "number", label: "Invoice number", required: true },
    { name: "description", label: "Description" },
    { name: "amount", label: "Amount (GBP)", type: "number" as const, required: true },
    { name: "status", label: "Status", type: "select" as const, default: "pending", options: statuses },
    { name: "issue_date", label: "Issue date", type: "date" as const },
    { name: "due_date", label: "Due date", type: "date" as const },
  ];
  return (
    <div className="space-y-10">
      <ResourcePage
        title="Invoices & payments"
        description="Create invoices and record payments. Invoices are marked paid automatically once fully paid."
        table="invoices"
        select="*, clients(company_name)"
        createLabel="New invoice"
        fields={[clientField, ...fields]}
        editFields={fields}
        prepare={async (v) => { if (!v.issue_date) delete v.issue_date; return v; }}
        columns={[
          { key: "number", label: "Invoice", className: "font-medium" },
          clientCol,
          { key: "amount", label: "Amount", render: (r) => money(r.amount) },
          { key: "due_date", label: "Due", render: (r) => fmtDate(r.due_date) },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
        ]}
      />
      <div>
        <h2 className="mb-3 text-lg font-semibold">Payments</h2>
        <ResourcePage
          header={false}
          title="Payments"
          table="payments"
          select="*, invoices(number), clients(company_name)"
          order="paid_at"
          createLabel="Record payment"
          canEdit={false}
          fields={[
            { name: "invoice_id", label: "Invoice", type: "select", required: true, source: { table: "invoices", label: "number" } },
            { name: "amount", label: "Amount (GBP)", type: "number", required: true },
            { name: "method", label: "Method", type: "select", default: "bank transfer", options: ["bank transfer", "card", "cash", "other"].map((v) => ({ value: v, label: v })) },
            { name: "paid_at", label: "Paid on", type: "date" },
            { name: "reference", label: "Reference" },
          ]}
          prepare={async (v) => {
            const { data } = await supabase.from("invoices").select("client_id").eq("id", v.invoice_id).single();
            if (!v.paid_at) delete v.paid_at;
            return { ...v, client_id: data?.client_id };
          }}
          afterSave={async () => { qc.invalidateQueries({ queryKey: ["resource", "invoices"] }); }}
          columns={[
            { key: "paid_at", label: "Date", render: (r) => fmtDate(r.paid_at) },
            { key: "invoice", label: "Invoice", render: (r) => r.invoices?.number },
            clientCol,
            { key: "method", label: "Method" },
            { key: "amount", label: "Amount", render: (r) => money(r.amount) },
          ]}
        />
      </div>
    </div>
  );
}
