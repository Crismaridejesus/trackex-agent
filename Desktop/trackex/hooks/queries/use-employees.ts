'use client'

import { useQuery, useMutation, useQueryClient, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { employeesApi, type Employee, type CreateEmployeeData, type UpdateEmployeeData } from '@/lib/api'

// ============================================
// QUERY HOOKS
// ============================================

interface UseEmployeesOptions {
  teamId?: string
  startDate?: string
  endDate?: string
  enabled?: boolean
}

/**
 * Hook to fetch list of employees
 * Uses stale-while-revalidate pattern: shows cached data immediately while refetching in background
 */
export function useEmployees(options: UseEmployeesOptions = {}) {
  const { teamId, startDate, endDate, enabled = true } = options

  return useQuery({
    queryKey: queryKeys.employees.list({ teamId, startDate, endDate }),
    queryFn: () => employeesApi.list({ teamId, startDate, endDate }),
    enabled: enabled && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes - show cached data, refetch in background
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes for instant navigation
    placeholderData: keepPreviousData, // Show cached data immediately while refetching
    refetchOnWindowFocus: false, // Disable to prevent loading states on window focus
  })
}

/**
 * Hook to fetch single employee
 */
export function useEmployee(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.employees.detail(id),
    queryFn: () => employeesApi.get(id),
    enabled: options?.enabled !== false && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes - show cached data, refetch in background
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    placeholderData: keepPreviousData,
  })
}

/**
 * Hook to fetch employee analytics
 * Uses stale-while-revalidate pattern for smooth navigation
 */
export function useEmployeeAnalytics(
  id: string,
  params: { startDate?: string; endDate?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.employees.analytics(id, params),
    queryFn: () => employeesApi.getAnalytics(id, {
      startDate: params.startDate!,
      endDate: params.endDate!,
    }),
    enabled: options?.enabled !== false && !!id && !!params.startDate && !!params.endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes - show cached data, refetch in background
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false, // Disable to prevent loading states
  })
}

/**
 * Hook to fetch employee app usage
 */
export function useEmployeeAppUsage(
  id: string,
  params: { startDate: string; endDate: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.employees.appUsage(id, params),
    queryFn: () => employeesApi.getAppUsage(id, params),
    enabled: options?.enabled !== false && !!id && !!params.startDate && !!params.endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes - show cached data, refetch in background
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    placeholderData: keepPreviousData,
  })
}

/**
 * Hook to fetch employee devices
 */
export function useEmployeeDevices(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.employees.devices(id),
    queryFn: () => employeesApi.getDevices(id),
    enabled: options?.enabled !== false && !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes - devices rarely change
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    placeholderData: keepPreviousData,
  })
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to create employee with optimistic update
 */
export function useCreateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateEmployeeData) => employeesApi.create(data),
    onSuccess: () => {
      // Invalidate all employee queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all })
    },
  })
}

/**
 * Hook to update employee with optimistic update
 */
export function useUpdateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeData }) =>
      employeesApi.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.employees.detail(id) })

      // Snapshot the previous value
      const previousEmployee = queryClient.getQueryData(queryKeys.employees.detail(id))

      // Optimistically update the employee
      if (previousEmployee) {
        queryClient.setQueryData(queryKeys.employees.detail(id), (old: { employee: Employee } | undefined) => {
          if (!old) return old
          return {
            ...old,
            employee: { ...old.employee, ...data },
          }
        })
      }

      return { previousEmployee }
    },
    onError: (err, { id }, context) => {
      // Rollback on error
      if (context?.previousEmployee) {
        queryClient.setQueryData(queryKeys.employees.detail(id), context.previousEmployee)
      }
    },
    onSettled: (_, __, { id }) => {
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all })
    },
  })
}

/**
 * Hook to delete employee
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => employeesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
    },
  })
}

/**
 * Hook to update employee screenshot settings
 */
export function useUpdateEmployeeScreenshots() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { autoScreenshots: boolean; screenshotInterval: number } }) =>
      employeesApi.updateScreenshotSettings(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.employees.detail(id) })

      const previousEmployee = queryClient.getQueryData(queryKeys.employees.detail(id))

      if (previousEmployee) {
        queryClient.setQueryData(queryKeys.employees.detail(id), (old: { employee: Employee } | undefined) => {
          if (!old) return old
          return {
            ...old,
            employee: { ...old.employee, ...data },
          }
        })
      }

      return { previousEmployee }
    },
    onError: (err, { id }, context) => {
      if (context?.previousEmployee) {
        queryClient.setQueryData(queryKeys.employees.detail(id), context.previousEmployee)
      }
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(id) })
    },
  })
}

// ============================================
// PREFETCH FUNCTIONS
// ============================================

/**
 * Prefetch employee data for hover preview
 */
export function usePrefetchEmployee() {
  const queryClient = useQueryClient()

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.employees.detail(id),
      queryFn: () => employeesApi.get(id),
      staleTime: 5 * 60 * 1000, // Match useEmployee staleTime
    })
  }
}

