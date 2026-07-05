import type { PrismaClient } from "@prisma/client";

const defaultStages = [
  { name: "Prospecting", sortOrder: 0, probability: 10 },
  { name: "Qualification", sortOrder: 1, probability: 25 },
  { name: "Proposal", sortOrder: 2, probability: 50 },
  { name: "Negotiation", sortOrder: 3, probability: 75 },
  { name: "Closed Won", sortOrder: 4, probability: 100 },
];

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export async function bootstrapTenant(
  tx: TransactionClient,
  params: { tenantName: string; slug: string; userId: string }
) {
  const tenant = await tx.tenant.create({
    data: {
      name: params.tenantName,
      slug: params.slug,
    },
  });

  await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;

  await tx.tenantMembership.create({
    data: {
      tenantId: tenant.id,
      userId: params.userId,
      role: "OWNER",
    },
  });

  for (const stage of defaultStages) {
    await tx.pipelineStage.create({
      data: { tenantId: tenant.id, ...stage },
    });
  }

  await tx.projectCalendar.create({
    data: {
      tenantId: tenant.id,
      name: "Standard Work Week",
      workDays: [1, 2, 3, 4, 5],
      hoursPerDay: 8,
    },
  });

  return tenant;
}
