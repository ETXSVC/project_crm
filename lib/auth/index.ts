import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/prisma";
import type { TenantRole } from "@prisma/client";
import { authConfig } from "@/lib/auth/auth.config";
import { buildAuthProviders } from "@/lib/auth/providers";

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
    activeTenantId?: string;
    activeTenantSlug?: string;
    role?: TenantRole;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: buildAuthProviders(),
});
