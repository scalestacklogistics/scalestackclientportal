import { createFileRoute } from "@tanstack/react-router";
import { NotificationsView } from "@/components/portal/Shared";
import { usePortal } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/portal/notifications")({
  head: () => ({ meta: [{ title: "Notifications | ScaleStack Portal" }] }),
  component: () => {
    const { user } = usePortal();
    return <NotificationsView userId={user.id} />;
  },
});
