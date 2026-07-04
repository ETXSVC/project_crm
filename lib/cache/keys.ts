const PREFIX = "projtest";

export const cacheKeys = {
  tenantDashboard: (tenantId: string) => `${PREFIX}:tenant:${tenantId}:dashboard`,
  tenantCrmStats: (tenantId: string) => `${PREFIX}:tenant:${tenantId}:crm:stats`,
  tenantPipelineStages: (tenantId: string) => `${PREFIX}:tenant:${tenantId}:crm:pipeline-stages`,
};

export type CacheScope = "dashboard" | "crm" | "pipeline";

export function keysForScopes(tenantId: string, scopes: CacheScope[]): string[] {
  const map: Record<CacheScope, string> = {
    dashboard: cacheKeys.tenantDashboard(tenantId),
    crm: cacheKeys.tenantCrmStats(tenantId),
    pipeline: cacheKeys.tenantPipelineStages(tenantId),
  };
  return [...new Set(scopes.map((scope) => map[scope]))];
}

export const CACHE_TTL = {
  dashboard: 60,
  crmStats: 60,
  pipelineStages: 300,
} as const;
