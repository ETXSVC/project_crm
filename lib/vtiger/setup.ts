import { prisma } from "@/lib/db/prisma";
import {
  getEnvVtigerConfig,
  getVtigerConfigForTenant,
  getVtigerWebUrlFromConfig,
  isVtigerSingleTenantMode,
} from "@/lib/vtiger/config";

export type VtigerSetupInfo = {
  baseUrlConfigured: boolean;
  baseUrl: string | null;
  publicUrl: string | null;
  webUrl: string | null;
  usernameConfigured: boolean;
  username: string | null;
  accessKeyConfigured: boolean;
  maskedAccessKey: string | null;
  ready: boolean;
  /** Where active credentials come from for this workspace. */
  source: "tenant" | "env" | "none";
  /** True when using VTIGER_* env vars because workspace has no stored config. */
  usingEnvFallback: boolean;
  /** True when env fallback is available (dev convenience). */
  devEnvFallbackAvailable: boolean;
};

export function maskVtigerAccessKey(accessKey: string | undefined | null): string | null {
  if (!accessKey) return null;
  if (accessKey.length <= 6) return "••••••";
  return `${accessKey.slice(0, 3)}••••${accessKey.slice(-3)}`;
}

export async function getVtigerSetupInfoForTenant(tenantId: string): Promise<VtigerSetupInfo> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      vtigerBaseUrl: true,
      vtigerUsername: true,
      vtigerAccessKey: true,
      vtigerPublicUrl: true,
    },
  });

  const config = await getVtigerConfigForTenant(tenantId);
  const envConfig = getEnvVtigerConfig();
  const devEnvFallbackAvailable = isVtigerSingleTenantMode() && envConfig !== null;

  const storedPublicUrl = tenant?.vtigerPublicUrl?.trim() || null;

  if (!config) {
    return {
      baseUrlConfigured: false,
      baseUrl: null,
      publicUrl: storedPublicUrl,
      webUrl: null,
      usernameConfigured: false,
      username: null,
      accessKeyConfigured: false,
      maskedAccessKey: null,
      ready: false,
      source: "none",
      usingEnvFallback: false,
      devEnvFallbackAvailable,
    };
  }

  return {
    baseUrlConfigured: true,
    baseUrl: config.baseUrl,
    publicUrl: storedPublicUrl ?? config.publicUrl ?? null,
    webUrl: getVtigerWebUrlFromConfig(config),
    usernameConfigured: true,
    username: config.username,
    accessKeyConfigured: true,
    maskedAccessKey: maskVtigerAccessKey(config.accessKey),
    ready: true,
    source: config.source,
    usingEnvFallback: config.source === "env",
    devEnvFallbackAvailable,
  };
}
