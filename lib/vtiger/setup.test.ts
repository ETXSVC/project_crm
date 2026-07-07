import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getVtigerSetupInfoForTenant, maskVtigerAccessKey } from "@/lib/vtiger/setup";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";

describe("vtiger setup", () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null);
  });

  afterEach(() => {
    process.env = { ...env };
    vi.clearAllMocks();
  });

  it("masks access keys safely", () => {
    expect(maskVtigerAccessKey("abcdefghijklmnop")).toBe("abc••••nop");
    expect(maskVtigerAccessKey(undefined)).toBeNull();
  });

  it("reports readiness from env fallback when single-tenant mode is on", async () => {
    process.env.VTIGER_BASE_URL = "https://crm.example.com/vtigercrm";
    process.env.VTIGER_PUBLIC_URL = "http://localhost:8080";
    process.env.VTIGER_USERNAME = "admin";
    process.env.VTIGER_ACCESS_KEY = "secret-key";
    process.env.VTIGER_SINGLE_TENANT_MODE = "true";

    const setup = await getVtigerSetupInfoForTenant("tenant-1");
    expect(setup.ready).toBe(true);
    expect(setup.source).toBe("env");
    expect(setup.usingEnvFallback).toBe(true);
    expect(setup.webUrl).toBe("http://localhost:8080/index.php");
  });

  it("prefers stored tenant credentials over env", async () => {
    process.env.VTIGER_BASE_URL = "https://env.example.com/vtigercrm";
    process.env.VTIGER_USERNAME = "env-user";
    process.env.VTIGER_ACCESS_KEY = "env-key";
    process.env.VTIGER_SINGLE_TENANT_MODE = "true";

    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      vtigerBaseUrl: "https://tenant.example.com/vtigercrm",
      vtigerUsername: "tenant-user",
      vtigerAccessKey: "tenant-secret-key",
      vtigerPublicUrl: null,
    });

    const setup = await getVtigerSetupInfoForTenant("tenant-1");
    expect(setup.ready).toBe(true);
    expect(setup.source).toBe("tenant");
    expect(setup.usingEnvFallback).toBe(false);
    expect(setup.baseUrl).toBe("https://tenant.example.com/vtigercrm");
    expect(setup.username).toBe("tenant-user");
  });
});
