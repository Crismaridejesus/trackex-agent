/**
 * Data Migration Script: Fix Session Total Work Values
 *
 * This script recalculates totalWork, activeTime, and idleTime for all work sessions
 * using the centralized time tracking service.
 *
 * Before Fix: Total Work = clockIn to clockOut (includes untracked gaps)
 * After Fix: Total Work = activeTime + idleTime (sum of tracked time)
 *
 * Usage:
 *   npx tsx scripts/fix-session-totals.ts
 *   npx tsx scripts/fix-session-totals.ts --dry-run  # Preview changes without applying
 *   npx tsx scripts/fix-session-totals.ts --limit 100 # Process only first 100 sessions
 */

import { prisma } from '@/lib/db'
import { createTimeTrackingService } from '@/lib/services/time-tracking.service'

interface MigrationStats {
  total: number
  fixed: number
  skipped: number
  errors: number
  totalDiff: number
  maxDiff: number
}

interface SessionFix {
  sessionId: string
  employeeId: string
  before: {
    totalWork: number
    activeTime: number
    idleTime: number
  }
  after: {
    totalWork: number
    activeTime: number
    idleTime: number
  }
  diff: {
    totalWork: number
    activeTime: number
    idleTime: number
  }
}

async function fixSession(
  sessionId: string,
  dryRun: boolean
): Promise<SessionFix | null> {
  try {
    const timeTrackingService = createTimeTrackingService(prisma)

    // Get current stored values
    const session = await prisma.workSession.findUnique({
      where: { id: sessionId },
      select: {
        employeeId: true,
        totalWork: true,
        activeTime: true,
        idleTime: true,
        clockOut: true,
      },
    })

    if (!session) {
      return null
    }

    const before = {
      totalWork: session.totalWork ?? 0,
      activeTime: session.activeTime ?? 0,
      idleTime: session.idleTime ?? 0,
    }

    // Calculate correct values from app usage
    const stats = await timeTrackingService.calculateSessionStatistics(sessionId, {
      currentTime: session.clockOut || new Date(),
      includeOpenEntries: !session.clockOut,
    })

    const after = {
      totalWork: stats.totalWork,
      activeTime: stats.activeTime,
      idleTime: stats.idleTime,
    }

    const diff = {
      totalWork: after.totalWork - before.totalWork,
      activeTime: after.activeTime - before.activeTime,
      idleTime: after.idleTime - before.idleTime,
    }

    // Only update if there's a significant difference (more than 5 seconds)
    const tolerance = 5
    const needsUpdate =
      Math.abs(diff.totalWork) > tolerance ||
      Math.abs(diff.activeTime) > tolerance ||
      Math.abs(diff.idleTime) > tolerance

    if (needsUpdate && !dryRun) {
      await prisma.workSession.update({
        where: { id: sessionId },
        data: {
          totalWork: after.totalWork,
          activeTime: after.activeTime,
          idleTime: after.idleTime,
        },
      })
    }

    return needsUpdate
      ? {
          sessionId,
          employeeId: session.employeeId,
          before,
          after,
          diff,
        }
      : null
  } catch (error) {
    console.error(`Error fixing session ${sessionId}:`, error)
    throw error
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitIndex = args.indexOf('--limit')
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : undefined

  console.log('🔧 Fix Session Total Work Values')
  console.log('='.repeat(50))
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'APPLY FIXES'}`)
  if (limit) console.log(`Limit: Processing first ${limit} sessions`)
  console.log()

  // Get all work sessions
  const sessions = await prisma.workSession.findMany({
    where: { clockOut: { not: null } }, // Only closed sessions
    select: { id: true },
    orderBy: { clockIn: 'desc' },
    ...(limit && { take: limit }),
  })

  console.log(`Found ${sessions.length} closed sessions to process`)
  console.log()

  const stats: MigrationStats = {
    total: sessions.length,
    fixed: 0,
    skipped: 0,
    errors: 0,
    totalDiff: 0,
    maxDiff: 0,
  }

  const fixes: SessionFix[] = []

  // Process sessions in batches
  const batchSize = 10
  for (let i = 0; i < sessions.length; i += batchSize) {
    const batch = sessions.slice(i, i + batchSize)
    const batchPromises = batch.map(async (session) => {
      try {
        const fix = await fixSession(session.id, dryRun)
        if (fix) {
          stats.fixed++
          stats.totalDiff += Math.abs(fix.diff.totalWork)
          stats.maxDiff = Math.max(stats.maxDiff, Math.abs(fix.diff.totalWork))
          fixes.push(fix)
          return fix
        } else {
          stats.skipped++
          return null
        }
      } catch (error) {
        stats.errors++
        console.error(`❌ Error processing session ${session.id}:`, error)
        return null
      }
    })

    await Promise.all(batchPromises)

    // Progress indicator
    const processed = Math.min(i + batchSize, sessions.length)
    const percent = ((processed / sessions.length) * 100).toFixed(1)
    process.stdout.write(`\rProgress: ${processed}/${sessions.length} (${percent}%)`)
  }

  console.log('\n')
  console.log('📊 Migration Results')
  console.log('='.repeat(50))
  console.log(`Total sessions: ${stats.total}`)
  console.log(`Fixed: ${stats.fixed}`)
  console.log(`Skipped (no change needed): ${stats.skipped}`)
  console.log(`Errors: ${stats.errors}`)
  console.log()

  if (stats.fixed > 0) {
    console.log('📈 Time Difference Statistics')
    console.log('='.repeat(50))
    console.log(`Total difference: ${stats.totalDiff}s`)
    console.log(`Average difference: ${(stats.totalDiff / stats.fixed).toFixed(2)}s`)
    console.log(`Max difference: ${stats.maxDiff}s`)
    console.log()

    // Show top 10 sessions with largest differences
    const topFixes = fixes
      .sort((a, b) => Math.abs(b.diff.totalWork) - Math.abs(a.diff.totalWork))
      .slice(0, 10)

    console.log('🔍 Top 10 Sessions with Largest Differences')
    console.log('='.repeat(50))
    topFixes.forEach((fix, index) => {
      console.log(`${index + 1}. Session: ${fix.sessionId.substring(0, 8)}...`)
      console.log(`   Employee: ${fix.employeeId.substring(0, 8)}...`)
      console.log(`   Before: ${fix.before.totalWork}s (A:${fix.before.activeTime}s I:${fix.before.idleTime}s)`)
      console.log(`   After:  ${fix.after.totalWork}s (A:${fix.after.activeTime}s I:${fix.after.idleTime}s)`)
      console.log(`   Diff:   ${fix.diff.totalWork > 0 ? '+' : ''}${fix.diff.totalWork}s`)
      console.log()
    })
  }

  if (dryRun) {
    console.log('💡 Tip: Run without --dry-run to apply these fixes')
  } else {
    console.log('✅ Migration complete!')
  }

  await prisma.$disconnect()
}

main()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
