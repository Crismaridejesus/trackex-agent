/**
 * Teams API
 * 
 * All team-related API calls
 */

import { api } from './client'

// ============================================
// TYPES
// ============================================

export interface Team {
  id: string
  name: string
  _count?: {
    employees: number
  }
  createdAt: string
  updatedAt: string
}

export interface TeamMember {
  id: string
  name: string
  email: string
  isActive: boolean
}

export interface TeamsListResponse {
  teams: Team[]
}

export interface TeamDetailResponse {
  team: Team & {
    defaultPolicy?: { id: string; name: string } | null
  }
}

export interface TeamMembersResponse {
  employees: TeamMember[]
}

export interface CreateTeamData {
  name: string
}

export interface UpdateTeamData {
  name?: string
  defaultPolicyId?: string | null
}

export interface AddMemberData {
  employeeId: string
}

// ============================================
// API FUNCTIONS
// ============================================

export const teamsApi = {
  /**
   * Get all teams
   */
  list: (): Promise<TeamsListResponse> =>
    api.get('/api/teams'),

  /**
   * Get single team by ID
   */
  get: (id: string): Promise<TeamDetailResponse> =>
    api.get(`/api/teams/${id}`),

  /**
   * Get single team by ID (alias)
   */
  getById: (id: string): Promise<TeamDetailResponse> =>
    api.get(`/api/teams/${id}`),

  /**
   * Create new team
   */
  create: (data: CreateTeamData): Promise<TeamDetailResponse> =>
    api.post('/api/teams', data),

  /**
   * Update team
   */
  update: (id: string, data: UpdateTeamData): Promise<TeamDetailResponse> =>
    api.put(`/api/teams/${id}`, data),

  /**
   * Delete team
   */
  delete: (id: string): Promise<{ success: boolean }> =>
    api.delete(`/api/teams/${id}`),

  /**
   * Get team members
   */
  getMembers: (id: string): Promise<TeamMembersResponse> =>
    api.get(`/api/teams/${id}/members`),

  /**
   * Add member to team
   */
  addMember: (teamId: string, data: AddMemberData): Promise<TeamMember> =>
    api.post(`/api/teams/${teamId}/members`, data),

  /**
   * Remove member from team
   */
  removeMember: (teamId: string, employeeId: string): Promise<{ success: boolean }> =>
    api.delete(`/api/teams/${teamId}/members/${employeeId}`),
}

export default teamsApi

