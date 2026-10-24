import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ResourcePage, clientCol, clientField, fmtDate, openClientFile, uploadClientFile } from "@/components/portal/ResourcePage";
import { StatusBadge } from "@/components/portal/AppShell";
import { ConfirmButton } from "@/components/portal/ConfirmButton";
import { logAudit } from "@/lib/auth";
import { parseMetrics } from "@/lib/metrics";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Reports | ScaleStack Admin" }] }),
  component: Reports,
});

function Reports() {
  const qc = useQueryClient();
  const base = [
    { name: "title", label: "Title", required: true },
    { name: "category_id", label: "Service category", type: "select" as const, source: { table: "service_categories", label: "name" } },
    { name: "period", label: "Period (e.g. September 2026)" },
    { name: "summary", label: "Summary", type: "textarea" as const },
    { name: "metrics", label: "Key metrics — one per line, e.g. ROAS: 4.2x", type: "textarea" as const },
    { name: "file", label: "Report file (PDF etc.)", type: "file" as const },
    { name: "published", label: "Published to client", type: "checkbox" as const },
  ];

  async function setPublished(id: string, published: boolean) {
    const { error } = await supabase.from("reports").update({ published }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAudit(published ? "publish" : "unpublish", "reports", id);
    toast.success(published ? "Report published to the client." : "Report hidden from the client.");
    qc.invalidateQueries({ queryKey: ["resource", "reports"] });
  }

  return (
    <ResourcePage
      title="Reports"
      description="Upload performance reports. Clients only see them — and their files — once published."
      table="reports"
      select="*, clients(company_name), service_categories(name)"
      createLabel="New report"
      searchKeys={["title", "period", "clients.company_name"]}
      filters={[{ key: "published", label: "States", options: [{ value: "true", label: "Published" }, { value: "false", label: "Draft" }] }]}
      fields={[clientField, ...base]}
      editFields={base}
      prepare={async (v, mode, row) => {
        const { file, ...rest } = v;
        rest.metrics = parseMetrics(rest.metrics);
        const clientId = mode === "create" ? rest.client_id : row?.client_id;
        if (file && clientId) rest.file_path = await uploadClientFile(clientId, file as File, "reports");
        return rest;
      }}
      columns={[
        { key: "title", label: "Report", className: "font-medium" },
        { ...clientCol, sortKey: "clients.company_name" },
        { key: "cat", label: "Category", render: (r) => r.service_categories?.name ?? "—" },
        { key: "period", label: "Period" },
        { key: "published", label: "Status", render: (r) => <StatusBadge value={r.published ? "published" : "draft"} /> },
        { key: "created_at", label: "Created", sortKey: "created_at", render: (r) => fmtDate(r.created_at) },
      ]}
      rowActions={(r) => (
        <>
          {r.published ? (
            <ConfirmButton label="Unpublish" title="Hide this report from the client?" description="The client will immediately lose access to the report and its file." onConfirm={() => setPublished(r.id, false)}><EyeOff /></ConfirmButton>
          ) : (
            <ConfirmButton label="Publish" title="Publish this report?" description="The client will be notified and can download it." onConfirm={() => setPublished(r.id, true)}><Eye /></ConfirmButton>
          )}
          {r.file_path ? <Button variant="ghost" size="icon" aria-label="Download" onClick={() => openClientFile(r.file_path)}><Download /></Button> : null}
        </>
      )}
    />
  );
}

