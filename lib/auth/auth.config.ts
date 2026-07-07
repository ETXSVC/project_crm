import type { NextAuthConfig } from "next-auth";
import { edgeAuthCallbacks } from "@/lib/auth/callbacks.edge";
import { sessionOptions } from "@/lib/auth/session";

/** Edge-safe auth config — no Node-only providers (used by middleware). */
export const authConfig = {
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === "production",
  session: sessionOptions,
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-email",
  },
  providers: [],
  callbacks: edgeAuthCallbacks,
} satisfies NextAuthConfig;
