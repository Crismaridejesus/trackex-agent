import { z } from "zod";

export const companySizes = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "500+",
] as const

export type CompanySize = (typeof companySizes)[number]

export const registrationSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be less than 100 characters"),
    email: z
      .string()
      .email("Invalid email address")
      .max(255, "Email must be less than 255 characters"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be less than 128 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string(),
    companyName: z
      .string()
      .min(2, "Company name must be at least 2 characters")
      .max(100, "Company name must be less than 100 characters"),
    companySize: z.enum(companySizes, {
      errorMap: () => ({ message: "Please select a company size" }),
    }),
    industry: z
      .string()
      .max(100, "Industry must be less than 100 characters")
      .optional(),
    timezone: z
      .string()
      .max(100, "Timezone must be less than 100 characters")
      .optional(),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type RegistrationData = z.infer<typeof registrationSchema>

// Schema for API (without confirmPassword and acceptTerms)
export const registrationApiSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  companyName: z.string().min(2).max(100),
  companySize: z.enum(companySizes),
  industry: z.string().max(100).optional(),
  timezone: z.string().max(100).optional(),
})

export type RegistrationApiData = z.infer<typeof registrationApiSchema>
