/**
 * Script to create a Super Admin user
 *
 * Super Admin users have platform-level access to all organizations.
 * They can manage organizations, manually activate licenses, and configure platform settings.
 *
 * Usage: npx tsx scripts/create-super-admin.ts <email> <password>
 * Example: npx tsx scripts/create-super-admin.ts admin@trackex.com MySecurePassword123
 */

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]

  if (!email || !password) {
    console.error("❌ Error: Email and password are required")
    console.error(
      "\nUsage: npx tsx scripts/create-super-admin.ts <email> <password>"
    )
    console.error(
      "Example: npx tsx scripts/create-super-admin.ts admin@trackex.com MySecurePassword123"
    )
    process.exit(1)
  }

  if (password.length < 8) {
    console.warn(
      "⚠️  Warning: Password is less than 8 characters. Consider using a stronger password."
    )
  }

  console.log("\n🔐 Creating Super Admin User...\n")
  console.log(`📧 Email: ${email}`)

  // Hash the password
  const hashedPassword = await hashPassword(password)
  console.log("✅ Password hashed successfully")

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
    },
  })

  if (existingUser) {
    if (existingUser.role === "SUPER_ADMIN") {
      console.log("\n⚠️  User already exists as Super Admin")
      console.log("   Updating password...")

      await prisma.user.update({
        where: { id: existingUser.id },
        data: { password: hashedPassword },
      })

      console.log("✅ Password updated successfully!")
    } else {
      console.log("\n⚠️  User exists but is not a Super Admin")
      console.log("   Upgrading to Super Admin...")

      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          role: "SUPER_ADMIN",
        },
      })

      console.log("✅ User upgraded to Super Admin!")
    }

    console.log("\n━".repeat(80))
    console.log("\n📋 Super Admin Credentials:")
    console.log(`  Email: ${email}`)
    console.log(`  Password: [the password you just entered]`)
    console.log(`  Role: SUPER_ADMIN`)
    console.log(`  ID: ${existingUser.id}`)
    console.log("\n━".repeat(80))
    console.log("\n💡 You can now login at /login with these credentials")
    console.log("\n")
    return
  }

  // Create new Super Admin user
  const superAdmin = await prisma.user.create({
    data: {
      email,
      name: "Super Admin",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  })

  console.log("\n✅ Super Admin user created successfully!")
  console.log("\n━".repeat(80))
  console.log("\n📋 Super Admin Credentials:")
  console.log(`  Email: ${superAdmin.email}`)
  console.log(`  Password: [the password you just entered]`)
  console.log(`  Role: ${superAdmin.role}`)
  console.log(`  ID: ${superAdmin.id}`)
  console.log("\n━".repeat(80))
  console.log("\n💡 You can now login at /login with these credentials")
  console.log("\n📌 Super Admin Capabilities:")
  console.log("   - Access all organizations")
  console.log("   - Manually activate employee licenses")
  console.log("   - Enable/disable beta tester mode for organizations")
  console.log("   - Set free license quotas")
  console.log("   - View platform-wide audit logs")
  console.log("\n")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error("❌ Error:", e)
    await prisma.$disconnect()
    process.exit(1)
  })
