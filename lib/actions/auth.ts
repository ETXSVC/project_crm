"use server";

import bcrypt from "bcryptjs";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { slugify } from "@/lib/utils";
import { loginSchema, signupSchema } from "@/lib/validations/schemas";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

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

    const tenant = await tx.tenant.create({
      data: {
        name: parsed.data.tenantName,
        slug,
      },
    });

    await tx.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: "OWNER",
      },
    });

    const defaultStages = [
      { name: "Prospecting", sortOrder: 0, probability: 10 },
      { name: "Qualification", sortOrder: 1, probability: 25 },
      { name: "Proposal", sortOrder: 2, probability: 50 },
      { name: "Negotiation", sortOrder: 3, probability: 75 },
      { name: "Closed Won", sortOrder: 4, probability: 100 },
    ];

    for (const stage of defaultStages) {
      await tx.pipelineStage.create({
        data: { tenantId: tenant.id, ...stage },
      });
    }

    await tx.projectCalendar.create({
      data: {
        tenantId: tenant.id,
        name: "Standard Work Week",
        workDays: [1, 2, 3, 4, 5],
        hoursPerDay: 8,
      },
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
