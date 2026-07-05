/**
 * Run inside the app container:
 *   pnpm exec tsx scripts/benchmark-cache.ts
 */
import { cacheDel, cacheGetOrSet } from "../lib/cache/redis";
import { cacheKeys, CACHE_TTL } from "../lib/cache/keys";
import { fetchCrmStats } from "../lib/cache/crm-stats";
import { prisma } from "../lib/db/prisma";

const TENANT_ID = process.env.BENCHMARK_TENANT_ID;

async function main() {
  if (!process.env.REDIS_URL) {
    console.error("REDIS_URL is not set");
    process.exit(1);
  }

  const tenant = TENANT_ID
    ? await prisma.tenant.findUnique({ where: { id: TENANT_ID } })
    : await prisma.tenant.findFirst();

  if (!tenant) {
    console.error("No tenant found for benchmark");
    process.exit(1);
  }

  const key = cacheKeys.tenantCrmStats(tenant.id);
  await cacheDel(key);

  const coldStart = performance.now();
  await fetchCrmStats(tenant.id);
  const coldMs = performance.now() - coldStart;

  await cacheGetOrSet(key, CACHE_TTL.crmStats, () => fetchCrmStats(tenant.id));

  const warmStart = performance.now();
  await cacheGetOrSet(key, CACHE_TTL.crmStats, () => fetchCrmStats(tenant.id));
  const warmMs = performance.now() - warmStart;

  console.log(JSON.stringify({
    tenantId: tenant.id,
    benchmark: "fetchCrmStats",
    coldDbMs: Math.round(coldMs),
    warmCacheMs: Math.round(warmMs),
    speedup: coldMs > 0 ? `${(coldMs / Math.max(warmMs, 0.01)).toFixed(1)}x` : "n/a",
  }, null, 2));

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
