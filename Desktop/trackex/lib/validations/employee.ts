import { z } from "zod"

export const createEmployeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  teamId: z.string().optional(),
  policyId: z.string().optional(),
})

export const updateEmployeeSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  teamId: z.string().nullable().optional(),
  policyId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  autoScreenshots: z.boolean().optional(),
  screenshotInterval: z.number().int().min(2, "Minimum interval is 2 minutes").max(60, "Maximum interval is 60 minutes").nullable().optional(),
})

export const editSessionSchema = z.object({
  clockIn: z.string().datetime().optional(),
  clockOut: z.string().datetime().nullable().optional(),
  editReason: z.string().min(1, "Edit reason is required"),
})

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>
export type EditSessionInput = z.infer<typeof editSessionSchema>
