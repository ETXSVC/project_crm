/**
 * Vtiger session cache — per-tenant credentials from DB (or env fallback in dev).
 * See docs/VTIGER_INTEGRATION.md.
 */
import { vtigerLogin } from "@/lib/vtiger/client";
import { getVtigerConfigForTenant } from "@/lib/vtiger/config";

const SESSION_TTL_MS = 20 * 60 * 1000;

type CachedSession = { sessionName: string; userId: string; expiresAt: number };

const sessionCache = new Map<string, CachedSession>();
const loginPromises = new Map<string, Promise<{ sessionName: string; userId: string }>>();

export async function getVtigerSessionName(tenantId: string): Promise<string> {
  const session = await getVtigerSession(tenantId);
  return session.sessionName;
}

export async function getVtigerSession(
  tenantId: string
): Promise<{ sessionName: string; userId: string }> {
  const cached = sessionCache.get(tenantId);
  if (cached && Date.now() < cached.expiresAt) {
    return { sessionName: cached.sessionName, userId: cached.userId };
  }

  let loginPromise = loginPromises.get(tenantId);
  if (!loginPromise) {
    loginPromise = (async () => {
      const config = await getVtigerConfigForTenant(tenantId);
      if (!config) {
        throw new Error("Vtiger is not configured for this company.");
      }

      const login = await vtigerLogin({
        baseUrl: config.baseUrl,
        username: config.username,
        accessKey: config.accessKey,
      });

      sessionCache.set(tenantId, {
        sessionName: login.sessionName,
        userId: login.userId,
        expiresAt: Date.now() + SESSION_TTL_MS,
      });

      return { sessionName: login.sessionName, userId: login.userId };
    })().finally(() => {
      loginPromises.delete(tenantId);
    });

    loginPromises.set(tenantId, loginPromise);
  }

  return loginPromise;
}

export function clearVtigerSessionCache(tenantId?: string): void {
  if (tenantId) {
    sessionCache.delete(tenantId);
    loginPromises.delete(tenantId);
    return;
  }
  sessionCache.clear();
  loginPromises.clear();
}
