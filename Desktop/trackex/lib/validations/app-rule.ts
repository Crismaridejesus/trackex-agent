import { z } from "zod"

export const createAppRuleSchema = z.object({
  matcherType: z.enum(["EXACT", "GLOB", "REGEX"]),
  value: z.string().min(1, "Value is required").transform(v => v.trim()),
  category: z.enum(["PRODUCTIVE", "NEUTRAL", "UNPRODUCTIVE"]),
  priority: z.number().int().min(1).max(1000).default(100),
})

export const updateAppRuleSchema = z.object({
  matcherType: z.enum(["EXACT", "GLOB", "REGEX"]).optional(),
  value: z.string().min(1, "Value is required").transform(v => v.trim()).optional(),
  category: z.enum(["PRODUCTIVE", "NEUTRAL", "UNPRODUCTIVE"]).optional(),
  priority: z.number().int().min(1).max(1000).optional(),
  isActive: z.boolean().optional(),
})

export const testRuleSchema = z.object({
  rules: z.array(z.object({
    matcherType: z.enum(["EXACT", "GLOB", "REGEX"]),
    value: z.string(),
    category: z.enum(["PRODUCTIVE", "NEUTRAL", "UNPRODUCTIVE"]),
    priority: z.number().int(),
  })),
  testCases: z.array(z.object({
    appName: z.string(),
    windowTitle: z.string().optional(),
    domain: z.string().optional(),
  })),
})

export type CreateAppRuleInput = z.infer<typeof createAppRuleSchema>
export type UpdateAppRuleInput = z.infer<typeof updateAppRuleSchema>
export type TestRuleInput = z.infer<typeof testRuleSchema>
