"use server";

import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/db/get-tenant-db";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit";
import { assertPermission } from "@/lib/auth/guards";
import { vtigerSettingsSchema } from "@/lib/validations/settings-schemas";
import { verifyVtigerConnection } from "@/lib/vtiger/client";
import { clearVtigerSessionCache } from "@/lib/vtiger/session";
import { getVtigerSetupInfoForTenant, type VtigerSetupInfo } from "@/lib/vtiger/setup";
import type { TenantRole } from "@prisma/client";

function vtigerManageError(role?: TenantRole): string | null {
  const workspaceDenied = assertPermission(role, "workspace:manage");
  if (!workspaceDenied) return null;
  return assertPermission(role, "billing:manage");
}

export async function getVtigerSetup(): Promise<VtigerSetupInfo> {
  const { tenantId } = await getTenantDb();
  return getVtigerSetupInfoForTenant(tenantId);
}

export async function saveVtigerSettings(formData: FormData) {
  const { tenantId, userId, session } = await getTenantDb();
  const denied = vtigerManageError(session.user.role);
  if (denied) return { error: denied };

  const accessKeyRaw = String(formData.get("accessKey") ?? "").trim();
  const parsed = vtigerSettingsSchema.safeParse({
    baseUrl: formData.get("baseUrl"),
    publicUrl: formData.get("publicUrl") || "",
    username: formData.get("username"),
    accessKey: accessKeyRaw || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid Vtiger settings" };
  }

  const existing = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { vtigerAccessKey: true },
  });

  const accessKey = parsed.data.accessKey || existing?.vtigerAccessKey;
  if (!accessKey) {
    return { error: "Access key is required" };
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      vtigerBaseUrl: parsed.data.baseUrl.trim(),
      vtigerUsername: parsed.data.username.trim(),
      vtigerAccessKey: accessKey,
      vtigerPublicUrl: parsed.data.publicUrl?.trim() || null,
    },
  });

  clearVtigerSessionCache(tenantId);

  await createAuditLog({
    tenantId,
    userId,
    action: "UPDATE",
    entityType: "Tenant",
    entityId: tenantId,
    metadata: { vtigerConfigured: true },
  });

  revalidatePath("/settings");
  revalidatePath("/crm");
  return { success: true };
}

export async function verifyVtigerApiConnection(formData?: FormData): Promise<
  | { success: true; version: string; vtigerVersion: string; userId: string }
  | { error: string }
> {
  const { tenantId, session } = await getTenantDb();
  const denied = vtigerManageError(session.user.role);
  if (denied) return { error: denied };

  let baseUrl: string | undefined;
  let username: string | undefined;
  let accessKey: string | undefined;

  if (formData) {
    const parsed = vtigerSettingsSchema.safeParse({
      baseUrl: formData.get("baseUrl"),
      publicUrl: formData.get("publicUrl") || "",
      username: formData.get("username"),
      accessKey: String(formData.get("accessKey") ?? "").trim() || undefined,
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Invalid Vtiger settings" };
    }

    baseUrl = parsed.data.baseUrl.trim();
    username = parsed.data.username.trim();

    if (parsed.data.accessKey) {
      accessKey = parsed.data.accessKey;
    } else {
      const existing = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { vtigerAccessKey: true },
      });
      accessKey = existing?.vtigerAccessKey?.trim();
    }
  } else {
    const setup = await getVtigerSetupInfoForTenant(tenantId);
    if (!setup.ready || !setup.baseUrl || !setup.username) {
      return {
        error:
          "Vtiger is not configured for this company. Save credentials in Settings → CRM first.",
      };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { vtigerBaseUrl: true, vtigerUsername: true, vtigerAccessKey: true },
    });

    baseUrl = tenant?.vtigerBaseUrl?.trim() ?? setup.baseUrl;
    username = tenant?.vtigerUsername?.trim() ?? setup.username;
    accessKey = tenant?.vtigerAccessKey?.trim();

    if (!accessKey && setup.usingEnvFallback) {
      const envKey = process.env.VTIGER_ACCESS_KEY?.trim();
      accessKey = envKey;
    }
  }

  if (!baseUrl || !username || !accessKey) {
    return { error: "Base URL, username, and access key are required to verify the connection." };
  }

  try {
    const result = await verifyVtigerConnection({ baseUrl, username, accessKey });
    return { success: true, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Vtiger error";
    return { error: `Vtiger connection failed: ${message}` };
  }
}

export async function clearVtigerSettings() {
  const { tenantId, userId, session } = await getTenantDb();
  const denied = vtigerManageError(session.user.role);
  if (denied) return { error: denied };

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      vtigerBaseUrl: null,
      vtigerUsername: null,
      vtigerAccessKey: null,
      vtigerPublicUrl: null,
    },
  });

  clearVtigerSessionCache(tenantId);

  await createAuditLog({
    tenantId,
    userId,
    action: "UPDATE",
    entityType: "Tenant",
    entityId: tenantId,
    metadata: { vtigerConfigured: false },
  });

  revalidatePath("/settings");
  revalidatePath("/crm");
  return { success: true };
}
