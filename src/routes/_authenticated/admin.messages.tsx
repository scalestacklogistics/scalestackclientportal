import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/portal/AppShell";
import { MessageThread } from "@/components/portal/Messages";
import { useOptions } from "@/components/portal/ResourcePage";
import { useAdmin } from "@/lib/route-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/messages")({
  head: () => ({ meta: [{ title: "Messages | ScaleStack Admin" }] }),
  component: Messages,
});

function Messages() {
  const { user } = useAdmin();
  const clients = useOptions({ table: "clients", label: "company_name" });
  const [active, setActive] = useState<string | null>(null);
  const current = active ?? clients.data?.[0]?.value ?? null;
  return (
    <div>
      <PageHeader title="Messages" description="Conversations with each client." />
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="rounded-xl border bg-card p-2 shadow-card">
          {!clients.data?.length && <EmptyState text="No clients." />}
          {clients.data?.map((c) => (
            <button key={c.value} onClick={() => setActive(c.value)}
              className={cn("w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted", current === c.value && "bg-primary-soft font-medium text-primary")}>
              {c.label}
            </button>
          ))}
        </div>
        {current ? <MessageThread key={current} clientId={current} userId={user.id} /> : null}
      </div>
    </div>
  );
}
