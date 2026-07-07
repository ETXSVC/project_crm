import type { TenantRole } from "@prisma/client";
import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth callbacks for middleware — no Redis, Prisma, or Node-only imports.
 * Session keys are created/validated in lib/auth/callbacks.ts on the Node server.
 */
export const edgeAuthCallbacks: NextAuthConfig["callbacks"] = {
  async signIn({ user }) {
    return Boolean(user.id);
  },
  async jwt({ token, user, trigger, session }) {
    if (user?.id) {
      token.id = user.id;
      token.activeTenantId = user.activeTenantId;
      token.activeTenantSlug = user.activeTenantSlug;
      token.role = user.role;
    }

    if (trigger === "update" && session) {
      if (session.activeTenantId) token.activeTenantId = session.activeTenantId as string;
      if (session.activeTenantSlug) token.activeTenantSlug = session.activeTenantSlug as string;
      if (session.role) token.role = session.role as TenantRole;
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
