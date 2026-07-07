import type { TenantRole } from "@prisma/client";

export const PERMISSIONS = [
  "workspace:manage",
  "billing:manage",
  "members:view",
  "members:invite",
  "members:manage",
  "project:view",
  "project:create",
  "project:edit",
  "project:delete",
  "project:schedule",
  "project:baseline",
  "project:resources",
  "crm:view",
  "crm:create",
  "crm:edit",
  "crm:delete",
  "crm:pipeline",
  "dashboard:customize",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<TenantRole, readonly Permission[]> = {
  OWNER: PERMISSIONS,
  ADMIN: PERMISSIONS,
  PROJECT_MANAGER: [
    "members:view",
    "project:view",
    "project:create",
    "project:edit",
    "project:delete",
    "project:schedule",
    "project:baseline",
    "project:resources",
    "crm:view",
    "dashboard:customize",
  ],
  MEMBER: [
    "project:view",
    "project:create",
    "project:edit",
    "project:schedule",
    "project:resources",
    "crm:view",
    "dashboard:customize",
  ],
  SALES: [
    "project:view",
    "crm:view",
    "crm:create",
    "crm:edit",
    "crm:delete",
    "crm:pipeline",
    "dashboard:customize",
  ],
  VIEWER: ["project:view", "crm:view"],
};

const PERMISSION_LABELS: Record<Permission, string> = {
  "workspace:manage": "manage company settings",
  "billing:manage": "manage billing",
  "members:view": "view members",
  "members:invite": "invite members",
  "members:manage": "manage members",
  "project:view": "view projects",
  "project:create": "create projects",
  "project:edit": "edit projects",
  "project:delete": "delete projects",
  "project:schedule": "edit schedules",
  "project:baseline": "manage baselines",
  "project:resources": "manage resources",
  "crm:view": "view Vtiger CRM",
  "crm:create": "create records in Vtiger CRM",
  "crm:edit": "edit records in Vtiger CRM",
  "crm:delete": "delete records in Vtiger CRM",
  "crm:pipeline": "manage Vtiger pipeline",
  "dashboard:customize": "customize the dashboard",
};

export function hasPermission(role: TenantRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionDeniedMessage(
  role: TenantRole | undefined,
  permission: Permission
): string | null {
  if (hasPermission(role, permission)) return null;
  return `You don't have permission to ${PERMISSION_LABELS[permission]}.`;
}

export function canViewProjects(role: TenantRole | undefined): boolean {
  return hasPermission(role, "project:view");
}

export function canViewCrm(role: TenantRole | undefined): boolean {
  return hasPermission(role, "crm:view");
}

export function canManageWorkspace(role: TenantRole | undefined): boolean {
  return hasPermission(role, "workspace:manage");
}

export const ROLE_LABELS: Record<TenantRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  PROJECT_MANAGER: "Project Manager",
  MEMBER: "Member",
  SALES: "Sales",
  VIEWER: "Viewer",
};

export const ASSIGNABLE_ROLES: TenantRole[] = [
  "ADMIN",
  "PROJECT_MANAGER",
  "MEMBER",
  "SALES",
  "VIEWER",
];
