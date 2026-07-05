import { describe, expect, it } from "vitest";
import { createTenantPrisma, prisma } from "@/lib/db/prisma";
import { clearTenantContext } from "@/lib/db/tenant-context";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe("Tenant-scoped Prisma client", () => {
  it.skipIf(!hasDatabase)("injects tenantId on findMany", async () => {
    const tenants = await prisma.tenant.findMany({ take: 2, orderBy: { createdAt: "asc" } });
    if (tenants.length < 2) return;

    const [tenantA, tenantB] = tenants;
    const dbA = createTenantPrisma(tenantA.id);

    const projects = await dbA.project.findMany({
      where: { deletedAt: null },
      select: { tenantId: true },
      take: 20,
    });

    expect(projects.every((project) => project.tenantId === tenantA.id)).toBe(true);
    expect(projects.some((project) => project.tenantId === tenantB.id)).toBe(false);

    await clearTenantContext();
  });

  it.skipIf(!hasDatabase)("blocks update by id for another tenant's row", async () => {
    const tenants = await prisma.tenant.findMany({ take: 2, orderBy: { createdAt: "asc" } });
    if (tenants.length < 2) return;

    const [tenantA, tenantB] = tenants;
    const foreignProject = await prisma.project.findFirst({
      where: { tenantId: tenantB.id, deletedAt: null },
    });
    if (!foreignProject) return;

    const dbA = createTenantPrisma(tenantA.id);

    await expect(
      dbA.project.update({
        where: { id: foreignProject.id },
        data: { name: "Cross-tenant hijack" },
      })
    ).rejects.toThrow();

    await clearTenantContext();
  });

  it.skipIf(!hasDatabase)("findFirst by id returns null for another tenant's row", async () => {
    const tenants = await prisma.tenant.findMany({ take: 2, orderBy: { createdAt: "asc" } });
    if (tenants.length < 2) return;

    const [tenantA, tenantB] = tenants;
    const foreignAccount = await prisma.crmAccount.findFirst({
      where: { tenantId: tenantB.id, deletedAt: null },
    });
    if (!foreignAccount) return;

    const dbA = createTenantPrisma(tenantA.id);
    const result = await dbA.crmAccount.findFirst({
      where: { id: foreignAccount.id, deletedAt: null },
    });

    expect(result).toBeNull();
    await clearTenantContext();
  });
});
