import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "./AppShell";
import { fmtDateTime } from "./ResourcePage";
import { cn } from "@/lib/utils";

export function MessageThread({ clientId, userId }: { clientId: string; userId: string }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const key = ["messages", clientId];
  const msgs = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("*").eq("client_id", clientId).order("created_at");
      if (error) throw error;
      const ids = [...new Set(data.map((m) => m.sender_id))];
      const { data: people } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      const names = new Map((people ?? []).map((p) => [p.id, p.full_name || p.email]));
      return data.map((m) => ({ ...m, sender: m.sender_id === userId ? "You" : (names.get(m.sender_id) ?? "ScaleStack team") }));
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`messages-${clientId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `client_id=eq.${clientId}` }, () =>
        qc.invalidateQueries({ queryKey: key }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [msgs.data?.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const { error } = await supabase.from("messages").insert({ client_id: clientId, sender_id: userId, body: body.trim() });
    if (error) { toast.error(error.message); return; }
    setBody("");
    qc.invalidateQueries({ queryKey: key });
  }

  return (
    <div className="flex h-[60vh] flex-col rounded-xl border bg-card shadow-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {!msgs.data?.length && <EmptyState text="No messages yet. Start the conversation." />}
        {msgs.data?.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[75%] rounded-xl px-4 py-2.5 text-sm", mine ? "bg-primary text-primary-foreground" : "bg-muted")}>
                <div className={cn("mb-0.5 text-[11px]", mine ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {m.sender} · {fmtDateTime(m.created_at)}
                </div>
                <div className="whitespace-pre-wrap">{m.body}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t p-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message..."
          className="min-h-10 resize-none"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) send(e);
          }}
        />
        <Button type="submit" size="icon" aria-label="Send">
          <Send />
        </Button>
      </form>
    </div>
  );
}
