import { z } from "zod"

export const createDomainRuleSchema = z.object({
  domain: z.string()
    .min(1, "Domain is required")
    .transform(v => v.trim())
    .pipe(z.string().regex(/^[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+$/, "Invalid domain format")),
  matcherType: z.enum(["EXACT", "SUFFIX", "CONTAINS"]).default("SUFFIX"),
  category: z.enum(["PRODUCTIVE", "NEUTRAL", "UNPRODUCTIVE"]),
  description: z.string().max(255).optional(),
  priority: z.number().int().min(1).max(1000).default(100),
})

export const updateDomainRuleSchema = z.object({
  domain: z.string()
    .min(1, "Domain is required")
    .transform(v => v.trim())
    .pipe(z.string().regex(/^[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+$/, "Invalid domain format"))
    .optional(),
  matcherType: z.enum(["EXACT", "SUFFIX", "CONTAINS"]).optional(),
  category: z.enum(["PRODUCTIVE", "NEUTRAL", "UNPRODUCTIVE"]).optional(),
  description: z.string().max(255).nullable().optional(),
  priority: z.number().int().min(1).max(1000).optional(),
  isActive: z.boolean().optional(),
})

export const testDomainRuleSchema = z.object({
  domain: z.string().min(1, "Domain is required"),
  matcherType: z.enum(["EXACT", "SUFFIX", "CONTAINS"]),
  testDomain: z.string().min(1, "Test domain is required"),
})

export type CreateDomainRuleInput = z.infer<typeof createDomainRuleSchema>
export type UpdateDomainRuleInput = z.infer<typeof updateDomainRuleSchema>
export type TestDomainRuleInput = z.infer<typeof testDomainRuleSchema>
