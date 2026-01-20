/**
 * Policies API
 * 
 * All policy-related API calls
 */

import { api } from './client'

// ============================================
// TYPES
// ============================================

export interface Policy {
  id: string
  name: string
  idleThresholdS: number
  countIdleAsWork: boolean
  autoScreenshots: boolean
  screenshotInterval: number | null
  redactTitles: boolean
  browserDomainOnly: boolean
  isDefault: boolean
  _count: {
    employees: number
    teamsDefault: number
  }
  createdAt: string
  updatedAt: string
}

export interface PoliciesListResponse {
  policies: Policy[]
}

export interface PolicyDetailResponse {
  policy: Policy
}

export interface CreatePolicyData {
  name: string
  idleThresholdS?: number
  countIdleAsWork?: boolean
  autoScreenshots?: boolean
  screenshotInterval?: number | null
  redactTitles?: boolean
  browserDomainOnly?: boolean
  isDefault?: boolean
}

export interface UpdatePolicyData {
  name?: string
  idleThresholdS?: number
  countIdleAsWork?: boolean
  autoScreenshots?: boolean
  screenshotInterval?: number | null
  redactTitles?: boolean
  browserDomainOnly?: boolean
  isDefault?: boolean
}

// ============================================
// API FUNCTIONS
// ============================================

export const policiesApi = {
  /**
   * Get all policies
   */
  list: (): Promise<PoliciesListResponse> =>
    api.get('/api/policies'),

  /**
   * Get single policy by ID
   */
  get: (id: string): Promise<PolicyDetailResponse> =>
    api.get(`/api/policies/${id}`),

  /**
   * Create new policy
   */
  create: (data: CreatePolicyData): Promise<PolicyDetailResponse> =>
    api.post('/api/policies', data),

  /**
   * Update policy
   */
  update: (id: string, data: UpdatePolicyData): Promise<PolicyDetailResponse> =>
    api.put(`/api/policies/${id}`, data),

  /**
   * Delete policy
   */
  delete: (id: string): Promise<{ success: boolean }> =>
    api.delete(`/api/policies/${id}`),

  /**
   * Set policy as default
   */
  setDefault: (id: string): Promise<PolicyDetailResponse> =>
    api.put(`/api/policies/${id}`, { isDefault: true }),
}

export default policiesApi

