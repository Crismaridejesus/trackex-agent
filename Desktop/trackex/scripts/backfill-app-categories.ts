/**
 * Backfill Script: Re-categorize existing AppUsage records
 * 
 * This script re-processes all AppUsage entries using the updated categorization
 * logic that includes built-in default rules for common productivity apps.
 * 
 * Run with: npx tsx scripts/backfill-app-categories.ts
 */

import { PrismaClient } from '@prisma/client'
import { categorizeApp, AppInfo, AppCategory } from '../lib/utils/categories'

const prisma = new PrismaClient()

interface AppUsageRecord {
  id: string
  appName: string
  appId: string | null
  windowTitle: string | null
  category: string
}

async function backfillAppCategories() {
  console.log('🚀 Starting AppUsage category backfill...\n')

  // Get all app rules from database
  const rules = await prisma.appRule.findMany({
    where: { isActive: true },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  })

  console.log(`📋 Found ${rules.length} active app rules in database`)
  console.log('📦 Using built-in default rules as fallback\n')

  // Fetch all AppUsage records
  const totalCount = await prisma.appUsage.count()
  console.log(`📊 Total AppUsage records to process: ${totalCount}\n`)

  // Process in batches to avoid memory issues
  const BATCH_SIZE = 1000
  let processedCount = 0
  let updatedCount = 0
  const categoryChanges: Record<string, { from: string; to: string; count: number }[]> = {}

  // Batch processing with cursor-based pagination
  let cursor: string | undefined = undefined

  while (true) {
    const batch: AppUsageRecord[] = await prisma.appUsage.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        appName: true,
        appId: true,
        windowTitle: true,
        category: true,
      },
      orderBy: { id: 'asc' },
    })

    if (batch.length === 0) break

    const updates: { id: string; newCategory: AppCategory }[] = []

    for (const record of batch) {
      const appInfo: AppInfo = {
        name: record.appName,
        windowTitle: record.windowTitle || undefined,
        process: record.appId || undefined,
      }

      const newCategory = categorizeApp(appInfo, rules)

      if (newCategory !== record.category) {
        updates.push({ id: record.id, newCategory })

        // Track changes for reporting
        const key = record.appName
        if (!categoryChanges[key]) {
          categoryChanges[key] = []
        }
        const existing = categoryChanges[key].find(
          c => c.from === record.category && c.to === newCategory
        )
        if (existing) {
          existing.count++
        } else {
          categoryChanges[key].push({ from: record.category, to: newCategory, count: 1 })
        }
      }
    }

    // Batch update
    if (updates.length > 0) {
      await Promise.all(
        updates.map(u =>
          prisma.appUsage.update({
            where: { id: u.id },
            data: { category: u.newCategory },
          })
        )
      )
      updatedCount += updates.length
    }

    processedCount += batch.length
    cursor = batch[batch.length - 1].id

    // Progress update
    const progress = Math.round((processedCount / totalCount) * 100)
    process.stdout.write(`\r⏳ Progress: ${progress}% (${processedCount}/${totalCount}) - Updated: ${updatedCount}`)
  }

  console.log('\n\n✅ Backfill complete!\n')

  // Print summary
  console.log('📈 Category Change Summary:')
  console.log('─'.repeat(60))

  const sortedApps = Object.entries(categoryChanges)
    .sort((a, b) => {
      const totalA = a[1].reduce((sum, c) => sum + c.count, 0)
      const totalB = b[1].reduce((sum, c) => sum + c.count, 0)
      return totalB - totalA
    })
    .slice(0, 20) // Top 20 most impacted apps

  for (const [appName, changes] of sortedApps) {
    console.log(`\n📱 ${appName}:`)
    for (const change of changes) {
      console.log(`   ${change.from} → ${change.to}: ${change.count} records`)
    }
  }

  console.log('\n─'.repeat(60))
  console.log(`📊 Total records processed: ${processedCount}`)
  console.log(`🔄 Total records updated: ${updatedCount}`)
  console.log(`⏭️  Records unchanged: ${processedCount - updatedCount}`)
}

async function main() {
  try {
    await backfillAppCategories()
  } catch (error) {
    console.error('❌ Backfill failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
