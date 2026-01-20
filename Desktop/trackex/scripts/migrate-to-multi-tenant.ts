/**
 * Migration Script: Single-Tenant to Multi-Tenant
 *
 * This script migrates existing data from the single-tenant structure
 * to the new multi-tenant structure.
 *
 * Usage: npx tsx scripts/migrate-to-multi-tenant.ts
 *
 * What it does:
 * 1. Creates a default organization for existing data
 * 2. Migrates existing OWNER user to the new organization with OWNER role
 * 3. Backfills organizationId to all existing employees, teams, policies, app rules, domain rules
 * 4. Creates beta licenses for all existing employees
 * 5. Updates audit logs to reference the organization
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50)
}

async function main() {
  console.log("\n🚀 Starting Multi-Tenant Migration...\n")
  console.log("━".repeat(60))

  // Step 1: Find existing owner user
  console.log("\n📌 Step 1: Finding existing owner user...")

  const existingOwner = await prisma.user.findFirst({
    where: { role: "OWNER", isActive: true },
  })

  if (!existingOwner) {
    console.log(
      "⚠️  No existing OWNER user found. Creating migration without user association."
    )
  } else {
    console.log(`✅ Found owner: ${existingOwner.email}`)
  }

  // Step 2: Check if organization already exists
  console.log("\n📌 Step 2: Checking for existing organizations...")

  const existingOrg = await prisma.organization.findFirst()

  let defaultOrg

  if (existingOrg) {
    console.log(
      `⚠️  Organization already exists: ${existingOrg.name} (${existingOrg.slug})`
    )
    console.log("   Using existing organization for migration.")
    defaultOrg = existingOrg
  } else {
    // Create default organization
    console.log("\n📌 Step 3: Creating default organization...")

    const orgName = process.env.DEFAULT_ORG_NAME || "Default Organization"
    const orgEmail =
      existingOwner?.email ||
      process.env.DEFAULT_ORG_EMAIL ||
      "admin@trackex.local"

    defaultOrg = await prisma.organization.create({
      data: {
        name: orgName,
        slug: generateSlug(orgName),
        email: orgEmail,
        isBetaTester: true, // Preserve access during migration
        bypassPayment: true, // Bypass payment for existing data
        isActive: true,
      },
    })

    console.log(`✅ Created organization: ${defaultOrg.name}`)
    console.log(`   ID: ${defaultOrg.id}`)
    console.log(`   Slug: ${defaultOrg.slug}`)
    console.log(`   Email: ${defaultOrg.email}`)
  }

  // Step 3: Migrate owner user to organization
  if (existingOwner) {
    console.log("\n📌 Step 4: Migrating owner to organization...")

    // Check if already migrated
    const existingOrgUser = await prisma.organizationUser.findFirst({
      where: {
        userId: existingOwner.id,
        organizationId: defaultOrg.id,
      },
    })

    if (existingOrgUser) {
      console.log("⚠️  Owner already linked to organization.")
    } else {
      // Update user role to USER (org-level role is now in OrganizationUser)
      await prisma.user.update({
        where: { id: existingOwner.id },
        data: { role: "USER" }, // Platform role, org role is OWNER in OrganizationUser
      })

      await prisma.organizationUser.create({
        data: {
          userId: existingOwner.id,
          organizationId: defaultOrg.id,
          role: "OWNER",
          teamIds: [],
          isActive: true,
        },
      })

      console.log(
        `✅ Linked owner ${existingOwner.email} to organization as OWNER`
      )
    }
  }

  // Step 4: Migrate Employees
  console.log("\n📌 Step 5: Migrating employees...")

  // Find employees without organizationId
  const employeesWithoutOrg = await prisma.employee
    .findMany({
      where: {
        organizationId: undefined,
      } as any,
    })
    .catch(() => [])

  // Use raw SQL to check and update employees without organizationId
  const employeeResult = await prisma.$executeRaw`
    UPDATE employees 
    SET organization_id = ${defaultOrg.id} 
    WHERE organization_id IS NULL
  `

  console.log(`✅ Updated ${employeeResult} employees with organization ID`)

  // Step 5: Migrate Teams
  console.log("\n📌 Step 6: Migrating teams...")

  const teamResult = await prisma.$executeRaw`
    UPDATE teams 
    SET organization_id = ${defaultOrg.id} 
    WHERE organization_id IS NULL
  `

  console.log(`✅ Updated ${teamResult} teams with organization ID`)

  // Step 6: Migrate Policies
  console.log("\n📌 Step 7: Migrating policies...")

  const policyResult = await prisma.$executeRaw`
    UPDATE policies 
    SET organization_id = ${defaultOrg.id} 
    WHERE organization_id IS NULL
  `

  console.log(`✅ Updated ${policyResult} policies with organization ID`)

  // Step 7: Migrate App Rules (mark as organization-specific, not global)
  console.log("\n📌 Step 8: Migrating app rules...")

  const appRuleResult = await prisma.$executeRaw`
    UPDATE app_rules 
    SET organization_id = ${defaultOrg.id}, is_global = false 
    WHERE organization_id IS NULL
  `

  console.log(`✅ Updated ${appRuleResult} app rules with organization ID`)

  // Step 8: Migrate Domain Rules
  console.log("\n📌 Step 9: Migrating domain rules...")

  const domainRuleResult = await prisma.$executeRaw`
    UPDATE domain_rules 
    SET organization_id = ${defaultOrg.id}, is_global = false 
    WHERE organization_id IS NULL
  `

  console.log(
    `✅ Updated ${domainRuleResult} domain rules with organization ID`
  )

  // Step 9: Migrate Audit Logs
  console.log("\n📌 Step 10: Migrating audit logs...")

  const auditLogResult = await prisma.$executeRaw`
    UPDATE audit_logs 
    SET organization_id = ${defaultOrg.id} 
    WHERE organization_id IS NULL
  `

  console.log(`✅ Updated ${auditLogResult} audit logs with organization ID`)

  // Step 10: Create licenses for all existing employees
  console.log("\n📌 Step 11: Creating licenses for existing employees...")

  const employees = await prisma.employee.findMany({
    where: { organizationId: defaultOrg.id },
    select: { id: true, name: true, email: true },
  })

  let licensesCreated = 0
  let licensesSkipped = 0

  for (const employee of employees) {
    // Check if license already exists
    const existingLicense = await prisma.license.findUnique({
      where: { employeeId: employee.id },
    })

    if (existingLicense) {
      licensesSkipped++
      continue
    }

    await prisma.license.create({
      data: {
        organizationId: defaultOrg.id,
        employeeId: employee.id,
        status: "ACTIVE",
        source: "BETA_BYPASS",
        activatedAt: new Date(),
        notes: "Auto-created during multi-tenant migration",
      },
    })

    licensesCreated++
  }

  console.log(
    `✅ Created ${licensesCreated} licenses (${licensesSkipped} already existed)`
  )

  // Final Summary
  console.log("\n" + "━".repeat(60))
  console.log("\n✨ Migration Complete!\n")
  console.log("📊 Summary:")
  console.log(`   Organization: ${defaultOrg.name} (${defaultOrg.id})`)
  console.log(`   Employees migrated: ${employeeResult}`)
  console.log(`   Teams migrated: ${teamResult}`)
  console.log(`   Policies migrated: ${policyResult}`)
  console.log(`   App rules migrated: ${appRuleResult}`)
  console.log(`   Domain rules migrated: ${domainRuleResult}`)
  console.log(`   Audit logs migrated: ${auditLogResult}`)
  console.log(`   Licenses created: ${licensesCreated}`)

  console.log("\n⚠️  Important Notes:")
  console.log(
    "   1. The organization has isBetaTester=true and bypassPayment=true"
  )
  console.log("   2. All employees have BETA_BYPASS licenses")
  console.log(
    "   3. You may want to update the organization details after migration"
  )
  console.log(
    '   4. Run "npx prisma migrate deploy" to apply any pending migrations'
  )
  console.log("\n")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error("\n❌ Migration Error:", e)
    await prisma.$disconnect()
    process.exit(1)
  })
