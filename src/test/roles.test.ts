import { describe, expect, it } from "vitest";
import { homePathForRoles, isStaff } from "@/lib/auth";

describe("role routing", () => {
  it("sends admins to the admin area", () => expect(homePathForRoles(["admin"])).toBe("/admin"));
  it("sends team members to the admin area", () => expect(homePathForRoles(["team"])).toBe("/admin"));
  it("sends clients to the client portal", () => expect(homePathForRoles(["client"])).toBe("/portal"));
  it("sends users with no role to the client portal, never admin", () =>
    expect(homePathForRoles([])).toBe("/portal"));
  it("clients are not staff", () => expect(isStaff(["client"])).toBe(false));
});
