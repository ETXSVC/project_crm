import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/prisma";
import { authConfig } from "@/lib/auth/auth.config";
import { authCallbacks } from "@/lib/auth/callbacks";
import { buildAuthProviders } from "@/lib/auth/providers";
import { revokeAuthSession } from "@/lib/auth/session-key";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: buildAuthProviders(),
  callbacks: authCallbacks,
  events: {
    async signOut(message) {
      if ("token" in message && message.token?.authKey) {
        await revokeAuthSession(message.token.authKey as string);
      }
    },
  },
});
