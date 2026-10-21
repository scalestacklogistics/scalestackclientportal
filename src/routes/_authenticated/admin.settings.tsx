import { createFileRoute } from "@tanstack/react-router";
import { AccountSettings } from "@/components/portal/Shared";
import { ResourcePage, fmtDateTime } from "@/components/portal/ResourcePage";
import { useAdmin } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Settings | ScaleStack Admin" }] }),
  component: Settings,
});

function Settings() {
  const { user, isAdmin } = useAdmin();
  return (
    <div className="space-y-10">
      <AccountSettings userId={user.id} email={user.email} />
      {isAdmin && (
        <>
          <div>
            <h2 className="mb-3 text-lg font-semibold">Invitations</h2>
            <ResourcePage header={false} title="Invitations" table="invitations" select="*, clients(company_name)" canCreate={false} canEdit={false}
              columns={[
                { key: "email", label: "Email", className: "font-medium" },
                { key: "role", label: "Role", className: "capitalize" },
                { key: "client", label: "Client", render: (r) => r.clients?.company_name ?? "—" },
                { key: "accepted_at", label: "Status", render: (r) => (r.accepted_at ? `Accepted ${fmtDateTime(r.accepted_at)}` : "Pending") },
              ]} />
          </div>
          <div>
            <h2 className="mb-3 text-lg font-semibold">Audit log</h2>
            <ResourcePage header={false} title="Audit log" table="audit_logs" canCreate={false} canEdit={false} canDelete={false}
              columns={[
                { key: "created_at", label: "When", render: (r) => fmtDateTime(r.created_at) },
                { key: "action", label: "Action" },
                { key: "entity", label: "Record" },
                { key: "actor_id", label: "By", className: "font-mono text-xs" },
              ]} />
          </div>
        </>
      )}
    </div>
  );
}
