import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import bcrypt from "bcryptjs";
import type { Provider } from "next-auth/providers";
import { prisma } from "@/lib/db/prisma";
import { loadDefaultMembership } from "@/lib/auth/membership";
import { getAuthProviderFlags } from "@/lib/auth/provider-flags";

export type { AuthProviderFlags } from "@/lib/auth/provider-flags";
export { getAuthProviderFlags } from "@/lib/auth/provider-flags";

function smtpServer() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  return {
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    ...(process.env.SMTP_USER
      ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } }
      : {}),
  };
}

export function buildAuthProviders(): Provider[] {
  const flags = getAuthProviderFlags();
  const providers: Provider[] = [
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
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;

        const tenant = await loadDefaultMembership(user.id);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          ...tenant,
        };
      },
    }),
  ];

  if (flags.magicLink) {
    providers.push(
      Nodemailer({
        server: smtpServer(),
        from: process.env.SMTP_FROM,
      })
    );
  }

  if (flags.google) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID!,
        clientSecret: process.env.AUTH_GOOGLE_SECRET!,
        allowDangerousEmailAccountLinking: true,
      })
    );
  }

  if (flags.github) {
    providers.push(
      GitHub({
        clientId: process.env.AUTH_GITHUB_ID!,
        clientSecret: process.env.AUTH_GITHUB_SECRET!,
        allowDangerousEmailAccountLinking: true,
      })
    );
  }

  return providers;
}
