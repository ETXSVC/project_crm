import type { TenantRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      activeTenantId?: string;
      activeTenantSlug?: string;
      role?: TenantRole;
    };
  }

  interface User {
    activeTenantId?: string;
    activeTenantSlug?: string;
    role?: TenantRole;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    authKey?: string;
    activeTenantId?: string;
    activeTenantSlug?: string;
    role?: TenantRole;
  }
}
