import type { TenantRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { loadDefaultMembership } from "@/lib/auth/membership";
import type { NextAuthConfig } from "next-auth";

export const authCallbacks: NextAuthConfig["callbacks"] = {
  async signIn({ user }) {
    return Boolean(user.id);
  },
  async jwt({ token, user, trigger, session }) {
    if (user?.id) {
      token.id = user.id;
      const tenant =
        user.activeTenantId != null
          ? {
              activeTenantId: user.activeTenantId,
              activeTenantSlug: user.activeTenantSlug,
              role: user.role,
            }
          : await loadDefaultMembership(user.id);

      token.activeTenantId = tenant.activeTenantId;
      token.activeTenantSlug = tenant.activeTenantSlug;
      token.role = tenant.role;
    }

    if (trigger === "update" && session?.activeTenantId) {
      const membership = await prisma.tenantMembership.findUnique({
        where: {
          tenantId_userId: {
            tenantId: session.activeTenantId as string,
            userId: token.id as string,
          },
        },
        include: { tenant: true },
      });
      if (membership) {
        token.activeTenantId = membership.tenantId;
        token.activeTenantSlug = membership.tenant.slug;
        token.role = membership.role;
      }
    }

    return token;
  },
  async session({ session, token }) {
    if (token && session.user) {
      session.user.id = token.id as string;
      session.user.activeTenantId = token.activeTenantId as string | undefined;
      session.user.activeTenantSlug = token.activeTenantSlug as string | undefined;
      session.user.role = token.role as TenantRole | undefined;
    }
    return session;
  },
};
