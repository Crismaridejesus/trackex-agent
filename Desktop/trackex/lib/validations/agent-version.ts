import { z } from "zod"

// Semantic versioning regex pattern (e.g., "1.0.4", "2.1.0")
const semverRegex = /^\d+\.\d+\.\d+$/

export const createAgentVersionSchema = z.object({
  version: z
    .string()
    .min(1, "Version is required")
    .regex(semverRegex, "Version must be in semantic versioning format (e.g., 1.0.4)"),
  platform: z.enum(["darwin", "windows"], {
    required_error: "Platform is required",
    invalid_type_error: "Platform must be either darwin or windows",
  }),
  arch: z.enum(["aarch64", "x86_64", "universal"], {
    required_error: "Architecture is required",
    invalid_type_error: "Architecture must be aarch64, x86_64, or universal",
  }),
  downloadUrl: z
    .string()
    .min(1, "Download URL is required")
    .url("Must be a valid URL"),
  signature: z
    .string()
    .min(1, "Signature is required")
    .min(20, "Signature appears to be too short"),
  releaseNotes: z
    .string()
    .min(1, "Release notes are required")
    .max(5000, "Release notes must be less than 5000 characters"),
  isActive: z.boolean().optional(),
  mandatory: z.boolean().optional(),
  fileSize: z.number().int().positive().optional().nullable(),
  releasedAt: z.string().datetime().optional(),
})

export const updateAgentVersionSchema = z.object({
  version: z
    .string()
    .regex(semverRegex, "Version must be in semantic versioning format (e.g., 1.0.4)")
    .optional(),
  platform: z
    .enum(["darwin", "windows"], {
      invalid_type_error: "Platform must be either darwin or windows",
    })
    .optional(),
  arch: z
    .enum(["aarch64", "x86_64", "universal"], {
      invalid_type_error: "Architecture must be aarch64, x86_64, or universal",
    })
    .optional(),
  downloadUrl: z.string().url("Must be a valid URL").optional(),
  signature: z.string().min(20, "Signature appears to be too short").optional(),
  releaseNotes: z.string().max(5000, "Release notes must be less than 5000 characters").optional(),
  isActive: z.boolean().optional(),
  mandatory: z.boolean().optional(),
  fileSize: z.number().int().positive().optional().nullable(),
  releasedAt: z.string().datetime().optional(),
})

export type CreateAgentVersionInput = z.infer<typeof createAgentVersionSchema>
export type UpdateAgentVersionInput = z.infer<typeof updateAgentVersionSchema>
