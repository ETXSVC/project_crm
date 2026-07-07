import { PrismaClient } from "@prisma/client";

let adminClient: PrismaClient | undefined;

/** Superuser client for cross-tenant flows (invitation accept by token). */
export function getAdminPrisma() {
  if (!adminClient) {
    const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!url) {
      throw new Error("Database URL is not configured");
    }
    adminClient = new PrismaClient({
      datasources: { db: { url } },
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  return adminClient;
}
