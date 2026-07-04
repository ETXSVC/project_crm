import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  tenantName: z.string().min(2),
});

export const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  crmAccountId: z.string().optional(),
});

export const taskSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["TASK", "MILESTONE", "SUMMARY"]).optional(),
  parentId: z.string().optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  duration: z.coerce.number().int().min(0).optional(),
  percentComplete: z.coerce.number().int().min(0).max(100).optional(),
});

export const taskUpdateSchema = taskSchema.partial();

export const resourceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["PERSON", "EQUIPMENT", "MATERIAL"]).optional(),
  email: z.string().email().optional().or(z.literal("")),
  capacityHrs: z.coerce.number().min(0).optional(),
  costRate: z.coerce.number().min(0).optional(),
  projectId: z.string().optional(),
});

export const dependencySchema = z.object({
  predecessorId: z.string(),
  successorId: z.string(),
  type: z.enum(["FS", "SS", "FF", "SF"]).optional(),
  lag: z.number().int().optional(),
});

export const crmAccountSchema = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
});

export const contactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  crmAccountId: z.string().optional(),
});

export const leadSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

export const opportunitySchema = z.object({
  name: z.string().min(1),
  value: z.number().min(0).optional(),
  crmAccountId: z.string().optional(),
  stageId: z.string().optional(),
  closeDate: z.string().optional(),
  description: z.string().optional(),
});

export const activitySchema = z.object({
  type: z.enum(["CALL", "EMAIL", "MEETING", "NOTE", "TASK"]),
  subject: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  crmAccountId: z.string().optional(),
  contactId: z.string().optional(),
  leadId: z.string().optional(),
  opportunityId: z.string().optional(),
});
