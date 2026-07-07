import { randomBytes } from "crypto";
import type { TenantRole } from "@prisma/client";
import { cacheDel, cacheGet, cacheSet } from "@/lib/cache/redis";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

const AUTH_KEY_PREFIX = "projtest:auth:";

export type AuthSessionRecord = {
  userId: string;
  email: string;
  name?: string | null;
  image?: string | null;
  activeTenantId?: string;
  activeTenantSlug?: string;
  role?: TenantRole;
};

function redisKey(authKey: string): string {
  return `${AUTH_KEY_PREFIX}${authKey}`;
}

export function generateAuthKey(): string {
  return randomBytes(32).toString("base64url");
}

export async function createAuthSession(record: AuthSessionRecord): Promise<string> {
  const authKey = generateAuthKey();
  await cacheSet(redisKey(authKey), record, SESSION_MAX_AGE_SECONDS);
  return authKey;
}

export async function getAuthSession(authKey: string): Promise<AuthSessionRecord | null> {
  return cacheGet<AuthSessionRecord>(redisKey(authKey));
}

export async function updateAuthSession(
  authKey: string,
  patch: Partial<AuthSessionRecord>
): Promise<void> {
  const existing = await getAuthSession(authKey);
  if (!existing) return;
  await cacheSet(redisKey(authKey), { ...existing, ...patch }, SESSION_MAX_AGE_SECONDS);
}

export async function revokeAuthSession(authKey: string): Promise<void> {
  await cacheDel(redisKey(authKey));
}

export function applyAuthRecordToSessionUser(
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    activeTenantId?: string;
    activeTenantSlug?: string;
    role?: TenantRole;
  },
  record: AuthSessionRecord
) {
  user.id = record.userId;
  user.email = record.email;
  user.name = record.name;
  user.image = record.image;
  user.activeTenantId = record.activeTenantId;
  user.activeTenantSlug = record.activeTenantSlug;
  user.role = record.role;
}
