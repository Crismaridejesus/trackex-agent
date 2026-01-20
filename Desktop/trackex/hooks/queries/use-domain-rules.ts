'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { domainRulesApi, type DomainRule, type CreateDomainRuleData, type UpdateDomainRuleData } from '@/lib/api'

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to fetch list of domain rules
 * Domain rules are admin-configured and rarely change - uses long cache time
 */
export function useDomainRules(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.domainRules.list(),
    queryFn: () => domainRulesApi.list(),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes - domain rules rarely change
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
}

/**
 * Hook to fetch single domain rule
 */
export function useDomainRule(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.domainRules.detail(id),
    queryFn: () => domainRulesApi.get(id),
    enabled: options?.enabled !== false && !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
}

// ============================================
// MUTATION HOOKS
// ============================================

interface MutationCallbacks<TData, TError, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: TError, variables: TVariables) => void
}

/**
 * Hook to create domain rule with optimistic update
 */
export function useCreateDomainRule(callbacks?: MutationCallbacks<{ rule: DomainRule }, Error, CreateDomainRuleData>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateDomainRuleData) => domainRulesApi.create(data),
    onMutate: async (newRule) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.domainRules.list() })

      const previousRules = queryClient.getQueryData(queryKeys.domainRules.list())

      // Optimistically add the new rule
      queryClient.setQueryData(queryKeys.domainRules.list(), (old: { rules: DomainRule[] } | undefined) => {
        if (!old) return { rules: [] }
        const tempRule: DomainRule = {
          id: 'temp-id',
          domain: newRule.domain,
          matcherType: newRule.matcherType,
          category: newRule.category,
          description: newRule.description ?? null,
          priority: newRule.priority ?? 0,
          isActive: newRule.isActive ?? true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        return { ...old, rules: [...old.rules, tempRule] }
      })

      return { previousRules }
    },
    onSuccess: (data, variables) => {
      callbacks?.onSuccess?.(data, variables)
    },
    onError: (err, newRule, context) => {
      if (context?.previousRules) {
        queryClient.setQueryData(queryKeys.domainRules.list(), context.previousRules)
      }
      callbacks?.onError?.(err, newRule)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.domainRules.all })
    },
  })
}

/**
 * Hook to update domain rule with optimistic update
 */
export function useUpdateDomainRule(callbacks?: MutationCallbacks<{ rule: DomainRule }, Error, { id: string; data: UpdateDomainRuleData }>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDomainRuleData }) =>
      domainRulesApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.domainRules.list() })

      const previousRules = queryClient.getQueryData(queryKeys.domainRules.list())

      // Optimistically update the rule
      queryClient.setQueryData(queryKeys.domainRules.list(), (old: { rules: DomainRule[] } | undefined) => {
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
    onSuccess: (data, variables) => {
      callbacks?.onSuccess?.(data, variables)
    },
    onError: (err, variables, context) => {
      if (context?.previousRules) {
        queryClient.setQueryData(queryKeys.domainRules.list(), context.previousRules)
      }
      callbacks?.onError?.(err, variables)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.domainRules.all })
    },
  })
}

/**
 * Hook to delete domain rule with optimistic update
 */
export function useDeleteDomainRule(callbacks?: MutationCallbacks<{ success: boolean }, Error, string>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => domainRulesApi.delete(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.domainRules.list() })

      const previousRules = queryClient.getQueryData(queryKeys.domainRules.list())

      // Optimistically remove the rule
      queryClient.setQueryData(queryKeys.domainRules.list(), (old: { rules: DomainRule[] } | undefined) => {
        if (!old) return old
        return {
          ...old,
          rules: old.rules.filter((rule) => rule.id !== deletedId),
        }
      })

      return { previousRules }
    },
    onSuccess: (data, variables) => {
      callbacks?.onSuccess?.(data, variables)
    },
    onError: (err, deletedId, context) => {
      if (context?.previousRules) {
        queryClient.setQueryData(queryKeys.domainRules.list(), context.previousRules)
      }
      callbacks?.onError?.(err, deletedId)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.domainRules.all })
    },
  })
}

/**
 * Hook to toggle domain rule active status with optimistic update
 */
export function useToggleDomainRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      domainRulesApi.toggle(id, isActive),
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.domainRules.list() })

      const previousRules = queryClient.getQueryData(queryKeys.domainRules.list())

      // Optimistically toggle the rule
      queryClient.setQueryData(queryKeys.domainRules.list(), (old: { rules: DomainRule[] } | undefined) => {
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
        queryClient.setQueryData(queryKeys.domainRules.list(), context.previousRules)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.domainRules.all })
    },
  })
}

