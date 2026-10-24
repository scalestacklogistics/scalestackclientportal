import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ResourcePage, clientCol, clientField, fmtDate } from "@/components/portal/ResourcePage";
import { StatusBadge } from "@/components/portal/AppShell";

export const Route = createFileRoute("/_authenticated/admin/projects")({
  head: () => ({ meta: [{ title: "Projects | ScaleStack Admin" }] }),
  component: Projects,
});

const statuses = ["planning", "in_progress", "review", "completed", "on_hold"].map((v) => ({ value: v, label: v.replace("_", " ") }));
const doneOpts = [{ value: "true", label: "Done" }, { value: "false", label: "Open" }];

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
        description="Manage client projects, milestones and tasks."
        table="projects"
        select="*, clients(company_name)"
        createLabel="New project"
        searchKeys={["name", "clients.company_name"]}
        filters={[{ key: "status", label: "Statuses", options: statuses }]}
        fields={[clientField, ...projectFields]}
        editFields={projectFields}
        prepare={async (v) => {
          const p = Number(v.progress ?? 0);
          if (Number.isNaN(p) || p < 0 || p > 100) throw new Error("Progress must be between 0 and 100.");
          if (v.start_date && v.due_date && v.due_date < v.start_date) throw new Error("Due date must be after the start date.");
          return { ...v, progress: Math.round(p), updated_at: new Date().toISOString() };
        }}
        columns={[
          { key: "name", label: "Project", className: "font-medium" },
          { ...clientCol, sortKey: "clients.company_name" },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          { key: "progress", label: "Progress", sortKey: "progress", render: (r) => `${r.progress}%` },
          { key: "due_date", label: "Due", sortKey: "due_date", render: (r) => fmtDate(r.due_date) },
        ]}
      />
      <div>
        <h2 className="mb-3 text-lg font-semibold">Milestones</h2>
        <ResourcePage
          header={false}
          title="Milestones"
          table="milestones"
          select="*, projects(name), clients(company_name)"
          order="due_date"
          ascending
          createLabel="New milestone"
          searchKeys={["title", "projects.name", "clients.company_name"]}
          filters={[{ key: "completed", label: "States", options: doneOpts }]}
          fields={[
            { name: "project_id", label: "Project", type: "select", required: true, source: { table: "projects", label: "name" } },
            { name: "title", label: "Title", required: true },
            { name: "due_date", label: "Due date", type: "date" },
            { name: "completed", label: "Completed", type: "checkbox" },
          ]}
          editFields={[
            { name: "title", label: "Title", required: true },
            { name: "due_date", label: "Due date", type: "date" },
            { name: "completed", label: "Completed", type: "checkbox" },
          ]}
          prepare={async (v, mode) => {
            if (mode !== "create") return v;
            const { data, error } = await supabase.from("projects").select("client_id").eq("id", v.project_id).single();
            if (error) throw error;
            return { ...v, client_id: data.client_id };
          }}
          columns={[
            { key: "title", label: "Milestone", className: "font-medium" },
            { key: "project", label: "Project", render: (r) => r.projects?.name },
            clientCol,
            { key: "due_date", label: "Due", sortKey: "due_date", render: (r) => fmtDate(r.due_date) },
            { key: "completed", label: "Status", render: (r) => <StatusBadge value={r.completed ? "completed" : "pending"} /> },
          ]}
        />
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Tasks</h2>
        <ResourcePage
          header={false}
          title="Tasks"
          table="tasks"
          select="*, milestones(title, projects(name)), clients(company_name)"
          order="due_date"
          ascending
          createLabel="New task"
          searchKeys={["title", "milestones.title", "clients.company_name"]}
          filters={[{ key: "done", label: "States", options: doneOpts }]}
          fields={[
            { name: "milestone_id", label: "Milestone", type: "select", required: true, source: { table: "milestones", label: "title" } },
            { name: "title", label: "Task", required: true },
            { name: "due_date", label: "Due date", type: "date" },
            { name: "done", label: "Done", type: "checkbox" },
          ]}
          editFields={[
            { name: "title", label: "Task", required: true },
            { name: "due_date", label: "Due date", type: "date" },
            { name: "done", label: "Done", type: "checkbox" },
          ]}
          prepare={async (v, mode) => {
            if (mode !== "create") return v;
            const { data, error } = await supabase.from("milestones").select("client_id").eq("id", v.milestone_id).single();
            if (error) throw error;
            return { ...v, client_id: data.client_id };
          }}
          columns={[
            { key: "title", label: "Task", className: "font-medium" },
            { key: "milestone", label: "Milestone", render: (r) => `${r.milestones?.projects?.name ?? ""} · ${r.milestones?.title ?? ""}` },
            clientCol,
            { key: "due_date", label: "Due", sortKey: "due_date", render: (r) => fmtDate(r.due_date) },
            { key: "done", label: "Status", render: (r) => <StatusBadge value={r.done ? "completed" : "open"} /> },
          ]}
        />
      </div>
    </div>
  );
}
