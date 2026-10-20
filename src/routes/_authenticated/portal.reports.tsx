import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourcePage, fmtDate, openClientFile } from "@/components/portal/ResourcePage";
import { usePortal } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/portal/reports")({
  head: () => ({ meta: [{ title: "Reports | ScaleStack Portal" }] }),
  component: Reports,
});

function Reports() {
  const { client } = usePortal();
  return (
    <ResourcePage
      title="Reports & analytics"
      description="Performance reports published by your account team."
      table="reports"
      filter={(q) => q.eq("client_id", client.id).eq("published", true)}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      columns={[
        { key: "title", label: "Report", className: "font-medium" },
        { key: "period", label: "Period" },
        { key: "summary", label: "Summary", className: "max-w-md text-muted-foreground" },
        { key: "created_at", label: "Published", render: (r) => fmtDate(r.created_at) },
      ]}
      rowActions={(r) =>
        r.file_path ? (
          <Button variant="ghost" size="sm" onClick={() => openClientFile(r.file_path)}>
            <Download /> Download
          </Button>
        ) : null
      }
    />
  );
}
