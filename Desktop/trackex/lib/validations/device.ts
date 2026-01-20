import { z } from "zod"

export const registerDeviceSchema = z.object({
  employeeId: z.string().cuid(),
  platform: z.enum(["macos", "windows", "linux"]),
  deviceName: z.string().min(1, "Device name is required"),
  version: z.string().optional(),
})

export const heartbeatSchema = z.object({
  timestamp: z.string().datetime(),
  status: z.enum(["active", "idle"]),
  currentApp: z.object({
    name: z.string(),
    windowTitle: z.string().optional(),
    process: z.string().optional(),
    domain: z.string().optional(),
  }).optional(),
})

export const eventSchema = z.object({
  type: z.enum(["clock_in", "clock_out", "pause_session", "resume_session", "app_focus", "app_usage", "idle_start", "idle_end", "screenshot_taken", "screenshot_failed"]),
  timestamp: z.string().datetime(),
  data: z.record(z.any()).optional(),
})

export const batchEventsSchema = z.object({
  events: z.array(eventSchema).min(1, "At least one event is required"),
})

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>
export type HeartbeatInput = z.infer<typeof heartbeatSchema>
export type EventInput = z.infer<typeof eventSchema>
export type BatchEventsInput = z.infer<typeof batchEventsSchema>
