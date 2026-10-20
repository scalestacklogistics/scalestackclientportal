import { createFileRoute } from "@tanstack/react-router";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourcePage, fmtDateTime } from "@/components/portal/ResourcePage";
import { usePortal } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/portal/meetings")({
  head: () => ({ meta: [{ title: "Meetings | ScaleStack Portal" }] }),
  component: Meetings,
});

function Meetings() {
  const { client } = usePortal();
  return (
    <ResourcePage
      title="Meetings"
      description="Scheduled calls with your account team."
      table="meetings"
      filter={(q) => q.eq("client_id", client.id)}
      order="scheduled_at"
      ascending
      canCreate={false}
      canEdit={false}
      canDelete={false}
      columns={[
        { key: "title", label: "Meeting", className: "font-medium" },
        { key: "scheduled_at", label: "When", render: (r) => fmtDateTime(r.scheduled_at) },
        { key: "duration_minutes", label: "Duration", render: (r) => `${r.duration_minutes} min` },
        { key: "notes", label: "Notes", className: "text-muted-foreground" },
      ]}
      rowActions={(r) =>
        r.meeting_url ? (
          <Button variant="outline" size="sm" asChild>
            <a href={r.meeting_url} target="_blank" rel="noreferrer">
              <Video /> Join
            </a>
          </Button>
        ) : null
      }
    />
  );
}
