/**
 * License Activation Script
 *
 * Manually activate licenses for employees without going through Stripe.
 * Useful for testing, beta users, and internal employee accounts.
 *
 * Usage:
 *   npx tsx scripts/activate-licenses.ts --org=<orgId> --all
 *   npx tsx scripts/activate-licenses.ts --org=<orgId> --employees=id1,id2,id3
 *   npx tsx scripts/activate-licenses.ts --org=<orgId> --source=MANUAL
 *   npx tsx scripts/activate-licenses.ts --deactivate --org=<orgId> --employees=id1,id2
 *
 * Options:
 *   --org=<orgId>        Organization ID (required)
 *   --all                Activate licenses for all employees in the organization
 *   --employees=<ids>    Comma-separated list of employee IDs to activate
 *   --source=<source>    License source: MANUAL, BETA_BYPASS (default: MANUAL)
 *   --deactivate         Deactivate instead of activate
 *   --notes=<notes>      Optional notes for the license
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()

type LicenseSource = "STRIPE" | "MANUAL" | "BETA_BYPASS"

interface ActivationOptions {
  organizationId: string
  employeeIds: string[] | "all"
  source: LicenseSource
  deactivate: boolean
  notes?: string
}

function parseArgs(): ActivationOptions {
  const args = process.argv.slice(2)
  const options: Partial<ActivationOptions> = {
    source: "MANUAL",
    deactivate: false,
  }

  for (const arg of args) {
    if (arg.startsWith("--org=")) {
      options.organizationId = arg.substring(6)
    } else if (arg === "--all") {
      options.employeeIds = "all"
    } else if (arg.startsWith("--employees=")) {
      options.employeeIds = arg
        .substring(12)
        .split(",")
        .map((id) => id.trim())
    } else if (arg.startsWith("--source=")) {
      const source = arg.substring(9).toUpperCase() as LicenseSource
      if (["STRIPE", "MANUAL", "BETA_BYPASS"].includes(source)) {
        options.source = source
      } else {
        console.error(`Invalid source: ${source}`)
        process.exit(1)
      }
    } else if (arg === "--deactivate") {
      options.deactivate = true
    } else if (arg.startsWith("--notes=")) {
      options.notes = arg.substring(8)
    }
  }

  if (!options.organizationId) {
    console.error("❌ Error: --org=<orgId> is required")
    console.error("\nUsage:")
    console.error("  npx tsx scripts/activate-licenses.ts --org=<orgId> --all")
    console.error(
      "  npx tsx scripts/activate-licenses.ts --org=<orgId> --employees=id1,id2,id3"
    )
    process.exit(1)
  }

  if (!options.employeeIds) {
    console.error("❌ Error: Either --all or --employees=<ids> is required")
    process.exit(1)
  }

  return options as ActivationOptions
}

async function activateLicense(
  organizationId: string,
  employeeId: string,
  source: LicenseSource,
  notes?: string
): Promise<boolean> {
  try {
    await prisma.license.upsert({
      where: { employeeId },
      update: {
        status: "ACTIVE",
        source,
        activatedAt: new Date(),
        deactivatedAt: null,
        notes: notes || `Manually activated via script`,
      },
      create: {
        organizationId,
        employeeId,
        status: "ACTIVE",
        source,
        activatedAt: new Date(),
        notes: notes || `Manually activated via script`,
      },
    })
    return true
  } catch (error) {
    console.error(
      `Failed to activate license for employee ${employeeId}:`,
      error
    )
    return false
  }
}

async function deactivateLicense(
  employeeId: string,
  notes?: string
): Promise<boolean> {
  try {
    await prisma.license.update({
      where: { employeeId },
      data: {
        status: "INACTIVE",
        deactivatedAt: new Date(),
        notes: notes || "Manually deactivated via script",
      },
    })
    return true
  } catch (error) {
    console.error(
      `Failed to deactivate license for employee ${employeeId}:`,
      error
    )
    return false
  }
}

async function main() {
  const options = parseArgs()

  console.log("\n🔐 License Activation Script\n")
  console.log("━".repeat(60))

  // Verify organization exists
  const organization = await prisma.organization.findUnique({
    where: { id: options.organizationId },
  })

  if (!organization) {
    console.error(`❌ Organization not found: ${options.organizationId}`)
    process.exit(1)
  }

  console.log(`\n📌 Organization: ${organization.name} (${organization.id})`)
  console.log(`📌 Action: ${options.deactivate ? "DEACTIVATE" : "ACTIVATE"}`)
  console.log(`📌 Source: ${options.source}`)

  // Get employee IDs
  let employeeIds: string[]

  if (options.employeeIds === "all") {
    const employees = await prisma.employee.findMany({
      where: {
        organizationId: options.organizationId,
        isActive: true,
      },
      select: { id: true, name: true, email: true },
    })

    employeeIds = employees.map((e) => e.id)
    console.log(`\n📌 Processing ALL ${employeeIds.length} active employees\n`)
  } else {
    employeeIds = options.employeeIds
    console.log(`\n📌 Processing ${employeeIds.length} specified employees\n`)
  }

  if (employeeIds.length === 0) {
    console.log("⚠️  No employees to process.")
    return
  }

  // Process each employee
  let successCount = 0
  let failCount = 0

  for (const employeeId of employeeIds) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, email: true, organizationId: true },
    })

    if (!employee) {
      console.log(`⚠️  Employee not found: ${employeeId}`)
      failCount++
      continue
    }

    if (employee.organizationId !== options.organizationId) {
      console.log(
        `⚠️  Employee ${employee.email} belongs to different organization`
      )
      failCount++
      continue
    }

    let success: boolean

    if (options.deactivate) {
      success = await deactivateLicense(employeeId, options.notes)
      if (success) {
        console.log(`✅ Deactivated: ${employee.name} (${employee.email})`)
        successCount++
      } else {
        failCount++
      }
    } else {
      success = await activateLicense(
        options.organizationId,
        employeeId,
        options.source,
        options.notes
      )
      if (success) {
        console.log(`✅ Activated: ${employee.name} (${employee.email})`)
        successCount++
      } else {
        failCount++
      }
    }
  }

  // Summary
  console.log("\n" + "━".repeat(60))
  console.log("\n📊 Summary:")
  console.log(`   ✅ Successful: ${successCount}`)
  console.log(`   ❌ Failed: ${failCount}`)
  console.log(`   📌 Total: ${employeeIds.length}`)
  console.log("\n")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error("\n❌ Error:", e)
    await prisma.$disconnect()
    process.exit(1)
  })
