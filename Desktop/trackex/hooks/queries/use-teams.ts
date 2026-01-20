'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { teamsApi, type Team, type CreateTeamData, type UpdateTeamData } from '@/lib/api'

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to fetch list of teams
 * Teams rarely change - uses long cache time with stale-while-revalidate
 */
export function useTeams(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.teams.list(),
    queryFn: () => teamsApi.list(),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes - teams rarely change
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    placeholderData: keepPreviousData,
  })
}

/**
 * Hook to fetch single team
 */
export function useTeam(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.teams.detail(id),
    queryFn: () => teamsApi.get(id),
    enabled: options?.enabled !== false && !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
}

/**
 * Hook to fetch team members
 */
export function useTeamMembers(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.teams.members(id),
    queryFn: () => teamsApi.getMembers(id),
    enabled: options?.enabled !== false && !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to create team with optimistic update
 */
export function useCreateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTeamData) => teamsApi.create(data),
    onMutate: async (newTeam) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.teams.list() })

      // Snapshot the previous value
      const previousTeams = queryClient.getQueryData(queryKeys.teams.list())

      // Optimistically add the new team
      queryClient.setQueryData(queryKeys.teams.list(), (old: { teams: Team[] } | undefined) => {
        if (!old) return { teams: [{ id: 'temp-id', name: newTeam.name, _count: { employees: 0 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] }
        return {
          ...old,
          teams: [
            ...old.teams,
            { id: 'temp-id', name: newTeam.name, _count: { employees: 0 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          ],
        }
      })

      return { previousTeams }
    },
    onError: (err, newTeam, context) => {
      // Rollback on error
      if (context?.previousTeams) {
        queryClient.setQueryData(queryKeys.teams.list(), context.previousTeams)
      }
    },
    onSettled: () => {
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
    },
  })
}

/**
 * Hook to update team with optimistic update
 */
export function useUpdateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTeamData }) =>
      teamsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.teams.list() })
      await queryClient.cancelQueries({ queryKey: queryKeys.teams.detail(id) })

      const previousTeams = queryClient.getQueryData(queryKeys.teams.list())

      // Optimistically update the team in the list
      queryClient.setQueryData(queryKeys.teams.list(), (old: { teams: Team[] } | undefined) => {
        if (!old) return old
        return {
          ...old,
          teams: old.teams.map((team) =>
            team.id === id ? { ...team, ...data } : team
          ),
        }
      })

      return { previousTeams }
    },
    onError: (err, { id }, context) => {
      if (context?.previousTeams) {
        queryClient.setQueryData(queryKeys.teams.list(), context.previousTeams)
      }
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
    },
  })
}

/**
 * Hook to delete team with optimistic update
 */
export function useDeleteTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => teamsApi.delete(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.teams.list() })

      const previousTeams = queryClient.getQueryData(queryKeys.teams.list())

      // Optimistically remove the team
      queryClient.setQueryData(queryKeys.teams.list(), (old: { teams: Team[] } | undefined) => {
        if (!old) return old
        return {
          ...old,
          teams: old.teams.filter((team) => team.id !== deletedId),
        }
      })

      return { previousTeams }
    },
    onError: (err, deletedId, context) => {
      if (context?.previousTeams) {
        queryClient.setQueryData(queryKeys.teams.list(), context.previousTeams)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all })
    },
  })
}

/**
 * Hook to add member to team
 */
export function useAddTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ teamId, employeeId }: { teamId: string; employeeId: string }) =>
      teamsApi.addMember(teamId, { employeeId }),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.detail(teamId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.members(teamId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all })
    },
  })
}

/**
 * Hook to remove member from team
 */
export function useRemoveTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ teamId, employeeId }: { teamId: string; employeeId: string }) =>
      teamsApi.removeMember(teamId, employeeId),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.detail(teamId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.members(teamId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all })
    },
  })
}

