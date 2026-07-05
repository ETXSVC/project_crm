import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { checkPlanLimit } from "@/lib/billing/limits";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe("plan limits", () => {
  it.skipIf(!hasDatabase)("allows unlimited resources on PRO", async () => {
    const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (!tenant) return;

    const previous = {
      plan: tenant.plan,
      subscriptionStatus: tenant.subscriptionStatus,
    };

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { plan: "PRO", subscriptionStatus: "ACTIVE" },
    });

    expect(await checkPlanLimit(tenant.id, "projects")).toBeNull();
    expect(await checkPlanLimit(tenant.id, "crmAccounts")).toBeNull();

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: previous,
    });
  });

  it.skipIf(!hasDatabase)("blocks actions when subscription is past due", async () => {
    const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (!tenant) return;

    const previous = {
      plan: tenant.plan,
      subscriptionStatus: tenant.subscriptionStatus,
    };

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { plan: "PRO", subscriptionStatus: "PAST_DUE" },
    });

    const message = await checkPlanLimit(tenant.id, "projects");
    expect(message).toMatch(/past due/i);

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: previous,
    });
  });
});
