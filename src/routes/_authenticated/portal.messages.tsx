import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/portal/AppShell";
import { MessageThread } from "@/components/portal/Messages";
import { usePortal } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/portal/messages")({
  head: () => ({ meta: [{ title: "Messages | ScaleStack Portal" }] }),
  component: Messages,
});

function Messages() {
  const { client, user } = usePortal();
  return (
    <div>
      <PageHeader title="Messages" description="Chat directly with your ScaleStack team." />
      <MessageThread clientId={client.id} userId={user.id} />
    </div>
  );
}
