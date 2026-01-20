import { NextResponse } from 'next/server'
import { getConnectionCount } from '@/lib/agent-update-stream'

export const dynamic = 'force-dynamic'

/**
 * Debug endpoint to check SSE connection status
 * GET /api/desktop/update-notifications/status
 * 
 * Returns the current number of connected agents for debugging purposes.
 */
export async function GET() {
  const count = getConnectionCount();
  
  console.log(`[Agent Update Stream] Status check: ${count} connected agents`);
  
  return NextResponse.json({
    connectedAgents: count,
    timestamp: new Date().toISOString(),
    message: count > 0 
      ? `${count} agent(s) connected and ready to receive updates`
      : 'No agents currently connected'
  })
}
