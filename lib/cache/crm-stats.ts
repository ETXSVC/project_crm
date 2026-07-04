import { prisma } from "@/lib/db/prisma";

export async function fetchCrmPipelineStats(tenantId: string) {
  const stages = await prisma.pipelineStage.findMany({
    where: { tenantId },
    orderBy: { sortOrder: "asc" },
    include: {
      opportunities: {
        where: { deletedAt: null, status: "OPEN" },
        select: { value: true },
      },
    },
  });

  const pipelineValue = await prisma.opportunity.aggregate({
    where: { tenantId, deletedAt: null, status: "OPEN" },
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
  const [accounts, contacts, leads, opportunities, pipelineValue, stages] = await Promise.all([
    prisma.crmAccount.count({ where: { tenantId, deletedAt: null } }),
    prisma.contact.count({ where: { tenantId, deletedAt: null } }),
    prisma.lead.count({ where: { tenantId, deletedAt: null, status: { not: "CONVERTED" } } }),
    prisma.opportunity.count({ where: { tenantId, deletedAt: null, status: "OPEN" } }),
    prisma.opportunity.aggregate({
      where: { tenantId, deletedAt: null, status: "OPEN" },
      _sum: { value: true },
    }),
    prisma.pipelineStage.findMany({
      where: { tenantId },
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
  return prisma.pipelineStage.findMany({
    where: { tenantId },
    orderBy: { sortOrder: "asc" },
  });
}
