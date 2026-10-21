import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage, clientCol, clientField, fmtDateTime } from "@/components/portal/ResourcePage";

export const Route = createFileRoute("/_authenticated/admin/meetings")({
  head: () => ({ meta: [{ title: "Meetings | ScaleStack Admin" }] }),
  component: Meetings,
});

function Meetings() {
  const fields = [
    { name: "title", label: "Title", required: true },
    { name: "scheduled_at", label: "Date & time", type: "datetime" as const, required: true },
    { name: "duration_minutes", label: "Duration (minutes)", type: "number" as const, default: 30 },
    { name: "meeting_url", label: "Meeting link" },
    { name: "notes", label: "Notes", type: "textarea" as const },
  ];
  return (
    <ResourcePage
      title="Meetings"
      description="Schedule calls with clients."
      table="meetings"
      select="*, clients(company_name)"
      order="scheduled_at"
      createLabel="Schedule meeting"
      fields={[clientField, ...fields]}
      editFields={fields}
      columns={[
        { key: "title", label: "Meeting", className: "font-medium" },
        clientCol,
        { key: "scheduled_at", label: "When", render: (r) => fmtDateTime(r.scheduled_at) },
        { key: "duration_minutes", label: "Duration", render: (r) => `${r.duration_minutes} min` },
      ]}
    />
  );
}
