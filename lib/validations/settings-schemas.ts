import { z } from "zod";

export const workspaceSettingsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50, "Slug must be at most 50 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens"
    ),
  logoUrl: z.union([z.string().url(), z.literal("")]).optional(),
});

export const pipelineStageSchema = z.object({
  name: z.string().min(1, "Stage name is required"),
  probability: z.coerce.number().int().min(0).max(100),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const calendarSettingsSchema = z.object({
  name: z.string().min(1, "Calendar name is required"),
  hoursPerDay: z.coerce.number().min(1).max(24),
  workDays: z.array(z.coerce.number().int().min(0).max(6)),
  holidays: z.array(z.string()).optional(),
});

export const vtigerSettingsSchema = z.object({
  baseUrl: z.string().url("Base URL must be a valid URL"),
  publicUrl: z.union([z.string().url(), z.literal("")]).optional(),
  username: z.string().min(1, "Username is required"),
  accessKey: z.string().optional(),
});
