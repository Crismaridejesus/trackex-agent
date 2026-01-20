'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { appRulesApi, type AppRule, type CreateAppRuleData, type UpdateAppRuleData } from '@/lib/api'

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to fetch list of app rules
 * App rules are admin-configured and rarely change - uses long cache time
 */
export function useAppRules(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.appRules.list(),
    queryFn: () => appRulesApi.list(),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes - app rules rarely change
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
}

/**
 * Hook to fetch single app rule
 */
export function useAppRule(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.appRules.detail(id),
    queryFn: () => appRulesApi.get(id),
    enabled: options?.enabled !== false && !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to create app rule with optimistic update
 */
export function useCreateAppRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAppRuleData) => appRulesApi.create(data),
    onMutate: async (newRule) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.appRules.list() })

      const previousRules = queryClient.getQueryData(queryKeys.appRules.list())

      // Optimistically add the new rule
      queryClient.setQueryData(queryKeys.appRules.list(), (old: { rules: AppRule[] } | undefined) => {
        if (!old) return { rules: [] }
        const tempRule: AppRule = {
          id: 'temp-id',
          matcherType: newRule.matcherType,
          value: newRule.value,
          category: newRule.category,
          priority: newRule.priority ?? 0,
          isActive: newRule.isActive ?? true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        return { ...old, rules: [...old.rules, tempRule] }
      })

      return { previousRules }
    },
    onError: (err, newRule, context) => {
      if (context?.previousRules) {
        queryClient.setQueryData(queryKeys.appRules.list(), context.previousRules)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appRules.all })
    },
  })
}

/**
 * Hook to update app rule with optimistic update
 */
export function useUpdateAppRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAppRuleData }) =>
      appRulesApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.appRules.list() })

      const previousRules = queryClient.getQueryData(queryKeys.appRules.list())

      // Optimistically update the rule
      queryClient.setQueryData(queryKeys.appRules.list(), (old: { rules: AppRule[] } | undefined) => {
        if (!old) return old
        return {
          ...old,
          rules: old.rules.map((rule) =>
            rule.id === id ? { ...rule, ...data, updatedAt: new Date().toISOString() } : rule
          ),
        }
      })

      return { previousRules }
    },
    onError: (err, { id }, context) => {
      if (context?.previousRules) {
        queryClient.setQueryData(queryKeys.appRules.list(), context.previousRules)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appRules.all })
    },
  })
}

/**
 * Hook to delete app rule with optimistic update
 */
export function useDeleteAppRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => appRulesApi.delete(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.appRules.list() })

      const previousRules = queryClient.getQueryData(queryKeys.appRules.list())

      // Optimistically remove the rule
      queryClient.setQueryData(queryKeys.appRules.list(), (old: { rules: AppRule[] } | undefined) => {
        if (!old) return old
        return {
          ...old,
          rules: old.rules.filter((rule) => rule.id !== deletedId),
        }
      })

      return { previousRules }
    },
    onError: (err, deletedId, context) => {
      if (context?.previousRules) {
        queryClient.setQueryData(queryKeys.appRules.list(), context.previousRules)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appRules.all })
    },
  })
}

/**
 * Hook to toggle app rule active status with optimistic update
 */
export function useToggleAppRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      appRulesApi.toggle(id, isActive),
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.appRules.list() })

      const previousRules = queryClient.getQueryData(queryKeys.appRules.list())

      // Optimistically toggle the rule
      queryClient.setQueryData(queryKeys.appRules.list(), (old: { rules: AppRule[] } | undefined) => {
        if (!old) return old
        return {
          ...old,
          rules: old.rules.map((rule) =>
            rule.id === id ? { ...rule, isActive, updatedAt: new Date().toISOString() } : rule
          ),
        }
      })

      return { previousRules }
    },
    onError: (err, { id }, context) => {
      if (context?.previousRules) {
        queryClient.setQueryData(queryKeys.appRules.list(), context.previousRules)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appRules.all })
    },
  })
}

/**
 * Hook to test an app rule
 */
export function useTestAppRule() {
  return useMutation({
    mutationFn: ({ rule, appName }: { rule: { matcherType: string; value: string }; appName: string }) =>
      appRulesApi.test({ rule: rule as { matcherType: 'exact' | 'contains' | 'regex' | 'prefix' | 'suffix'; value: string }, appName }),
  })
}

