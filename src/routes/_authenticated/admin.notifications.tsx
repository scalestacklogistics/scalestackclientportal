import { createFileRoute } from "@tanstack/react-router";
import { NotificationsView } from "@/components/portal/Shared";
import { useAdmin } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications | ScaleStack Admin" }] }),
  component: () => {
    const { user } = useAdmin();
    return <NotificationsView userId={user.id} />;
  },
});
