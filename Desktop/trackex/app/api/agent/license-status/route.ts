import { requireDeviceAuth } from "@/lib/auth/device"
import { getLicenseStatus } from "@/lib/licensing"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/agent/license-status
 *
 * Returns the license status for the authenticated employee.
 * Used by the desktop agent to check if the employee can continue using the app.
 */
export async function GET(req: NextRequest) {
  try {
    const deviceAuth = await requireDeviceAuth(req)

    const licenseStatus = await getLicenseStatus(deviceAuth.device.employeeId)

    return NextResponse.json(licenseStatus)
  } catch (error) {
    console.error("Failed to get license status:", error)
    return NextResponse.json(
      {
        valid: false,
        status: "ERROR",
        expiresAt: null,
        message: "Failed to check license status",
      },
      {
        status:
          error instanceof Error && error.message.includes("authentication")
            ? 401
            : 500,
      }
    )
  }
}
