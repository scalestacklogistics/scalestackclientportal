import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/portal/AppShell";
import { fmtDate, openClientFile } from "@/components/portal/ResourcePage";
import { MetricGrid } from "@/components/portal/MetricGrid";
import type { Metric } from "@/lib/metrics";
import { usePortal } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/portal/reports")({
  head: () => ({ meta: [{ title: "Reports | ScaleStack Portal" }] }),
  component: Reports,
});

function Reports() {
  const { client } = usePortal();
  const [term, setTerm] = useState("");
  const q = useQuery({
    queryKey: ["portal-reports", client.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, title, period, summary, metrics, file_path, created_at, service_categories(name)")
        .eq("client_id", client.id)
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const t = term.trim().toLowerCase();
  const rows = (q.data ?? []).filter((r) => !t || `${r.title} ${r.period ?? ""} ${r.summary ?? ""}`.toLowerCase().includes(t));
  return (
    <div>
      <PageHeader title="Reports & analytics" description="Performance reports published by your account team." />
      {(q.data?.length ?? 0) > 3 && <Input className="mb-4 sm:max-w-xs" placeholder="Search reports..." aria-label="Search reports" value={term} onChange={(e) => setTerm(e.target.value)} />}
      {q.isLoading && <div className="rounded-xl border bg-card"><EmptyState text="Loading..." /></div>}
      {q.error && <div className="rounded-xl border bg-card"><EmptyState text="Reports could not be loaded. Please try again." /></div>}
      {q.data && !rows.length && <div className="rounded-xl border bg-card"><EmptyState text={q.data.length ? "No reports match your search." : "No reports have been published yet."} /></div>}
      <div className="space-y-4">
        {rows.map((r) => (
          <article key={r.id} className="rounded-xl border bg-card p-5 shadow-card sm:p-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-wide text-primary">{r.service_categories?.name ?? "Report"}</div>
                <h3 className="mt-1 truncate font-semibold">{r.title}</h3>
                <div className="text-xs text-muted-foreground">{r.period ?? fmtDate(r.created_at)}</div>
              </div>
              {r.file_path && (
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => openClientFile(r.file_path!)}>
                  <Download /> <span className="hidden sm:inline">Download</span>
                </Button>
              )}
            </div>
            {r.summary && <p className="mt-3 text-sm text-muted-foreground">{r.summary}</p>}
            <div className="mt-4"><MetricGrid metrics={(r.metrics as Metric[]) ?? []} /></div>
          </article>
        ))}
      </div>
    </div>
  );
}
