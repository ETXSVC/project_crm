import type { TenantRole } from "@prisma/client";
import { hasPermission, permissionDeniedMessage, type Permission } from "@/lib/auth/permissions";

export function assertPermission(
  role: TenantRole | undefined,
  permission: Permission
): string | null {
  return permissionDeniedMessage(role, permission);
}

export function requirePermission(role: TenantRole | undefined, permission: Permission) {
  const message = assertPermission(role, permission);
  if (message) {
    throw new Error(message);
  }
}

export function anyPermission(
  role: TenantRole | undefined,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}
