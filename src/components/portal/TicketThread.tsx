import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "./AppShell";
import { fmtDateTime } from "./ResourcePage";
import { cn } from "@/lib/utils";

type Ticket = { id: string; client_id: string; subject: string; description: string | null; status: string; created_by: string | null; created_at: string };

/** Conversation dialog for one support ticket; shared by clients and staff. */
export function TicketThreadButton({ ticket, userId }: { ticket: Ticket; userId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <MessageSquare /> Conversation
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{ticket.subject} <StatusBadge value={ticket.status} /></DialogTitle>
          </DialogHeader>
          {open && <Thread ticket={ticket} userId={userId} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Thread({ ticket, userId }: { ticket: Ticket; userId: string }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const key = ["ticket-replies", ticket.id];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("ticket_replies").select("*").eq("ticket_id", ticket.id).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    if (text.length > 5000) { toast.error("Reply is too long (max 5000 characters)."); return; }
    setBusy(true);
    const { error } = await supabase.from("ticket_replies").insert({ ticket_id: ticket.id, client_id: ticket.client_id, author_id: userId, body: text });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setBody("");
    toast.success("Reply sent");
    qc.invalidateQueries({ queryKey: key });
  }
  const closed = ticket.status === "closed";
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted p-3 text-sm">
        <div className="mb-1 text-xs text-muted-foreground">Opened {fmtDateTime(ticket.created_at)}</div>
        <div className="whitespace-pre-wrap">{ticket.description}</div>
      </div>
      {q.isLoading && <div className="text-sm text-muted-foreground">Loading replies...</div>}
      {q.data?.map((r) => (
        <div key={r.id} className={cn("rounded-lg border p-3 text-sm", r.author_id === userId && "border-primary/30 bg-primary-soft")}>
          <div className="mb-1 text-xs text-muted-foreground">{r.author_id === userId ? "You" : r.author_id === ticket.created_by ? "Client" : "ScaleStack team"} · {fmtDateTime(r.created_at)}</div>
          <div className="whitespace-pre-wrap">{r.body}</div>
        </div>
      ))}
      {closed ? (
        <p className="text-sm text-muted-foreground">This ticket is closed. Open a new ticket if you need more help.</p>
      ) : (
        <form onSubmit={send} className="space-y-2">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply..." maxLength={5000} />
          <Button disabled={busy || !body.trim()}>Send reply</Button>
        </form>
      )}
    </div>
  );
}
