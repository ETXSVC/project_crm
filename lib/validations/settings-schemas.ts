import { z } from "zod";

export const workspaceSettingsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
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
