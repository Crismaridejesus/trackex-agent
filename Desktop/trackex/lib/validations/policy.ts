import { z } from "zod"

export const createPolicySchema = z.object({
  name: z.string().min(1, "Policy name is required"),
  idleThresholdS: z.number().int().min(60).max(3600).default(120), // 1-60 minutes, default 2 min
  countIdleAsWork: z.boolean().default(false),
  autoScreenshots: z.boolean().default(false),
  screenshotInterval: z.number().int().min(2).max(60).nullable().optional(), // 2-60 minutes
  redactTitles: z.boolean().default(false),
  browserDomainOnly: z.boolean().default(true),
  workHours: z.record(z.any()).nullable().optional(),
  isDefault: z.boolean().default(false),
})

export const updatePolicySchema = z.object({
  name: z.string().min(1, "Policy name is required").optional(),
  idleThresholdS: z.number().int().min(60).max(3600).optional(),
  countIdleAsWork: z.boolean().optional(),
  autoScreenshots: z.boolean().optional(),
  screenshotInterval: z.number().int().min(2).max(60).nullable().optional(),
  redactTitles: z.boolean().optional(),
  browserDomainOnly: z.boolean().optional(),
  workHours: z.record(z.any()).nullable().optional(),
  isDefault: z.boolean().optional(),
})

export type CreatePolicyInput = z.infer<typeof createPolicySchema>
export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>
