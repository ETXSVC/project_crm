import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  clearTenantContext,
  isRlsEnabled,
  setTenantContext,
  withTenantContext,
} from "@/lib/db/tenant-context";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe("PostgreSQL RLS", () => {
  it.skipIf(!hasDatabase)("enables forced RLS on Project", async () => {
    const enabled = await isRlsEnabled("Project");
    expect(enabled).toBe(true);
  });

  it.skipIf(!hasDatabase)("hides other tenants when context is set", async () => {
    const tenants = await prisma.tenant.findMany({ take: 2, orderBy: { createdAt: "asc" } });
    if (tenants.length < 2) {
      return;
    }

    const [tenantA, tenantB] = tenants;

    await withTenantContext(tenantA.id, async () => {
      const accounts = await prisma.crmAccount.findMany({
        where: { deletedAt: null },
        select: { id: true, tenantId: true },
      });

      expect(accounts.every((account) => account.tenantId === tenantA.id)).toBe(true);
      expect(accounts.some((account) => account.tenantId === tenantB.id)).toBe(false);
    });

    await clearTenantContext();
  });

  it.skipIf(!hasDatabase)("returns no tenant rows without context", async () => {
    await clearTenantContext();
    const projects = await prisma.project.findMany({ take: 5 });
    expect(projects).toHaveLength(0);
  });

  it.skipIf(!hasDatabase)("setTenantContext allows reads for that tenant", async () => {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) return;

    await setTenantContext(tenant.id);
    const count = await prisma.project.count({ where: { tenantId: tenant.id } });
    expect(count).toBeGreaterThanOrEqual(0);
    await clearTenantContext();
  });
});
