import { NextRequest, NextResponse } from "next/server"
import { requireDeviceAuth } from "@/lib/auth/device"
import { prisma } from "@/lib/db"
import { validateAgentVersion } from "@/lib/version-validator"
import { checkEmployeeLicenseStatus } from "@/lib/licensing"

export const dynamic = "force-dynamic"

/**
 * GET /api/agent/settings
 * 
 * Fetches employee settings needed by the desktop agent,
 * including screenshot settings and timezone.
 */
export async function GET(req: NextRequest) {
  try {
    // Validate version first
    const versionError = validateAgentVersion(req)
    if (versionError) return versionError

    // Authenticate device
    const { device } = await requireDeviceAuth(req)

    // Check license status
    const { hasLicense, licenseTier } = await checkEmployeeLicenseStatus(device.employeeId)

    // Fetch employee settings
    const employee = await prisma.employee.findUnique({
      where: { id: device.employeeId },
      select: {
        autoScreenshots: true,
        screenshotInterval: true,
        timezone: true,
        license: {
          select: {
            tier: true,
            includesAutoScreenshots: true,
            status: true,
            source: true,
          },
        },
        policy: {
          select: {
            autoScreenshots: true,
            screenshotInterval: true,
            idleThresholdS: true,
            countIdleAsWork: true,
            redactTitles: true,
            browserDomainOnly: true,
          },
        },
        team: {
          select: {
            defaultPolicy: {
              select: {
                autoScreenshots: true,
                screenshotInterval: true,
                idleThresholdS: true,
                countIdleAsWork: true,
                redactTitles: true,
                browserDomainOnly: true,
              },
            },
          },
        },
      },
    })

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      )
    }

    // Determine effective policy: employee's direct policy or team's default policy
    const effectivePolicy = employee.policy ?? employee.team?.defaultPolicy ?? null

    /**
     * Auto Screenshot Priority Hierarchy:
     * 
     * 1. Employee-level settings (highest priority)
     *    - Use employee's values if screenshotInterval is explicitly set
     *    - This indicates the employee has been configured for screenshots
     * 
     * 2. Policy-level settings (fallback)
     *    - If employee doesn't have screenshot settings configured,
     *    - check if employee belongs to a team with a policy
     *    - Use policy's autoScreenshots and screenshotInterval
     * 
     * 3. Disabled (no settings)
     *    - If neither employee nor policy settings exist,
     *    - auto screenshots are disabled
     */
    
    // Check if employee has explicit screenshot settings configured
    // We use screenshotInterval as the indicator since autoScreenshots defaults to false
    const hasEmployeeScreenshotSettings = employee.screenshotInterval !== null

    let autoScreenshots: boolean
    let screenshotInterval: number | null
    let settingsSource: string

    if (hasEmployeeScreenshotSettings) {
      // Priority 1: Use employee-level settings
      autoScreenshots = employee.autoScreenshots
      screenshotInterval = employee.screenshotInterval
      settingsSource = "employee"
    } else if (effectivePolicy?.screenshotInterval !== null && effectivePolicy?.screenshotInterval !== undefined) {
      // Priority 2: Use policy-level settings (via direct policy or team's default policy)
      autoScreenshots = effectivePolicy.autoScreenshots
      screenshotInterval = effectivePolicy.screenshotInterval
      settingsSource = "policy"
    } else {
      // Priority 3: No settings configured - disable auto screenshots
      autoScreenshots = false
      screenshotInterval = null
      settingsSource = "default-disabled"
    }

    // License-based validation: Auto screenshots require TEAM tier or higher
    if (autoScreenshots) {
      // STARTER tier (free plan) cannot use auto screenshots
      if (!hasLicense || licenseTier === "STARTER") {
        autoScreenshots = false
        screenshotInterval = null
        settingsSource = "disabled-license-tier"
        console.log(`[AgentSettings] Auto-screenshots disabled: License tier ${licenseTier || 'NONE'} does not support auto screenshots`)
      }
      // Check if license is active
      else if (employee.license?.status !== "ACTIVE") {
        autoScreenshots = false
        screenshotInterval = null
        settingsSource = "disabled-license-inactive"
        console.log(`[AgentSettings] Auto-screenshots disabled: License status is ${employee.license?.status || 'NONE'}`)  
      }
    }

    // DIAGNOSTIC LOGGING for production debugging
    // This helps identify why auto-screenshots might not be working
    console.log(`[AgentSettings] Employee: ${device.employeeId} | Device: ${device.id}`)
    console.log(`[AgentSettings] Raw DB values:`, {
      employeeAutoScreenshots: employee.autoScreenshots,
      employeeInterval: employee.screenshotInterval,
      policyAutoScreenshots: effectivePolicy?.autoScreenshots ?? null,
      policyInterval: effectivePolicy?.screenshotInterval ?? null,
      hasPolicy: !!effectivePolicy,
    })
    console.log(`[AgentSettings] License check:`, {
      hasLicense,
      licenseTier,
      licenseStatus: employee.license?.status ?? null,
      includesAutoScreenshots: employee.license?.includesAutoScreenshots ?? null,
    })
    console.log(`[AgentSettings] Resolution: source=${settingsSource}, autoScreenshots=${autoScreenshots}, interval=${screenshotInterval}`)

    return NextResponse.json({
      autoScreenshots,
      screenshotInterval,
      timezone: employee.timezone,
      policy: effectivePolicy ? {
        idleThresholdS: effectivePolicy.idleThresholdS,
        countIdleAsWork: effectivePolicy.countIdleAsWork,
        redactTitles: effectivePolicy.redactTitles,
        browserDomainOnly: effectivePolicy.browserDomainOnly,
      } : null,
    })
  } catch (error) {
    console.error("Failed to fetch agent settings:", error)

    if (error instanceof Error && error.message.includes("token")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}
