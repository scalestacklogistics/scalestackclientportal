import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, PageHeader, StatusBadge, money } from "@/components/portal/AppShell";
import { fmtDate } from "@/components/portal/ResourcePage";
import { usePortal } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/portal/services")({
  head: () => ({ meta: [{ title: "Services & Plans | ScaleStack Portal" }] }),
  component: Services,
});

function Services() {
  const { client } = usePortal();
  const q = useQuery({
    queryKey: ["portal-subs", client.id],
    queryFn: async () =>
      (await supabase.from("subscriptions").select("*, plans(*, services(*, service_categories(name)))").eq("client_id", client.id).order("created_at")).data ?? [],
  });
  return (
    <div>
      <PageHeader title="My services & plans" description="Services ScaleStack delivers for you, and what is included." />
      {!q.data?.length && <div className="rounded-xl border bg-card"><EmptyState text="No services assigned yet." /></div>}
      <div className="grid gap-4 md:grid-cols-2">
        {q.data?.map((s) => (
          <div key={s.id} className="rounded-xl border bg-card p-6 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-primary">{s.plans?.services?.service_categories?.name ?? "Service"} · {s.plans?.name} plan</div>
                <h3 className="mt-1 text-lg font-semibold">{s.plans?.services?.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.plans?.services?.description}</p>
              </div>
              <StatusBadge value={s.status} />
            </div>
            <ul className="mt-5 space-y-2">
              {s.plans?.services?.features.map((f: string) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" /> {f}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex justify-between border-t pt-4 text-sm text-muted-foreground">
              <span>
                {money(s.plans?.price)} / {s.plans?.billing_interval}
              </span>
              <span>Renews {fmtDate(s.renewal_date)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
