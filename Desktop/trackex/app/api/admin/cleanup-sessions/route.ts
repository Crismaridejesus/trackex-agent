import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth/rbac'
import {
  cleanupOrphanedSessions,
  cleanupVeryOldSessions,
} from '@/lib/services/session-cleanup.service'

export const dynamic = 'force-dynamic'

/**
 * Clean up orphaned work sessions
 * Can be called manually or by a cron job
 */
export async function POST(req: NextRequest) {
  try {
    // Require owner/admin authentication
    await requireOwner()

    console.log('[Admin] Starting session cleanup')

    // Clean up orphaned sessions (device inactive > 4 hours)
    const orphanedResult = await cleanupOrphanedSessions()

    // Clean up very old sessions (> 24 hours)
    const veryOldResult = await cleanupVeryOldSessions()

    const totalClosed = orphanedResult.closed + veryOldResult.closed

    console.log(`[Admin] Session cleanup completed: ${totalClosed} sessions closed`)

    return NextResponse.json({
      success: true,
      orphanedSessions: orphanedResult.closed,
      veryOldSessions: veryOldResult.closed,
      totalClosed,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Admin] Session cleanup error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message.includes('Unauthorized') || message.includes('authentication') ? 401 : 500
    return NextResponse.json(
      { error: 'Failed to cleanup sessions', details: message },
      { status }
    )
  }
}
