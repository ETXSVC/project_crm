import { describe, expect, it } from "vitest";
import { cacheKeys, keysForScopes } from "./keys";

describe("cache keys", () => {
  it("builds tenant-scoped keys", () => {
    expect(cacheKeys.tenantDashboard("tenant-1")).toBe("projtest:tenant:tenant-1:dashboard");
    expect(cacheKeys.tenantCrmStats("tenant-1")).toBe("projtest:tenant:tenant-1:crm:stats");
  });

  it("deduplicates overlapping scopes", () => {
    const keys = keysForScopes("tenant-1", ["crm", "pipeline", "dashboard"]);
    expect(keys).toHaveLength(3);
    expect(new Set(keys).size).toBe(3);
  });
});
