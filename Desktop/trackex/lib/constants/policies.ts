export const DEFAULT_POLICY = {
  name: "Default Policy",
  idleThresholdS: 120, // 2 minutes (default)
  countIdleAsWork: false,
  screenshotEvery: null, // disabled by default
  redactTitles: false,
  browserDomainOnly: true,
  workHours: {
    monday: { start: "09:00", end: "17:00", enabled: true },
    tuesday: { start: "09:00", end: "17:00", enabled: true },
    wednesday: { start: "09:00", end: "17:00", enabled: true },
    thursday: { start: "09:00", end: "17:00", enabled: true },
    friday: { start: "09:00", end: "17:00", enabled: true },
    saturday: { start: "09:00", end: "17:00", enabled: false },
    sunday: { start: "09:00", end: "17:00", enabled: false },
  },
} as const

export const FLEXIBLE_POLICY = {
  name: "Flexible Policy",
  idleThresholdS: 600, // 10 minutes
  countIdleAsWork: false,
  screenshotEvery: null,
  redactTitles: true,
  browserDomainOnly: true,
  workHours: null, // no restrictions
} as const

export const STRICT_POLICY = {
  name: "Strict Policy",
  idleThresholdS: 180, // 3 minutes
  countIdleAsWork: false,
  screenshotEvery: 30, // every 30 minutes
  redactTitles: false,
  browserDomainOnly: false,
  workHours: {
    monday: { start: "09:00", end: "17:00", enabled: true },
    tuesday: { start: "09:00", end: "17:00", enabled: true },
    wednesday: { start: "09:00", end: "17:00", enabled: true },
    thursday: { start: "09:00", end: "17:00", enabled: true },
    friday: { start: "09:00", end: "17:00", enabled: true },
    saturday: { start: "09:00", end: "17:00", enabled: false },
    sunday: { start: "09:00", end: "17:00", enabled: false },
  },
} as const
