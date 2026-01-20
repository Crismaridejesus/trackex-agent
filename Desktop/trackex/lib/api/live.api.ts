/**
 * Live View API
 * 
 * All live view-related API calls
 */

import { api } from './client'

// ============================================
// TYPES
// ============================================

export interface OnlineEmployee {
  employeeId: string
  employeeName: string
  employeeEmail: string
  team: { name: string } | null
  platform: string
  deviceId: string
  deviceName: string
  currentApp: {
    name: string
    window_title?: string
    url?: string
    domain?: string
  } | null
  status: string
  productivityStatus?: string
  lastSeen: string
  licenseTier?: "STARTER" | "TEAM" | null
  canRequestScreenshot?: boolean
}

export interface FinishedSession {
  sessionId: string
  employeeName: string
  employeeEmail: string
  team: { name: string } | null
  device: {
    platform: string
    deviceName: string
  }
  totalWork: number
  clockIn: string
  clockOut: string
  activeTime: number
  idleTime: number
}

export interface LiveViewResponse {
  online: OnlineEmployee[]
  finishedSessions?: FinishedSession[]
  totalActiveTime: number
  totalIdleTime: number
  lastUpdated: string
}

// ============================================
// API FUNCTIONS
// ============================================

export const liveApi = {
  /**
   * Get current online employees
   */
  getOnline: (params?: { teamId?: string }): Promise<LiveViewResponse> => {
    const queryParams: Record<string, string | undefined> = {}
    if (params?.teamId && params.teamId !== 'all') {
      queryParams.teamId = params.teamId
    }
    return api.get('/api/live/online', queryParams)
  },

  /**
   * Create SSE connection for real-time updates
   * Returns an EventSource that emits live view updates
   */
  createStream: (teamId?: string): EventSource => {
    const params = new URLSearchParams()
    if (teamId && teamId !== 'all') {
      params.append('teamId', teamId)
    }
    const queryString = params.toString()
    const url = `/api/live/stream${queryString ? `?${queryString}` : ''}`
    return new EventSource(url)
  },
}

export default liveApi

