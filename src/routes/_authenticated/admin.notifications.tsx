import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NotificationsView } from "@/components/portal/Shared";
import { Panel } from "@/components/portal/AppShell";
import { RecordForm, clientField } from "@/components/portal/ResourcePage";
import { useAdmin } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications | ScaleStack Admin" }] }),
  component: AdminNotifications,
});

function AdminNotifications() {
  const { user } = useAdmin();
  return (
    <div className="space-y-8">
      <Panel title="Notify a client">
        <RecordForm
          key="notify"
          fields={[clientField, { name: "title", label: "Title", required: true }, { name: "body", label: "Message", type: "textarea" }]}
          initial={{ client_id: "", title: "", body: "" }}
          submitLabel="Send notification"
          onSubmit={async (v) => {
            const { data, error } = await supabase.rpc("send_client_notification", { _client: v.client_id, _title: v.title, _body: v.body ?? "" });
            if (error) throw error;
            toast.success(data ? `Sent to ${data} client user${data === 1 ? "" : "s"}.` : "This client has no portal users yet.");
          }}
        />
      </Panel>
      <NotificationsView userId={user.id} />
    </div>
  );
}
