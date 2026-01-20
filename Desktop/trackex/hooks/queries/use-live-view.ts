'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef, useCallback } from 'react'
import { queryKeys } from '@/lib/query-keys'
import { liveApi, screenshotsApi, type LiveViewResponse } from '@/lib/api'

// ============================================
// QUERY HOOKS
// ============================================

interface UseLiveViewOptions {
  teamId?: string
  enabled?: boolean
}

/**
 * Hook to fetch live view data
 * Can be combined with SSE for real-time updates
 */
export function useLiveView(options: UseLiveViewOptions = {}) {
  const { teamId, enabled = true } = options

  return useQuery({
    queryKey: queryKeys.live.online({ teamId }),
    queryFn: () => liveApi.getOnline({ teamId }),
    enabled,
    staleTime: 8 * 1000, // 8 seconds of stale data
    // Note: refetchInterval is removed - use SSE integration instead
  })
}

/**
 * Hook for SSE-integrated live view with automatic query invalidation
 * 
 * This hook:
 * 1. Sets up an SSE connection for real-time updates
 * 2. Updates React Query cache when SSE messages arrive
 * 3. Provides connection status
 * 4. Falls back to polling if SSE fails
 */
export function useLiveViewWithSSE(options: UseLiveViewOptions = {}) {
  const { teamId = 'all', enabled = true } = options
  const queryClient = useQueryClient()
  const [isStreaming, setIsStreaming] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  // Base query - will be updated via SSE
  const query = useQuery({
    queryKey: queryKeys.live.online({ teamId }),
    queryFn: () => liveApi.getOnline({ teamId }),
    enabled,
    staleTime: 8 * 1000,
    // Fallback polling when SSE is not connected
    refetchInterval: (queryState) => {
      if (isStreaming) return 30 * 1000 // 30s backup poll when streaming
      if (queryState.state.errorUpdateCount > 5) return false // Stop on repeated errors
      return queryState.state.error ? 30 * 1000 : 5 * 1000 // 30s on error, 5s normally
    },
    refetchOnWindowFocus: true,
  })

  // Setup SSE connection
  const connectSSE = useCallback(() => {
    if (!enabled) return

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = liveApi.createStream(teamId)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsStreaming(true)
      setConnectionError(null)
      reconnectAttemptsRef.current = 0
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'update') {
          // Update React Query cache with SSE data
          queryClient.setQueryData(
            queryKeys.live.online({ teamId }),
            (old: LiveViewResponse | undefined) => ({
              online: data.online || old?.online || [],
              finishedSessions: data.finishedSessions || old?.finishedSessions,
              totalActiveTime: data.totalActiveTime ?? old?.totalActiveTime ?? 0,
              totalIdleTime: data.totalIdleTime ?? old?.totalIdleTime ?? 0,
              lastUpdated: data.lastUpdated || new Date().toISOString(),
            })
          )
        } else if (data.type === 'connected') {
          setIsStreaming(true)
        } else if (data.type === 'error') {
          console.error('[LiveView SSE] Server error:', data.message)
        }
      } catch (error) {
        console.error('[LiveView SSE] Failed to parse message:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('[LiveView SSE] Connection error:', error)
      setIsStreaming(false)
      eventSource.close()

      // Attempt reconnection with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
        reconnectAttemptsRef.current++
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectSSE()
        }, delay)
      } else {
        setConnectionError('Lost connection to live updates. Please refresh the page.')
      }
    }
  }, [enabled, teamId, queryClient])

  // Manage SSE lifecycle
  useEffect(() => {
    if (enabled) {
      connectSSE()
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [enabled, connectSSE])

  // Reconnect when teamId changes
  useEffect(() => {
    if (enabled && eventSourceRef.current) {
      connectSSE()
    }
  }, [teamId, enabled, connectSSE])

  return {
    ...query,
    isStreaming,
    connectionError,
    reconnect: connectSSE,
  }
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to request a screenshot from live view
 */
export function useRequestLiveScreenshot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ employeeId, deviceId }: { employeeId: string; deviceId: string }) =>
      screenshotsApi.request({ employeeId, deviceId }),
    onSuccess: () => {
      // Screenshot will be ready after polling - no immediate cache update needed
    },
  })
}

