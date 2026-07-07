import { prisma } from "@/lib/db/prisma";

export type VtigerConfig = {
  baseUrl: string;
  username: string;
  accessKey: string;
  publicUrl?: string;
  source: "tenant" | "env";
};

export function getEnvVtigerBaseUrl(): string | undefined {
  const url = process.env.VTIGER_BASE_URL?.trim();
  return url || undefined;
}

/** Browser-facing CRM URL from env (defaults to VTIGER_BASE_URL). */
export function getEnvVtigerPublicBaseUrl(): string | undefined {
  const publicUrl = process.env.VTIGER_PUBLIC_URL?.trim();
  if (publicUrl) return publicUrl;
  return getEnvVtigerBaseUrl();
}

export function getEnvVtigerUsername(): string | undefined {
  const username = process.env.VTIGER_USERNAME?.trim();
  return username || undefined;
}

export function getEnvVtigerAccessKey(): string | undefined {
  const key = process.env.VTIGER_ACCESS_KEY?.trim();
  return key || undefined;
}

export function getEnvVtigerConfig(): VtigerConfig | null {
  const baseUrl = getEnvVtigerBaseUrl();
  const username = getEnvVtigerUsername();
  const accessKey = getEnvVtigerAccessKey();
  if (!baseUrl || !username || !accessKey) return null;
  const publicUrl = getEnvVtigerPublicBaseUrl();
  return {
    baseUrl,
    username,
    accessKey,
    publicUrl: publicUrl !== baseUrl ? publicUrl : undefined,
    source: "env",
  };
}

/**
 * When true, workspaces without stored credentials fall back to VTIGER_* env vars.
 * Use for local Docker dev; leave false in production multi-tenant SaaS.
 */
export function isVtigerSingleTenantMode(): boolean {
  const raw = process.env.VTIGER_SINGLE_TENANT_MODE?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") {
    return false;
  }
  return true;
}

export function normalizeVtigerBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

export function getVtigerWebserviceUrl(baseUrl: string): string {
  return `${normalizeVtigerBaseUrl(baseUrl)}/webservice.php`;
}

export function getVtigerWebUrlFromConfig(config: Pick<VtigerConfig, "baseUrl" | "publicUrl">): string {
  const resolved = config.publicUrl ?? config.baseUrl;
  const normalized = normalizeVtigerBaseUrl(resolved);
  return normalized.endsWith("index.php") ? normalized : `${normalized}/index.php`;
}

export async function getVtigerConfigForTenant(tenantId: string): Promise<VtigerConfig | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      vtigerBaseUrl: true,
      vtigerUsername: true,
      vtigerAccessKey: true,
      vtigerPublicUrl: true,
    },
  });

  const baseUrl = tenant?.vtigerBaseUrl?.trim();
  const username = tenant?.vtigerUsername?.trim();
  const accessKey = tenant?.vtigerAccessKey?.trim();

  if (baseUrl && username && accessKey) {
    const publicUrl = tenant?.vtigerPublicUrl?.trim() || undefined;
    return {
      baseUrl,
      username,
      accessKey,
      publicUrl,
      source: "tenant",
    };
  }

  if (isVtigerSingleTenantMode()) {
    return getEnvVtigerConfig();
  }

  return null;
}

export async function isVtigerConfiguredForTenant(tenantId: string): Promise<boolean> {
  const config = await getVtigerConfigForTenant(tenantId);
  return config !== null;
}
