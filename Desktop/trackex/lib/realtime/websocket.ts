// WebSocket server setup for real-time communication
// Note: This is a simplified implementation for Phase 2

import { Server as SocketIOServer } from 'socket.io'
import { getRealtimeStore } from './store'

let io: SocketIOServer | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function initWebSocketServer(server: any) {
  if (io) return io

  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', async (socket) => {
    console.log('Client connected:', socket.id)

    const realtimeStore = await getRealtimeStore()

    // Handle device heartbeats
    socket.on('device-heartbeat', async (data) => {
      const { deviceId, employeeId, status, currentApp } = data
      
      await realtimeStore.setPresence(deviceId, {
        employeeId,
        deviceId,
        status,
        currentApp,
        lastSeen: new Date(),
      })

      // Broadcast to dashboard clients
      socket.broadcast.emit('presence-update', {
        deviceId,
        employeeId,
        status,
        currentApp,
        timestamp: new Date().toISOString(),
      })
    })

    // Handle dashboard subscriptions
    socket.on('subscribe-presence', async () => {
      const allPresence = await realtimeStore.getAllPresence()
      socket.emit('presence-snapshot', allPresence)
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  return io
}

export function getWebSocketServer(): SocketIOServer | null {
  return io
}

// Broadcast events to all connected clients
export async function broadcastPresenceUpdate(deviceId: string) {
  if (!io) return
  const realtimeStore = await getRealtimeStore()
  const presence = await realtimeStore.getPresence(deviceId)
  if (presence) {
    io.emit('presence-update', {
      ...presence,
      timestamp: new Date().toISOString(),
    })
  }
}

export async function broadcastSessionEvent(event: {
  type: 'session-start' | 'session-end'
  employeeId: string
  deviceId: string
  timestamp: string
}) {
  if (!io) return

  io.emit('session-event', event)
}

// Types for WebSocket events
export interface DeviceHeartbeat {
  deviceId: string
  employeeId: string
  status: 'online' | 'idle' | 'offline'
  currentApp?: {
    name: string
    windowTitle?: string
    domain?: string
  }
}

export interface PresenceUpdate extends DeviceHeartbeat {
  timestamp: string
}

export interface SessionEvent {
  type: 'session-start' | 'session-end'
  employeeId: string
  deviceId: string
  timestamp: string
}
