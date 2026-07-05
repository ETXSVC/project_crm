import { createTenantPrisma } from "@/lib/db/prisma";

export async function fetchCrmPipelineStats(tenantId: string) {
  const db = createTenantPrisma(tenantId);

  const stages = await db.pipelineStage.findMany({
    where: {},
    orderBy: { sortOrder: "asc" },
    include: {
      opportunities: {
        where: { deletedAt: null, status: "OPEN" },
        select: { value: true },
      },
    },
  });

  const pipelineValue = await db.opportunity.aggregate({
    where: { deletedAt: null, status: "OPEN" },
    _sum: { value: true },
  });

  return {
    pipelineValue: pipelineValue._sum.value ?? 0,
    stages: stages.map((s) => ({
      id: s.id,
      name: s.name,
      count: s.opportunities.length,
      value: s.opportunities.reduce((sum, o) => sum + o.value, 0),
    })),
  };
}

export async function fetchCrmStats(tenantId: string) {
  const db = createTenantPrisma(tenantId);

  const [accounts, contacts, leads, opportunities, pipelineValue, stages] = await Promise.all([
    db.crmAccount.count({ where: { deletedAt: null } }),
    db.contact.count({ where: { deletedAt: null } }),
    db.lead.count({ where: { deletedAt: null, status: { not: "CONVERTED" } } }),
    db.opportunity.count({ where: { deletedAt: null, status: "OPEN" } }),
    db.opportunity.aggregate({
      where: { deletedAt: null, status: "OPEN" },
      _sum: { value: true },
    }),
    db.pipelineStage.findMany({
      where: {},
      orderBy: { sortOrder: "asc" },
      include: {
        opportunities: {
          where: { deletedAt: null, status: "OPEN" },
          select: { value: true },
        },
      },
    }),
  ]);

  return {
    accounts,
    contacts,
    leads,
    opportunities,
    pipelineValue: pipelineValue._sum.value ?? 0,
    stages: stages.map((s) => ({
      id: s.id,
      name: s.name,
      count: s.opportunities.length,
      value: s.opportunities.reduce((sum, o) => sum + o.value, 0),
    })),
  };
}

export async function fetchPipelineStages(tenantId: string) {
  const db = createTenantPrisma(tenantId);
  return db.pipelineStage.findMany({
    where: {},
    orderBy: { sortOrder: "asc" },
  });
}
