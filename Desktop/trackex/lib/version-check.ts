// Version check middleware for desktop apps
// Forces old versions to update

export const MINIMUM_APP_VERSION = process.env.MINIMUM_APP_VERSION || "1.0.3"
export const CURRENT_APP_VERSION = process.env.CURRENT_APP_VERSION || "1.0.3"

/**
 * Parse semantic version string to comparable number
 * e.g., "1.2.3" -> 1002003
 */
export function parseVersion(version: string): number {
  const parts = version.split(".").map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) {
    return 0
  }
  return parts[0] * 1000000 + parts[1] * 1000 + parts[2]
}

/**
 * Check if the client app version meets minimum requirements
 * Returns { allowed: boolean, message?: string }
 */
export function checkAppVersion(clientVersion?: string): {
  allowed: boolean
  message?: string
} {
  // STRICT VERSION CHECK: Block old apps without version headers
  // This prevents old apps from hammering the server
  if (!clientVersion) {
    return {
      allowed: false,
      message: `APP_UPDATE_REQUIRED: Please update to version ${MINIMUM_APP_VERSION} or later. Download from https://trackex.app/download`,
    }
  }

  const clientVer = parseVersion(clientVersion)
  const minVer = parseVersion(MINIMUM_APP_VERSION)

  if (clientVer < minVer) {
    return {
      allowed: false,
      message: `APP_UPDATE_REQUIRED: Please update to version ${MINIMUM_APP_VERSION} or later. Download from trackex.app`,
    }
  }

  return { allowed: true }
}

/**
 * Extract app version from User-Agent header
 * Expected format: "TrackEx/1.0.0" or similar
 */
export function extractAppVersion(
  userAgent?: string | null
): string | undefined {
  if (!userAgent) return undefined

  // Match pattern like "TrackEx/1.0.0" or "TrackExAgent/1.0.0"
  const match = userAgent.match(/TrackEx(?:Agent)?\/(\d+\.\d+\.\d+)/i)
  return match?.[1]
}
