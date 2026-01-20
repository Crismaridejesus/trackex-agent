/**
 * Agent Versions API
 * 
 * All agent version-related API calls for managing desktop agent updates
 */

import { api } from './client'

// ============================================
// TYPES
// ============================================

export type Platform = 'darwin' | 'windows'
export type Architecture = 'aarch64' | 'x86_64' | 'universal'

export interface AgentVersion {
  id: string
  version: string
  platform: Platform
  arch: Architecture
  downloadUrl: string
  signature: string
  releaseNotes: string
  releasedAt: string
  isActive: boolean
  mandatory: boolean
  fileSize: number | null
  createdAt: string
  updatedAt: string
}

export interface AgentVersionsListResponse {
  versions: AgentVersion[]
}

export interface AgentVersionResponse {
  version: AgentVersion
}

export interface CreateAgentVersionData {
  version: string
  platform: Platform
  arch: Architecture
  downloadUrl: string
  signature: string
  releaseNotes: string
  isActive?: boolean
  mandatory?: boolean
  fileSize?: number | null
  releasedAt?: string
}

export interface UpdateAgentVersionData {
  version?: string
  platform?: Platform
  arch?: Architecture
  downloadUrl?: string
  signature?: string
  releaseNotes?: string
  isActive?: boolean
  mandatory?: boolean
  fileSize?: number | null
  releasedAt?: string
}

// ============================================
// API CLIENT
// ============================================

export const agentVersionsApi = {
  /**
   * List all agent versions
   */
  list: async (): Promise<AgentVersion[]> => {
    const response = await api.get<AgentVersionsListResponse>('/api/agent-versions')
    return response.versions
  },

  /**
   * Get a single agent version by ID
   */
  get: async (id: string): Promise<AgentVersion> => {
    const response = await api.get<AgentVersionResponse>(`/api/agent-versions/${id}`)
    return response.version
  },

  /**
   * Create a new agent version
   */
  create: async (data: CreateAgentVersionData): Promise<AgentVersion> => {
    const response = await api.post<AgentVersionResponse>('/api/agent-versions', data)
    return response.version
  },

  /**
   * Update an existing agent version
   */
  update: async (id: string, data: UpdateAgentVersionData): Promise<AgentVersion> => {
    const response = await api.put<AgentVersionResponse>(`/api/agent-versions/${id}`, data)
    return response.version
  },

  /**
   * Delete an agent version
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/agent-versions/${id}`)
  },

  /**
   * Toggle isActive status
   */
  toggleActive: async (id: string, isActive: boolean): Promise<AgentVersion> => {
    const response = await api.put<AgentVersionResponse>(`/api/agent-versions/${id}`, { isActive })
    return response.version
  },
}
