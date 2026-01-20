'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { 
  agentVersionsApi, 
  type AgentVersion, 
  type CreateAgentVersionData, 
  type UpdateAgentVersionData 
} from '@/lib/api/agent-versions.api'

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to fetch list of agent versions
 * Agent versions are admin-configured and rarely change - uses long cache time
 */
export function useAgentVersions(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.agentVersions.list(),
    queryFn: () => agentVersionsApi.list(),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes - versions rarely change
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
}

/**
 * Hook to fetch single agent version
 */
export function useAgentVersion(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.agentVersions.detail(id),
    queryFn: () => agentVersionsApi.get(id),
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
 * Hook to create agent version
 */
export function useCreateAgentVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAgentVersionData) => agentVersionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentVersions.all })
    },
  })
}

/**
 * Hook to update agent version
 */
export function useUpdateAgentVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAgentVersionData }) =>
      agentVersionsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentVersions.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.agentVersions.detail(variables.id) })
    },
  })
}

/**
 * Hook to delete agent version
 */
export function useDeleteAgentVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => agentVersionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentVersions.all })
    },
  })
}

/**
 * Hook to toggle isActive status
 */
export function useToggleAgentVersionActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      agentVersionsApi.toggleActive(id, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentVersions.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.agentVersions.detail(variables.id) })
    },
  })
}
