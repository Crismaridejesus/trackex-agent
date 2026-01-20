/**
 * Version Validation Middleware
 *
 * Validates desktop agent version BEFORE any database operations
 * to prevent old/buggy agents from overwhelming the server.
 *
 * CRITICAL: This must be the FIRST thing checked in agent API routes
 * to prevent connection pool exhaustion from outdated clients.
 */

import { NextRequest, NextResponse } from "next/server";
import { MINIMUM_APP_VERSION } from "./version-check";

/**
 * Validates the User-Agent header contains a valid app version
 *
 * Expected format: "TrackEx-Agent/X.Y.Z"
 *
 * Returns error response if:
 * - User-Agent is missing
 * - Version format is invalid
 * - Version is below minimum required version
 *
 * @param req - Next.js request object
 * @returns NextResponse with 426 error if invalid, null if valid
 */
export function validateAgentVersion(req: NextRequest): NextResponse | null {
  const userAgent = req.headers.get("user-agent");
  const endpoint = new URL(req.url).pathname;
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

  // Check if User-Agent header exists
  if (!userAgent) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `[VersionValidator] BLOCKED - Missing User-Agent | IP: ${clientIp} | Endpoint: ${endpoint}`
      );
    }
    return NextResponse.json(
      {
        error: "Missing User-Agent header",
        message: "Desktop agent version is required. Please update your TrackEx Agent.",
        minimumVersion: MINIMUM_APP_VERSION,
      },
      { status: 426 } // 426 Upgrade Required
    );
  }

  // Extract version from User-Agent (format: "TrackExAgent/1.0.2" or "TrackEx-Agent/1.0.2")
  // Accept both formats for backward compatibility
  const versionMatch = userAgent.match(/TrackEx-?Agent\/(\d+\.\d+\.\d+)/);

  if (!versionMatch) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `[VersionValidator] BLOCKED - Invalid format | IP: ${clientIp} | User-Agent: ${userAgent} | Endpoint: ${endpoint}`
      );
    }
    return NextResponse.json(
      {
        error: "Invalid User-Agent format",
        message: "Desktop agent version format is invalid. Please update your TrackEx Agent.",
        minimumVersion: MINIMUM_APP_VERSION,
        receivedUserAgent: userAgent,
      },
      { status: 426 }
    );
  }

  const agentVersion = versionMatch[1];

  // Compare versions
  if (!isVersionValid(agentVersion, MINIMUM_APP_VERSION)) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `[VersionValidator] BLOCKED - Old version | IP: ${clientIp} | Version: ${agentVersion} (minimum: ${MINIMUM_APP_VERSION}) | Endpoint: ${endpoint}`
      );
    }
    return NextResponse.json(
      {
        error: "Outdated agent version",
        message: `Your TrackEx Agent version ${agentVersion} is outdated. Please update to version ${MINIMUM_APP_VERSION} or higher.`,
        currentVersion: agentVersion,
        minimumVersion: MINIMUM_APP_VERSION,
        downloadUrl: "https://trackex.app/download",
      },
      { status: 426 }
    );
  }

  // Version is valid - allow request to proceed
  // Only log in production to track migration progress
  if (process.env.NODE_ENV === "production") {
    console.log(
      `[VersionValidator] ALLOWED - Version ${agentVersion} | IP: ${clientIp} | Endpoint: ${endpoint}`
    );
  }

  return null;
}

/**
 * Compares two semantic version strings
 *
 * @param version - Version to check (e.g., "1.0.1")
 * @param minimumVersion - Minimum required version (e.g., "1.0.2")
 * @returns true if version >= minimumVersion, false otherwise
 */
function isVersionValid(version: string, minimumVersion: string): boolean {
  const vParts = version.split(".").map(Number);
  const minParts = minimumVersion.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const v = vParts[i] || 0;
    const min = minParts[i] || 0;

    if (v > min) return true;
    if (v < min) return false;
  }

  return true; // Versions are equal
}

/**
 * Usage in API routes:
 *
 * ```typescript
 * import { validateAgentVersion } from "@/lib/version-validator";
 *
 * export async function POST(req: NextRequest) {
 *   // FIRST: Validate version (before any database operations!)
 *   const versionError = validateAgentVersion(req);
 *   if (versionError) return versionError;
 *
 *   // Continue with normal request handling...
 * }
 * ```
 */
