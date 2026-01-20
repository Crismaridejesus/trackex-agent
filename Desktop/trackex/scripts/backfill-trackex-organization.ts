import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()

async function main() {
  // Use a stable ID so we can reference it reliably if needed
  const TRACKEX_ORG_ID = "cmk6zlz5700316u93pu0oetu7"

  // 1) Ensure the Organization exists
  const org = await prisma.organization.upsert({
    where: { id: TRACKEX_ORG_ID },
    update: {
      name: "Trackex",
      slug: "trackex",
      email: "beta@trackex.local",
      isBetaTester: true,
      bypassPayment: true,
      isActive: true,
    },
    create: {
      id: TRACKEX_ORG_ID,
      name: "Trackex",
      slug: "trackex",
      email: "beta@trackex.local",
      isBetaTester: true,
      bypassPayment: true,
      isActive: true,
    },
  })

  console.log("Using Organization:", org)

  // 1.1) Update existing admin user and set up roles
  const ADMIN_USER_ID = "cmiqp411r0000rcl1oq43d8qv"
  const ADMIN_EMAIL = "admin@trackex.com"

  // Update the existing user
  const adminUser = await prisma.user.upsert({
    where: { id: ADMIN_USER_ID },
    update: {
      name: "Trackex Admin",
      role: "USER", // Org-level role is now in OrganizationUser
    },
    create: {
      id: ADMIN_USER_ID,
      email: ADMIN_EMAIL,
      name: "Trackex Admin",
      password: "$2a$12$QaKylyYyKHgc0MrMXiQVOO/ZvQsk3jbpdkde9VAEXFHTFrY18i056",
      role: "USER",
      isActive: true,
    },
  })

  console.log("Updated admin user:", adminUser)

  // Create OrganizationUser entry with OWNER role
  const orgUser = await prisma.organizationUser.upsert({
    where: {
      userId_organizationId: {
        userId: ADMIN_USER_ID,
        organizationId: TRACKEX_ORG_ID,
      },
    },
    update: {
      role: "OWNER",
      isActive: true,
    },
    create: {
      userId: ADMIN_USER_ID,
      organizationId: TRACKEX_ORG_ID,
      role: "OWNER",
      isActive: true,
    },
  })

  console.log("Created/updated OrganizationUser for admin:", orgUser)

  // 1.2) Create Super Admin user
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@trackex.com" },
    update: {
      name: "Super Admin",
      role: "SUPER_ADMIN",
      isActive: true,
    },
    create: {
      email: "superadmin@trackex.com",
      name: "Super Admin",
      password: "$2a$12$QaKylyYyKHgc0MrMXiQVOO/ZvQsk3jbpdkde9VAEXFHTFrY18i056",
      role: "SUPER_ADMIN",
      isActive: true,
    },
  })

  console.log("Created/updated Super Admin:", superAdmin)

  // 1.3) Create test organization and owner to verify org scoping
  const testOrg = await prisma.organization.upsert({
    where: { slug: "test-company" },
    update: {
      name: "Test Company Inc.",
      email: "test@example.com",
      isBetaTester: false,
      bypassPayment: false,
      isActive: true,
    },
    create: {
      name: "Test Company Inc.",
      slug: "test-company",
      email: "test@example.com",
      isBetaTester: false,
      bypassPayment: false,
      isActive: true,
    },
  })

  console.log("Created/updated test organization:", testOrg)

  // Create test user
  const testUser = await prisma.user.upsert({
    where: { email: "testowner@example.com" },
    update: {
      name: "Test Owner",
      role: "USER",
      isActive: true,
    },
    create: {
      email: "testowner@example.com",
      name: "Test Owner",
      password: "$2a$12$QaKylyYyKHgc0MrMXiQVOO/ZvQsk3jbpdkde9VAEXFHTFrY18i056",
      role: "USER",
      isActive: true,
    },
  })

  console.log("Created/updated test user:", testUser)

  // Create OrganizationUser entry with OWNER role for test org
  const testOrgUser = await prisma.organizationUser.upsert({
    where: {
      userId_organizationId: {
        userId: testUser.id,
        organizationId: testOrg.id,
      },
    },
    update: {
      role: "OWNER",
      isActive: true,
    },
    create: {
      userId: testUser.id,
      organizationId: testOrg.id,
      role: "OWNER",
      isActive: true,
    },
  })

  console.log("Created/updated OrganizationUser for test owner:", testOrgUser)

  // 1.5) Preemptively resolve duplicate employee emails so the composite unique
  //      (organization_id, email) won't fail when we assign the same org.
  //      Keep the most recent as-is; suffix older duplicates with +dupN.
  const dupEmails = await prisma.$queryRawUnsafe<{ email: string }[]>(
    `SELECT lower(email) as email
     FROM employees
     GROUP BY lower(email)
     HAVING count(*) > 1`
  )

  for (const row of dupEmails) {
    const email = row.email
    const emps = await prisma.$queryRawUnsafe<
      { id: string; email: string; created_at: Date }[]
    >(
      `SELECT id, email, created_at
       FROM employees
       WHERE lower(email) = $1
       ORDER BY created_at DESC`,
      email
    )

    // Keep the newest as-is; suffix the rest (2nd, 3rd, ...)
    for (let i = 1; i < emps.length; i++) {
      const { id, email: orig } = emps[i]
      const at = orig.indexOf("@")
      let newEmail: string
      if (at > -1) {
        const local = orig.slice(0, at)
        const domain = orig.slice(at + 1)
        newEmail = `${local}+dup${i}@${domain}`
      } else {
        newEmail = `${orig}+dup${i}`
      }
      await prisma.$executeRawUnsafe(
        "UPDATE employees SET email = $1 WHERE id = $2",
        newEmail.toLowerCase(),
        id
      )
      console.log(`Renamed duplicate email ${orig} -> ${newEmail}`)
    }
  }

  // 2) Backfill organization_id on existing data if the column exists
  // We use raw SQL for efficiency; Prisma ignores tables without matching models.
  // Note: columns were added as nullable in the interim schema.
  const orgId = org.id

  const [emp, team, pol, appRule, domainRule, auditLog] = await prisma.$transaction([
    prisma.$executeRawUnsafe(
      "UPDATE employees SET organization_id = $1 WHERE organization_id IS NULL",
      orgId
    ),
    prisma.$executeRawUnsafe(
      "UPDATE teams SET organization_id = $1 WHERE organization_id IS NULL",
      orgId
    ),
    prisma.$executeRawUnsafe(
      "UPDATE policies SET organization_id = $1 WHERE organization_id IS NULL",
      orgId
    ),
    prisma.$executeRawUnsafe(
      "UPDATE app_rules SET organization_id = $1 WHERE organization_id IS NULL",
      orgId
    ),
    prisma.$executeRawUnsafe(
      "UPDATE domain_rules SET organization_id = $1 WHERE organization_id IS NULL",
      orgId
    ),
    prisma.$executeRawUnsafe(
      "UPDATE audit_logs SET organization_id = $1 WHERE organization_id IS NULL",
      orgId
    ),
  ])

  console.log(
    `Backfill complete: employees=${emp}, teams=${team}, policies=${pol}, appRules=${appRule}, domainRules=${domainRule}, auditLogs=${auditLog}`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
