import { describe, expect, it } from "vitest";
import { hasPermission, permissionDeniedMessage } from "@/lib/auth/permissions";

describe("permissions", () => {
  it("grants owners full access", () => {
    expect(hasPermission("OWNER", "billing:manage")).toBe(true);
    expect(hasPermission("OWNER", "members:invite")).toBe(true);
    expect(hasPermission("OWNER", "project:baseline")).toBe(true);
  });

  it("restricts viewers to read-only modules", () => {
    expect(hasPermission("VIEWER", "project:view")).toBe(true);
    expect(hasPermission("VIEWER", "crm:view")).toBe(true);
    expect(hasPermission("VIEWER", "project:create")).toBe(false);
    expect(hasPermission("VIEWER", "crm:pipeline")).toBe(false);
    expect(hasPermission("VIEWER", "dashboard:customize")).toBe(false);
  });

  it("allows sales to manage CRM but not projects", () => {
    expect(hasPermission("SALES", "crm:pipeline")).toBe(true);
    expect(hasPermission("SALES", "crm:create")).toBe(true);
    expect(hasPermission("SALES", "project:create")).toBe(false);
    expect(hasPermission("SALES", "project:schedule")).toBe(false);
  });

  it("allows project managers to schedule and baseline but not invite members", () => {
    expect(hasPermission("PROJECT_MANAGER", "project:baseline")).toBe(true);
    expect(hasPermission("PROJECT_MANAGER", "members:invite")).toBe(false);
    expect(hasPermission("PROJECT_MANAGER", "crm:create")).toBe(false);
  });

  it("returns a friendly denial message", () => {
    expect(permissionDeniedMessage("VIEWER", "project:create")).toMatch(/permission/i);
    expect(permissionDeniedMessage("OWNER", "project:create")).toBeNull();
  });
});
