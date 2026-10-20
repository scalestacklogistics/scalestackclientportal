import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourcePage, fmtDate, openClientFile, uploadClientFile } from "@/components/portal/ResourcePage";
import { usePortal } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/portal/files")({
  head: () => ({ meta: [{ title: "Files | ScaleStack Portal" }] }),
  component: Files,
});

const size = (b?: number) => (b ? (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.ceil(b / 1e3)} KB`) : "—");

function Files() {
  const { client, user } = usePortal();
  return (
    <ResourcePage
      title="Files & documents"
      description="Deliverables from ScaleStack and files you have shared with us."
      table="files"
      filter={(q) => q.eq("client_id", client.id)}
      createLabel="Upload file"
      canEdit={false}
      canDelete={false}
      fields={[
        { name: "file", label: "File", type: "file", required: true },
        { name: "category", label: "Category", type: "select", default: "document", options: ["document", "brand asset", "content", "other"].map((v) => ({ value: v, label: v })) },
      ]}
      prepare={async (v) => {
        const file = v.file as File;
        const path = await uploadClientFile(client.id, file);
        return { client_id: client.id, name: file.name, storage_path: path, size: file.size, mime_type: file.type, category: v.category ?? "document", uploaded_by: user.id };
      }}
      columns={[
        { key: "name", label: "Name", className: "font-medium" },
        { key: "category", label: "Category", className: "capitalize" },
        { key: "is_deliverable", label: "Type", render: (r) => (r.is_deliverable ? "Deliverable" : "Shared by you") },
        { key: "size", label: "Size", render: (r) => size(r.size) },
        { key: "created_at", label: "Date", render: (r) => fmtDate(r.created_at) },
      ]}
      rowActions={(r) => (
        <Button variant="ghost" size="icon" aria-label="Download" onClick={() => openClientFile(r.storage_path)}>
          <Download />
        </Button>
      )}
    />
  );
}
