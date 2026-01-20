'use client'

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { queryKeys, type AnalyticsFilters } from '@/lib/query-keys'
import { analyticsApi } from '@/lib/api'

// ============================================
// QUERY HOOKS
// ============================================

interface UseHomeAnalyticsOptions {
  startDate?: string
  endDate?: string
  teamIds?: string[]
  enabled?: boolean
}

/**
 * Hook to fetch home dashboard analytics
 * Uses stale-while-revalidate pattern: shows cached data immediately while refetching in background
 */
export function useHomeAnalytics(options: UseHomeAnalyticsOptions = {}) {
  const { startDate, endDate, teamIds, enabled = true } = options

  const filters: AnalyticsFilters = { startDate, endDate, teamIds }

  return useQuery({
    queryKey: queryKeys.analytics.home(filters),
    queryFn: () => analyticsApi.getHome({
      startDate: startDate!,
      endDate: endDate!,
      teamIds,
    }),
    enabled: enabled && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes - show cached data, refetch in background
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes for instant navigation
    placeholderData: keepPreviousData, // Show cached data immediately while refetching
    refetchOnWindowFocus: false, // Disable to prevent loading states on window focus
  })
}

interface UseEmployeeAnalyticsOptions {
  employeeId: string
  startDate?: string
  endDate?: string
  enabled?: boolean
}

/**
 * Hook to fetch employee-specific analytics
 * Uses stale-while-revalidate pattern for smooth navigation
 */
export function useEmployeeAnalytics(options: UseEmployeeAnalyticsOptions) {
  const { employeeId, startDate, endDate, enabled = true } = options

  return useQuery({
    queryKey: queryKeys.analytics.employee(employeeId, { startDate, endDate }),
    queryFn: () => analyticsApi.getEmployee(employeeId, {
      startDate: startDate!,
      endDate: endDate!,
    }),
    enabled: enabled && !!employeeId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes - show cached data, refetch in background
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false, // Disable to prevent loading states
  })
}

// ============================================
// PREFETCH FUNCTIONS
// ============================================

/**
 * Prefetch analytics for date range (useful for date picker)
 */
export function usePrefetchAnalytics() {
  const queryClient = useQueryClient()

  return (params: { startDate: string; endDate: string; teamIds?: string[] }) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.analytics.home({ startDate: params.startDate, endDate: params.endDate, teamIds: params.teamIds }),
      queryFn: () => analyticsApi.getHome(params),
      staleTime: 5 * 60 * 1000, // Match useHomeAnalytics staleTime
    })
  }
}

/**
 * Prefetch employee analytics on hover
 */
export function usePrefetchEmployeeAnalytics() {
  const queryClient = useQueryClient()

  return (employeeId: string, params: { startDate: string; endDate: string }) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.analytics.employee(employeeId, { startDate: params.startDate, endDate: params.endDate }),
      queryFn: () => analyticsApi.getEmployee(employeeId, params),
      staleTime: 5 * 60 * 1000, // Match useEmployeeAnalytics staleTime
    })
  }
}

