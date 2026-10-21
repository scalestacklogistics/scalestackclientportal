import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage, clientCol, clientField, fmtDate } from "@/components/portal/ResourcePage";
import { StatusBadge } from "@/components/portal/AppShell";

export const Route = createFileRoute("/_authenticated/admin/projects")({
  head: () => ({ meta: [{ title: "Projects | ScaleStack Admin" }] }),
  component: Projects,
});

const statuses = ["planning", "in_progress", "review", "completed", "on_hold"].map((v) => ({ value: v, label: v.replace("_", " ") }));

function Projects() {
  const projectFields = [
    { name: "name", label: "Project name", required: true },
    { name: "description", label: "Description", type: "textarea" as const },
    { name: "status", label: "Status", type: "select" as const, default: "planning", options: statuses },
    { name: "progress", label: "Progress (%)", type: "number" as const, default: 0 },
    { name: "start_date", label: "Start date", type: "date" as const },
    { name: "due_date", label: "Due date", type: "date" as const },
  ];
  return (
    <div className="space-y-10">
      <ResourcePage
        title="Projects"
        description="Manage client projects, status and progress."
        table="projects"
        select="*, clients(company_name)"
        createLabel="New project"
        fields={[clientField, ...projectFields]}
        editFields={projectFields}
        prepare={async (v) => ({ ...v, progress: Math.max(0, Math.min(100, Number(v.progress ?? 0))) })}
        columns={[
          { key: "name", label: "Project", className: "font-medium" },
          clientCol,
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          { key: "progress", label: "Progress", render: (r) => `${r.progress}%` },
          { key: "due_date", label: "Due", render: (r) => fmtDate(r.due_date) },
        ]}
      />
      <div>
        <h2 className="mb-3 text-lg font-semibold">Milestones</h2>
        <ResourcePage
          header={false}
          title="Milestones"
          table="milestones"
          select="*, projects(name, client_id), clients(company_name)"
          order="due_date"
          ascending
          createLabel="New milestone"
          fields={[
            { name: "project_id", label: "Project", type: "select", required: true, source: { table: "projects", label: "name" } },
            { name: "title", label: "Title", required: true },
            { name: "due_date", label: "Due date", type: "date" },
            { name: "completed", label: "Completed", type: "checkbox" },
          ]}
          prepare={async (v, mode) => {
            if (mode === "create") {
              const { supabase } = await import("@/integrations/supabase/client");
              const { data } = await supabase.from("projects").select("client_id").eq("id", v.project_id).single();
              return { ...v, client_id: data?.client_id };
            }
            return v;
          }}
          columns={[
            { key: "title", label: "Milestone", className: "font-medium" },
            { key: "project", label: "Project", render: (r) => r.projects?.name },
            clientCol,
            { key: "due_date", label: "Due", render: (r) => fmtDate(r.due_date) },
            { key: "completed", label: "Status", render: (r) => <StatusBadge value={r.completed ? "completed" : "pending"} /> },
          ]}
        />
      </div>
    </div>
  );
}
