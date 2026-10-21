import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourcePage, clientCol, clientField, fmtDate, openClientFile, uploadClientFile } from "@/components/portal/ResourcePage";
import { useAdmin } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/admin/files")({
  head: () => ({ meta: [{ title: "Files | ScaleStack Admin" }] }),
  component: Files,
});

function Files() {
  const { user } = useAdmin();
  return (
    <ResourcePage
      title="Files & deliverables"
      description="Publish deliverables to clients and review files they share."
      table="files"
      select="*, clients(company_name)"
      createLabel="Upload deliverable"
      canEdit={false}
      fields={[
        clientField,
        { name: "file", label: "File", type: "file", required: true },
        { name: "category", label: "Category", type: "select", default: "deliverable", options: ["deliverable", "design", "contract", "document"].map((v) => ({ value: v, label: v })) },
        { name: "is_deliverable", label: "Mark as deliverable", type: "checkbox", default: true },
      ]}
      prepare={async (v) => {
        const file = v.file as File;
        const path = await uploadClientFile(v.client_id, file);
        return { client_id: v.client_id, name: file.name, storage_path: path, size: file.size, mime_type: file.type, category: v.category ?? "deliverable", is_deliverable: !!v.is_deliverable, uploaded_by: user.id };
      }}
      columns={[
        { key: "name", label: "File", className: "font-medium" },
        clientCol,
        { key: "category", label: "Category", className: "capitalize" },
        { key: "is_deliverable", label: "Type", render: (r) => (r.is_deliverable ? "Deliverable" : "Client upload") },
        { key: "created_at", label: "Date", render: (r) => fmtDate(r.created_at) },
      ]}
      rowActions={(r) => <Button variant="ghost" size="icon" aria-label="Download" onClick={() => openClientFile(r.storage_path)}><Download /></Button>}
    />
  );
}
