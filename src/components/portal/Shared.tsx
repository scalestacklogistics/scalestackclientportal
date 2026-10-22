import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, PageHeader, Panel } from "./AppShell";
import { fmtDateTime } from "./ResourcePage";
import { cn } from "@/lib/utils";

export function NotificationsView({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const key = ["notifications", userId];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  async function markAll() {
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    qc.invalidateQueries({ queryKey: key });
  }
  async function markOne(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: key });
  }
  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Updates about your account."
        actions={
          <Button variant="outline" onClick={markAll}>
            <CheckCheck /> Mark all read
          </Button>
        }
      />
      <div className="divide-y rounded-xl border bg-card shadow-card">
        {!q.data?.length && <EmptyState text="You're all caught up." />}
        {q.data?.map((n) => (
          <button key={n.id} onClick={() => markOne(n.id)} className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-muted/50">
            <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-border" : "bg-primary")} />
            <div className="flex-1">
              <div className={cn("text-sm", !n.read && "font-medium")}>{n.title}</div>
              {n.body && <div className="text-sm text-muted-foreground">{n.body}</div>}
            </div>
            <span className="text-xs text-muted-foreground">{fmtDateTime(n.created_at)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function AccountSettings({ userId, email }: { userId: string; email?: string }) {
  const qc = useQueryClient();
  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()).data,
  });
  const [name, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name ?? profile.data?.full_name ?? null, phone: phone ?? profile.data?.phone ?? null, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["profile", userId] });
  }
  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw, current_password: current } as never);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setPw("");
    setCurrent("");
  }

  return (
    <div>
      <PageHeader title="Account settings" description="Manage your profile and security." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Profile">
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={email ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="n">Full name</Label>
              <Input id="n" value={name ?? profile.data?.full_name ?? ""} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p">Phone</Label>
              <Input id="p" value={phone ?? profile.data?.phone ?? ""} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <Button>Save profile</Button>
          </form>
        </Panel>
        <Panel title="Password">
          <form onSubmit={changePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="c">Current password</Label>
              <Input id="c" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="np">New password</Label>
              <Input id="np" type="password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} required />
            </div>
            <Button>Update password</Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
