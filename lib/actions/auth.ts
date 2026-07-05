"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn } from "@/lib/auth";
import { bootstrapTenant } from "@/lib/auth/bootstrap-tenant";
import { requireSession } from "@/lib/db/get-tenant-db";
import { prisma } from "@/lib/db/prisma";
import { slugify } from "@/lib/utils";
import { loginSchema, signupSchema } from "@/lib/validations/schemas";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

const magicLinkSchema = z.object({
  email: z.string().email(),
});

const workspaceSchema = z.object({
  tenantName: z.string().min(2).max(100),
});

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Invalid credentials" };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error;
  }
}

export async function magicLinkAction(formData: FormData) {
  const parsed = magicLinkSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email address" };
  }

  try {
    await signIn("nodemailer", {
      email: parsed.data.email,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return { error: "Could not send sign-in link" };
    }
    throw error;
  }
}

export async function createWorkspaceAction(formData: FormData) {
  const session = await requireSession();
  const parsed = workspaceSchema.safeParse({
    tenantName: formData.get("tenantName"),
  });

  if (!parsed.success) {
    return { error: "Workspace name must be at least 2 characters" };
  }

  const existingMembership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id },
  });

  if (existingMembership) {
    return { error: "You already belong to a workspace" };
  }

  let slug = slugify(parsed.data.tenantName);
  const slugExists = await prisma.tenant.findUnique({ where: { slug } });
  if (slugExists) slug = `${slug}-${Date.now()}`;

  const tenant = await prisma.$transaction(async (tx) =>
    bootstrapTenant(tx, {
      tenantName: parsed.data.tenantName,
      slug,
      userId: session.user.id,
    })
  );

  return {
    success: true as const,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    role: "OWNER" as const,
  };
}

export async function signupAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    tenantName: formData.get("tenantName"),
  });

  if (!parsed.success) {
    return { error: "Please fill in all fields correctly" };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { error: "Email already registered" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  let slug = slugify(parsed.data.tenantName);
  const slugExists = await prisma.tenant.findUnique({ where: { slug } });
  if (slugExists) slug = `${slug}-${Date.now()}`;

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
      },
    });

    await bootstrapTenant(tx, {
      tenantName: parsed.data.tenantName,
      slug,
      userId: user.id,
    });
  });

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: "Account created but sign-in failed" };
  }
}
