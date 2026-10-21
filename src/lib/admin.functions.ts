import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  role: z.enum(["client", "team", "admin"]),
  clientId: z.string().uuid().nullable(),
  redirectTo: z.string().url().max(500),
});

/** Admin-only: records an invitation and sends the secure Cloud Auth invite email. */
export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Only administrators can send invitations.");
    if (data.role === "client" && !data.clientId) throw new Error("Choose the client company for this person.");

    // Insert through the caller's RLS-scoped client (admin policy enforces it again).
    const { error: invErr } = await supabase
      .from("invitations")
      .insert({ email: data.email, role: data.role, client_id: data.clientId, created_by: userId });
    if (invErr) throw new Error(invErr.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const origin = new URL(data.redirectTo).origin;
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: `${origin}/reset-password`,
    });

    if (error) {
      // Existing account: link it now instead of emailing an invite.
      const { data: profile } = await supabaseAdmin.from("profiles").select("id").eq("email", data.email).maybeSingle();
      if (!profile) throw new Error(error.message);
      await supabaseAdmin.from("user_roles").upsert({ user_id: profile.id, role: data.role }, { onConflict: "user_id,role" });
      if (data.clientId) {
        const table = data.role === "client" ? "client_members" : "team_assignments";
        await supabaseAdmin.from(table).upsert({ client_id: data.clientId, user_id: profile.id }, { onConflict: "client_id,user_id" });
      }
      await supabaseAdmin.from("invitations").update({ accepted_at: new Date().toISOString() }).eq("email", data.email).is("accepted_at", null);
      await supabase.from("audit_logs").insert({ actor_id: userId, action: "link_existing_user", entity: "invitations", details: { email: data.email, role: data.role } });
      return { status: "linked" as const };
    }
    await supabase.from("audit_logs").insert({ actor_id: userId, action: "invite", entity: "invitations", details: { email: data.email, role: data.role } });
    return { status: "invited" as const };
  });

const roleSchema = z.object({ targetUserId: z.string().uuid(), role: z.enum(["client", "team", "admin"]), grant: z.boolean() });

/** Admin-only role changes. Admins cannot remove their own admin role. */
export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => roleSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Only administrators can change roles.");
    if (!data.grant && data.role === "admin" && data.targetUserId === userId) throw new Error("You cannot remove your own admin access.");
    const res = data.grant
      ? await supabase.from("user_roles").upsert({ user_id: data.targetUserId, role: data.role }, { onConflict: "user_id,role" })
      : await supabase.from("user_roles").delete().eq("user_id", data.targetUserId).eq("role", data.role);
    if (res.error) throw new Error(res.error.message);
    await supabase.from("audit_logs").insert({ actor_id: userId, action: data.grant ? "grant_role" : "revoke_role", entity: "user_roles", entity_id: data.targetUserId, details: { role: data.role } });
    return { ok: true };
  });
