import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourcePage, clientCol, clientField, fmtDate, openClientFile, uploadClientFile } from "@/components/portal/ResourcePage";
import { StatusBadge } from "@/components/portal/AppShell";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Reports | ScaleStack Admin" }] }),
  component: Reports,
});

function Reports() {
  const base = [
    { name: "title", label: "Title", required: true },
    { name: "period", label: "Period (e.g. September 2026)" },
    { name: "summary", label: "Summary", type: "textarea" as const },
    { name: "file", label: "Report file (PDF etc.)", type: "file" as const },
    { name: "published", label: "Published to client", type: "checkbox" as const },
  ];
  return (
    <ResourcePage
      title="Reports"
      description="Upload performance reports. Clients only see them once published."
      table="reports"
      select="*, clients(company_name)"
      createLabel="New report"
      fields={[clientField, ...base]}
      editFields={base}
      prepare={async (v, mode) => {
        const { file, ...rest } = v;
        if (file) {
          const clientId = mode === "create" ? rest.client_id : undefined;
          if (clientId) rest.file_path = await uploadClientFile(clientId, file as File, "reports");
        }
        return rest;
      }}
      columns={[
        { key: "title", label: "Report", className: "font-medium" },
        clientCol,
        { key: "period", label: "Period" },
        { key: "published", label: "Status", render: (r) => <StatusBadge value={r.published ? "published" : "draft"} /> },
        { key: "created_at", label: "Created", render: (r) => fmtDate(r.created_at) },
      ]}
      rowActions={(r) => r.file_path ? (
        <Button variant="ghost" size="icon" aria-label="Download" onClick={() => openClientFile(r.file_path)}><Download /></Button>
      ) : null}
    />
  );
}
