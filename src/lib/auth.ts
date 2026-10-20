import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "team" | "client";

/** Where a signed-in user lands, based on their roles. */
export function homePathForRoles(roles: AppRole[]): "/admin" | "/portal" {
  return roles.includes("admin") || roles.includes("team") ? "/admin" : "/portal";
}

export function isStaff(roles: AppRole[]) {
  return roles.includes("admin") || roles.includes("team");
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return { user, loading };
}

export function useRoles(userId?: string) {
  return useQuery({
    queryKey: ["roles", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });
}

/** The client account(s) the current user belongs to as a client. */
export function useMyClient(userId?: string) {
  return useQuery({
    queryKey: ["my-client", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_members")
        .select("client_id, clients(*)")
        .eq("user_id", userId!)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.clients ?? null;
    },
  });
}

export async function logAudit(action: string, entity: string, entityId?: string, details?: unknown) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("audit_logs").insert({
    actor_id: data.user.id,
    action,
    entity,
    entity_id: entityId ?? null,
    details: (details ?? null) as never,
  });
}
