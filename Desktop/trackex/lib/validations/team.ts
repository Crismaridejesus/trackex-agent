import { z } from "zod"

export const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  defaultPolicyId: z.string().optional(),
})

export const updateTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").optional(),
  defaultPolicyId: z.string().nullable().optional(),
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>
