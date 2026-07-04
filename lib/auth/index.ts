import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
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
    activeTenantId?: string;
    activeTenantSlug?: string;
    role?: TenantRole;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            memberships: {
              include: { tenant: true },
              take: 1,
            },
          },
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        const membership = user.memberships[0];
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          activeTenantId: membership?.tenantId,
          activeTenantSlug: membership?.tenant.slug,
          role: membership?.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.activeTenantId = user.activeTenantId;
        token.activeTenantSlug = user.activeTenantSlug;
        token.role = user.role;
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
  },
});
