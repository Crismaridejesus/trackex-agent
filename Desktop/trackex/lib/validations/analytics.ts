import { z } from "zod"

export const analyticsFiltersSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  teamIds: z.array(z.string()).optional(),
  employeeIds: z.array(z.string()).optional(),
})

export const timeframeSchema = z.object({
  preset: z.enum(["today", "yesterday", "week", "month", "quarter", "year", "custom"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export const exportFiltersSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  teamIds: z.array(z.string()).optional(),
  employeeIds: z.array(z.string()).optional(),
  format: z.enum(["csv"]).default("csv"),
})

export type AnalyticsFiltersInput = z.infer<typeof analyticsFiltersSchema>
export type TimeframeInput = z.infer<typeof timeframeSchema>
export type ExportFiltersInput = z.infer<typeof exportFiltersSchema>
