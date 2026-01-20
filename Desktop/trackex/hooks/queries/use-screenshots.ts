'use client'

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { screenshotsApi, type Screenshot, type ScreenshotsListResponse } from '@/lib/api'

const SCREENSHOTS_PER_PAGE = 12

// ============================================
// QUERY HOOKS
// ============================================

interface UseScreenshotsOptions {
  employeeId: string
  startDate?: string
  endDate?: string
  enabled?: boolean
}

/**
 * Hook to fetch screenshots with infinite scroll
 */
export function useInfiniteScreenshots(options: UseScreenshotsOptions) {
  const { employeeId, startDate, endDate, enabled = true } = options

  return useInfiniteQuery({
    queryKey: queryKeys.screenshots.infinite({ employeeId, limit: SCREENSHOTS_PER_PAGE, startDate, endDate }),
    queryFn: ({ pageParam = 0 }) =>
      screenshotsApi.list({
        employeeId,
        offset: pageParam,
        limit: SCREENSHOTS_PER_PAGE,
        startDate,
        endDate,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.pagination.hasMore) return undefined
      return allPages.reduce((total, page) => total + page.screenshots.length, 0)
    },
    initialPageParam: 0,
    enabled: enabled && !!employeeId,
    staleTime: 30 * 1000,
  })
}

/**
 * Hook to fetch screenshots with traditional pagination
 */
export function useScreenshots(options: UseScreenshotsOptions & { offset?: number; limit?: number }) {
  const { employeeId, offset = 0, limit = SCREENSHOTS_PER_PAGE, startDate, endDate, enabled = true } = options

  return useQuery({
    queryKey: queryKeys.screenshots.list({ employeeId, offset, limit, startDate, endDate }),
    queryFn: () => screenshotsApi.list({ employeeId, offset, limit, startDate, endDate }),
    enabled: enabled && !!employeeId,
    staleTime: 30 * 1000,
  })
}

/**
 * Hook to fetch single screenshot
 */
export function useScreenshot(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.screenshots.detail(id),
    queryFn: () => screenshotsApi.get(id),
    enabled: options?.enabled !== false && !!id,
  })
}

/**
 * Hook to poll screenshot job status
 */
export function useScreenshotJob(
  jobId: string | null,
  options?: { enabled?: boolean; maxPolls?: number }
) {
  const maxPolls = options?.maxPolls ?? 30

  return useQuery({
    queryKey: queryKeys.screenshots.job(jobId || ''),
    queryFn: () => screenshotsApi.getJob(jobId!),
    enabled: options?.enabled !== false && !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data
      const fetchCount = query.state.dataUpdateCount

      // Stop polling if completed, failed, or max polls reached
      if (!data || data.status === 'completed' || data.status === 'failed' || fetchCount >= maxPolls) {
        return false
      }
      return 5000 // Poll every 5 seconds
    },
    refetchIntervalInBackground: true,
  })
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to request a manual screenshot
 */
export function useRequestScreenshot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ employeeId, deviceId }: { employeeId: string; deviceId: string }) =>
      screenshotsApi.request({ employeeId, deviceId }),
    onSuccess: (_, { employeeId }) => {
      // Invalidate screenshots for this employee after successful request
      // The actual screenshot will appear after polling completes
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.screenshots.infinite({ employeeId, limit: SCREENSHOTS_PER_PAGE }) })
      }, 10000) // Wait 10 seconds before invalidating
    },
  })
}

// ============================================
// PREFETCH FUNCTIONS
// ============================================

/**
 * Prefetch next page of screenshots
 */
export function usePrefetchNextScreenshots() {
  const queryClient = useQueryClient()

  return (params: { employeeId: string; currentOffset: number; startDate?: string; endDate?: string }) => {
    const nextOffset = params.currentOffset + SCREENSHOTS_PER_PAGE
    queryClient.prefetchQuery({
      queryKey: queryKeys.screenshots.list({
        employeeId: params.employeeId,
        offset: nextOffset,
        limit: SCREENSHOTS_PER_PAGE,
        startDate: params.startDate,
        endDate: params.endDate,
      }),
      queryFn: () => screenshotsApi.list({
        employeeId: params.employeeId,
        offset: nextOffset,
        limit: SCREENSHOTS_PER_PAGE,
        startDate: params.startDate,
        endDate: params.endDate,
      }),
      staleTime: 30 * 1000,
    })
  }
}

