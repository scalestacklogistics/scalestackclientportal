import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, PageHeader, StatusBadge } from "@/components/portal/AppShell";
import { Progress } from "@/components/ui/progress";
import { fmtDate } from "@/components/portal/ResourcePage";
import { usePortal } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/portal/projects")({
  head: () => ({ meta: [{ title: "Projects | ScaleStack Portal" }] }),
  component: Projects,
});

function Projects() {
  const { client } = usePortal();
  const q = useQuery({
    queryKey: ["portal-projects", client.id],
    queryFn: async () =>
      (await supabase.from("projects").select("*, milestones(*)").eq("client_id", client.id).order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div>
      <PageHeader title="Projects & milestones" description="Track progress on everything we are building for you." />
      {!q.data?.length && <div className="rounded-xl border bg-card"><EmptyState text="No projects yet." /></div>}
      <div className="space-y-4">
        {q.data?.map((p) => (
          <div key={p.id} className="rounded-xl border bg-card p-6 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{p.name}</h3>
                {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
              </div>
              <StatusBadge value={p.status} />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Progress value={p.progress} className="h-1.5 flex-1" />
              <span className="text-sm font-medium">{p.progress}%</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {fmtDate(p.start_date)} – {fmtDate(p.due_date)}
            </div>
            {p.milestones.length > 0 && (
              <ul className="mt-5 space-y-2 border-t pt-4">
                {[...p.milestones]
                  .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
                  .map((m) => (
                    <li key={m.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {m.completed ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                        <span className={m.completed ? "text-muted-foreground line-through" : ""}>{m.title}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{fmtDate(m.due_date)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
