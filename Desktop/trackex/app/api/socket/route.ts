import { NextRequest, NextResponse } from 'next/server'

import { getRealtimeStore } from '@/lib/realtime/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  // This endpoint is used to initialize the WebSocket server
  // In a production environment, you might want to use a separate WebSocket server
  
  return NextResponse.json({ 
    message: 'WebSocket endpoint - use socket.io client to connect',
    endpoint: '/socket.io/',
    status: 'ready',
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, deviceId, employeeId, status, currentApp } = body
    const realtimeStore = await getRealtimeStore()
    
    if (action === 'heartbeat' && deviceId && employeeId) {
      // Update presence in store
      
      await realtimeStore.setPresence(deviceId, {
        employeeId,
        deviceId,
        status: status || 'online',
        currentApp,
        lastSeen: new Date(),
      })

      return NextResponse.json({ 
        success: true,
        timestamp: new Date().toISOString(),
      })
    }

    if (action === 'get-presence') {
      const allPresence = await realtimeStore.getAllPresence()
      return NextResponse.json({ presence: allPresence })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Socket API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
