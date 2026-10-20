import { createFileRoute } from "@tanstack/react-router";
import { AccountSettings } from "@/components/portal/Shared";
import { usePortal } from "@/lib/route-context";

export const Route = createFileRoute("/_authenticated/portal/settings")({
  head: () => ({ meta: [{ title: "Account | ScaleStack Portal" }] }),
  component: () => {
    const { user } = usePortal();
    return <AccountSettings userId={user.id} email={user.email} />;
  },
});
