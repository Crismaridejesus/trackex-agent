/**
 * Seed script to create or update the owner user
 * Usage: npx tsx prisma/seed-owner.ts
 */

import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/password'

const prisma = new PrismaClient()

async function main() {
  const ownerEmail = process.env.OWNER_EMAIL || 'admin@trackex.com'
  const ownerPassword = process.argv[2]

  if (!ownerPassword) {
    console.error('❌ Error: Password is required')
    console.error('\nUsage: npx tsx prisma/seed-owner.ts <password>')
    console.error('Example: npx tsx prisma/seed-owner.ts MySecurePassword123')
    process.exit(1)
  }

  if (ownerPassword.length < 8) {
    console.warn('⚠️  Warning: Password is less than 8 characters. Consider using a stronger password.')
  }

  console.log('\n🔐 Creating/Updating Owner User...\n')
  console.log(`📧 Email: ${ownerEmail}`)

  // Hash the password
  const hashedPassword = await hashPassword(ownerPassword)
  console.log('✅ Password hashed successfully')

  // Upsert owner user
  // Using type assertions because Prisma types may be cached in TypeScript language server
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    password: hashedPassword,
    role: 'OWNER',
    isActive: true,
    name: 'Owner',
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createData: any = {
    email: ownerEmail,
    password: hashedPassword,
    role: 'OWNER',
    isActive: true,
    name: 'Owner',
  }

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: updateData,
    create: createData,
  }) as {
    id: string
    email: string
    name: string | null
    role: string
    isActive: boolean
    createdAt: Date
    updatedAt: Date
  }

  console.log('\n✅ Owner user created/updated successfully!')
  console.log('\n━'.repeat(80))
  console.log('\n📋 Login Credentials:')
  console.log(`  Email: ${owner.email}`)
  console.log(`  Password: [the password you just entered]`)
  console.log(`  Role: ${owner.role}`)
  console.log(`  ID: ${owner.id}`)
  console.log('\n━'.repeat(80))
  console.log('\n💡 You can now login at /login with these credentials')
  console.log('\n⚠️  Make sure to restart your dev server!\n')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
