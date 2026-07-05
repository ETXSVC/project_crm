import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyRedisConnection } from "@/lib/cache/redis";
import { isRlsEnabled } from "@/lib/db/tenant-context";
import { getAuthProviderFlags } from "@/lib/auth/provider-flags";
import { getBillingProviderFlags } from "@/lib/billing/provider-flags";
import { sessionOptions } from "@/lib/auth/session";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [redis, rls] = await Promise.all([
      verifyRedisConnection(),
      isRlsEnabled("Project"),
    ]);
    return NextResponse.json({
      status: "ok",
      redis: redis ? "connected" : "unavailable",
      rls: rls ? "enabled" : "disabled",
      auth: {
        ...getAuthProviderFlags(),
        sessionStrategy: sessionOptions.strategy,
        sessionMaxAgeSeconds: sessionOptions.maxAge,
      },
      billing: getBillingProviderFlags(),
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
