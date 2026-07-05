import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyRedisConnection } from "@/lib/cache/redis";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redis = await verifyRedisConnection();
    return NextResponse.json({
      status: "ok",
      redis: redis ? "connected" : "unavailable",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
