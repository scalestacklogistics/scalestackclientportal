import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader, StatusBadge } from "@/components/portal/AppShell";
import { ResourcePage, clientField } from "@/components/portal/ResourcePage";
import { InviteDialog } from "@/components/portal/InviteDialog";
import { setUserRole } from "@/lib/admin.functions";
import { ConfirmButton } from "@/components/portal/ConfirmButton";

export const Route = createFileRoute("/_authenticated/admin/team")({
  beforeLoad: ({ context }) => {
    if (!context.isAdmin) throw redirect({ to: "/admin" });
  },
  head: () => ({ meta: [{ title: "Team | ScaleStack Admin" }] }),
  component: Team,
});

function Team() {
  const qc = useQueryClient();
  const [inviting, setInviting] = useState(false);
  const changeRole = useServerFn(setUserRole);
  const staff = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const { data: roles, error } = await supabase.from("user_roles").select("user_id, role").in("role", ["admin", "team"]);
      if (error) throw error;
      const ids = [...new Set(roles.map((r) => r.user_id))];
      const { data: people } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      return (people ?? []).map((p) => ({ ...p, roles: roles.filter((r) => r.user_id === p.id).map((r) => r.role) }));
    },
  });

  async function toggle(id: string, role: "admin" | "team", grant: boolean) {
    try {
      await changeRole({ data: { targetUserId: id, role, grant } });
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["staff"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Team management"
        description="Team members only see clients they are assigned to."
        actions={<Button onClick={() => setInviting(true)}><UserPlus /> Invite team member</Button>}
      />
      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        {!staff.data?.length ? <EmptyState text={staff.isLoading ? "Loading..." : "No team members yet."} /> : (
          <Table>
            <TableHeader><TableRow className="bg-muted/50"><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Roles</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {staff.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                  <TableCell>{p.email}</TableCell>
                  <TableCell className="space-x-1">{p.roles.map((r) => <StatusBadge key={r} value={r} />)}</TableCell>
                  <TableCell className="text-right">
                    {p.roles.includes("admin") ? (
                      <ConfirmButton size="sm" label="Remove admin" title="Remove admin access?" description="They keep team access to assigned clients only." onConfirm={() => toggle(p.id, "admin", false)}>Remove admin</ConfirmButton>
                    ) : (
                      <ConfirmButton size="sm" label="Make admin" title="Give full admin access?" description="Admins can see every client and manage the whole platform." onConfirm={() => toggle(p.id, "admin", true)}>Make admin</ConfirmButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <div>
        <h2 className="mb-1 text-lg font-semibold">Client assignments</h2>
        <p className="mb-3 text-sm text-muted-foreground">Grant a team member access to a client's workspace.</p>
        <ResourcePage
          header={false}
          title="Assignments"
          table="team_assignments"
          select="*, clients(company_name)"
          createLabel="Assign"
          canEdit={false}
          fields={[
            { name: "user_id", label: "Team member", type: "select", required: true, source: { table: "profiles", label: "email", filter: (q) => q.in("id", (staff.data ?? []).map((s) => s.id)) } },
            clientField,
          ]}
          columns={[
            { key: "user", label: "Team member", render: (r) => staff.data?.find((s) => s.id === r.user_id)?.email ?? r.user_id },
            { key: "client", label: "Client", render: (r) => r.clients?.company_name },
          ]}
        />
      </div>
      <InviteDialog open={inviting} onClose={() => setInviting(false)} role="team" />
    </div>
  );
}
