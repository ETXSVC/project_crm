import { cacheDel } from "@/lib/cache/redis";
import { keysForScopes, type CacheScope } from "@/lib/cache/keys";

export async function invalidateTenantCache(tenantId: string, ...scopes: CacheScope[]) {
  const resolvedScopes = scopes.length > 0 ? scopes : (["dashboard", "crm", "pipeline"] as CacheScope[]);
  await cacheDel(...keysForScopes(tenantId, resolvedScopes));
}

export async function invalidateDashboardCache(tenantId: string) {
  await invalidateTenantCache(tenantId, "dashboard");
}

export async function invalidateCrmCache(tenantId: string) {
  await invalidateTenantCache(tenantId, "crm", "pipeline", "dashboard");
}

export async function invalidateProjectCache(tenantId: string) {
  await invalidateTenantCache(tenantId, "dashboard");
}
