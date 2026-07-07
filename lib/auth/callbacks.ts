import type { TenantRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { loadDefaultMembership } from "@/lib/auth/membership";
import {
  applyAuthRecordToSessionUser,
  createAuthSession,
  getAuthSession,
  revokeAuthSession,
  updateAuthSession,
  type AuthSessionRecord,
} from "@/lib/auth/session-key";
import type { NextAuthConfig } from "next-auth";

async function resolveTenant(user: {
  id: string;
  activeTenantId?: string;
  activeTenantSlug?: string;
  role?: TenantRole;
}) {
  if (user.activeTenantId != null) {
    return {
      activeTenantId: user.activeTenantId,
      activeTenantSlug: user.activeTenantSlug,
      role: user.role,
    };
  }
  return loadDefaultMembership(user.id);
}

function recordFromUser(
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    activeTenantId?: string;
    activeTenantSlug?: string;
    role?: TenantRole;
  },
  tenant: {
    activeTenantId?: string;
    activeTenantSlug?: string;
    role?: TenantRole;
  }
): AuthSessionRecord {
  return {
    userId: user.id,
    email: user.email ?? "",
    name: user.name,
    image: user.image,
    activeTenantId: tenant.activeTenantId,
    activeTenantSlug: tenant.activeTenantSlug,
    role: tenant.role,
  };
}

export const authCallbacks: NextAuthConfig["callbacks"] = {
  async signIn({ user }) {
    return Boolean(user.id);
  },
  async jwt({ token, user, trigger, session }) {
    if (user?.id) {
      if (token.authKey) {
        await revokeAuthSession(token.authKey as string);
      }

      const userId = user.id;
      const tenant = await resolveTenant({
        id: userId,
        activeTenantId: user.activeTenantId,
        activeTenantSlug: user.activeTenantSlug,
        role: user.role,
      });
      const authKey = await createAuthSession(
        recordFromUser(
          {
            id: userId,
            email: user.email,
            name: user.name,
            image: user.image,
            activeTenantId: user.activeTenantId,
            activeTenantSlug: user.activeTenantSlug,
            role: user.role,
          },
          tenant
        )
      );
      token.authKey = authKey;
      token.id = userId;
      token.activeTenantId = tenant.activeTenantId;
      token.activeTenantSlug = tenant.activeTenantSlug;
      token.role = tenant.role;
      return token;
    }

    if (!token.authKey) return token;

    const authKey = token.authKey as string;
    let record = await getAuthSession(authKey);
    if (!record) {
      return { ...token, authKey: undefined };
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
        await updateAuthSession(authKey, {
          activeTenantId: membership.tenantId,
          activeTenantSlug: membership.tenant.slug,
          role: membership.role,
        });
        record = {
          ...record,
          activeTenantId: membership.tenantId,
          activeTenantSlug: membership.tenant.slug,
          role: membership.role,
        };
      }
    }

    token.id = record.userId;
    token.activeTenantId = record.activeTenantId;
    token.activeTenantSlug = record.activeTenantSlug;
    token.role = record.role;
    return token;
  },
  async session({ session, token }) {
    if (token.authKey) {
      const record = await getAuthSession(token.authKey as string);
      if (record && session.user) {
        applyAuthRecordToSessionUser(session.user, record);
        return session;
      }
    }

    if (token && session.user) {
      session.user.id = token.id as string;
      session.user.activeTenantId = token.activeTenantId as string | undefined;
      session.user.activeTenantSlug = token.activeTenantSlug as string | undefined;
      session.user.role = token.role as TenantRole | undefined;
    }
    return session;
  },
};
