import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RecordForm, clientField } from "./ResourcePage";
import { inviteUser } from "@/lib/admin.functions";

export function InviteDialog({ open, onClose, role, clientId }: { open: boolean; onClose: () => void; role: "client" | "team"; clientId?: string | undefined }) {
  const invite = useServerFn(inviteUser);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{role === "client" ? "Invite client user" : "Invite team member"}</DialogTitle></DialogHeader>
        <RecordForm
          fields={[
            { name: "email", label: "Email", type: "email", required: true },
            ...(role === "client" ? [{ ...clientField, default: clientId }] : [{ ...clientField, label: "First assigned client (optional)", required: false }]),
          ]}
          initial={{ email: "", client_id: clientId ?? "" }}
          submitLabel="Send invitation"
          onSubmit={async (v) => {
            const res = await invite({ data: { email: v.email, role, clientId: v.client_id || null, redirectTo: window.location.origin } });
            toast.success(res.status === "invited" ? "Invitation email sent." : "Existing account linked.");
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

