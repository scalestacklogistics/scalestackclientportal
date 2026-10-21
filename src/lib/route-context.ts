import { getRouteApi } from "@tanstack/react-router";

const portalApi = getRouteApi("/_authenticated/portal");
const authApi = getRouteApi("/_authenticated");

/** Signed-in client user and their company, inside /portal. */
export function usePortal() {
  const ctx = portalApi.useRouteContext();
  return { client: ctx.client!, user: ctx.user };
}

/** Signed-in user and roles anywhere under the auth gate. */
export function useAuthCtx() {
  return authApi.useRouteContext();
}

const adminApi = getRouteApi("/_authenticated/admin");
/** Staff user inside /admin, with whether they are an owner/admin. */
export function useAdmin() {
  return adminApi.useRouteContext();
}
