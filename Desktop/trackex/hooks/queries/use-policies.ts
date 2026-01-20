'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { policiesApi, type Policy, type CreatePolicyData, type UpdatePolicyData } from '@/lib/api'

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to fetch list of policies
 * Policies are admin-configured and rarely change - uses long cache time
 */
export function usePolicies(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.policies.list(),
    queryFn: () => policiesApi.list(),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes - policies rarely change
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
}

/**
 * Hook to fetch single policy
 */
export function usePolicy(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.policies.detail(id),
    queryFn: () => policiesApi.get(id),
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
 * Hook to create policy with optimistic update
 */
export function useCreatePolicy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreatePolicyData) => policiesApi.create(data),
    onMutate: async (newPolicy) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.policies.list() })

      const previousPolicies = queryClient.getQueryData(queryKeys.policies.list())

      // Optimistically add the new policy
      queryClient.setQueryData(queryKeys.policies.list(), (old: { policies: Policy[] } | undefined) => {
        if (!old) return { policies: [] }
        const tempPolicy: Policy = {
          id: 'temp-id',
          name: newPolicy.name,
          idleThresholdS: newPolicy.idleThresholdS ?? 120,
          countIdleAsWork: newPolicy.countIdleAsWork ?? false,
          autoScreenshots: newPolicy.autoScreenshots ?? false,
          screenshotInterval: newPolicy.screenshotInterval ?? 10,
          redactTitles: newPolicy.redactTitles ?? false,
          browserDomainOnly: newPolicy.browserDomainOnly ?? true,
          isDefault: newPolicy.isDefault ?? false,
          _count: { employees: 0, teamsDefault: 0 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        return { ...old, policies: [...old.policies, tempPolicy] }
      })

      return { previousPolicies }
    },
    onError: (err, newPolicy, context) => {
      if (context?.previousPolicies) {
        queryClient.setQueryData(queryKeys.policies.list(), context.previousPolicies)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.policies.all })
    },
  })
}

/**
 * Hook to update policy with optimistic update
 */
export function useUpdatePolicy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePolicyData }) =>
      policiesApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.policies.list() })

      const previousPolicies = queryClient.getQueryData(queryKeys.policies.list())

      // Optimistically update the policy
      queryClient.setQueryData(queryKeys.policies.list(), (old: { policies: Policy[] } | undefined) => {
        if (!old) return old
        return {
          ...old,
          policies: old.policies.map((policy) =>
            policy.id === id ? { ...policy, ...data, updatedAt: new Date().toISOString() } : policy
          ),
        }
      })

      return { previousPolicies }
    },
    onError: (err, { id }, context) => {
      if (context?.previousPolicies) {
        queryClient.setQueryData(queryKeys.policies.list(), context.previousPolicies)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.policies.all })
    },
  })
}

/**
 * Hook to delete policy with optimistic update
 */
export function useDeletePolicy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => policiesApi.delete(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.policies.list() })

      const previousPolicies = queryClient.getQueryData(queryKeys.policies.list())

      // Optimistically remove the policy
      queryClient.setQueryData(queryKeys.policies.list(), (old: { policies: Policy[] } | undefined) => {
        if (!old) return old
        return {
          ...old,
          policies: old.policies.filter((policy) => policy.id !== deletedId),
        }
      })

      return { previousPolicies }
    },
    onError: (err, deletedId, context) => {
      if (context?.previousPolicies) {
        queryClient.setQueryData(queryKeys.policies.list(), context.previousPolicies)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.policies.all })
    },
  })
}

/**
 * Hook to set policy as default
 */
export function useSetDefaultPolicy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => policiesApi.setDefault(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.policies.list() })

      const previousPolicies = queryClient.getQueryData(queryKeys.policies.list())

      // Optimistically set the new default
      queryClient.setQueryData(queryKeys.policies.list(), (old: { policies: Policy[] } | undefined) => {
        if (!old) return old
        return {
          ...old,
          policies: old.policies.map((policy) => ({
            ...policy,
            isDefault: policy.id === id,
          })),
        }
      })

      return { previousPolicies }
    },
    onError: (err, id, context) => {
      if (context?.previousPolicies) {
        queryClient.setQueryData(queryKeys.policies.list(), context.previousPolicies)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.policies.all })
    },
  })
}

