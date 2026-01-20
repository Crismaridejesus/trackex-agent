'use client'

import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { auditApi, type AuditLogsListResponse } from '@/lib/api'

const AUDIT_LOGS_PER_PAGE = 50

// ============================================
// QUERY HOOKS
// ============================================

interface UseAuditLogsOptions {
  action?: string
  enabled?: boolean
}

/**
 * Hook to fetch audit logs with infinite scroll
 */
export function useInfiniteAuditLogs(options: UseAuditLogsOptions = {}) {
  const { action, enabled = true } = options

  return useInfiniteQuery({
    queryKey: queryKeys.auditLogs.infinite({ action, limit: AUDIT_LOGS_PER_PAGE }),
    queryFn: ({ pageParam = 0 }) =>
      auditApi.list({
        action,
        offset: pageParam,
        limit: AUDIT_LOGS_PER_PAGE,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.pagination.hasMore) return undefined
      return allPages.reduce((total, page) => total + page.logs.length, 0)
    },
    initialPageParam: 0,
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to fetch audit logs with traditional pagination
 */
export function useAuditLogs(options: UseAuditLogsOptions & { offset?: number; limit?: number } = {}) {
  const { action, offset = 0, limit = AUDIT_LOGS_PER_PAGE, enabled = true } = options

  return useQuery({
    queryKey: queryKeys.auditLogs.list({ action, offset, limit }),
    queryFn: () => auditApi.list({ action, offset, limit }),
    enabled,
    staleTime: 30 * 1000,
  })
}

