/**
 * Domain Rules API
 * 
 * All domain rule-related API calls
 */

import { api } from './client'

// ============================================
// TYPES
// ============================================

export type MatcherType = 'EXACT' | 'CONTAINS' | 'SUFFIX' | 'PREFIX' | 'REGEX'
export type CategoryType = 'PRODUCTIVE' | 'NEUTRAL' | 'UNPRODUCTIVE'

export interface DomainRule {
  id: string
  domain: string
  matcherType: string
  category: string
  description: string | null
  priority: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface DomainRulesListResponse {
  rules: DomainRule[]
}

export interface DomainRuleDetailResponse {
  rule: DomainRule
}

export interface CreateDomainRuleData {
  domain: string
  matcherType: string
  category: string
  description?: string | null
  priority?: number
  isActive?: boolean
}

export interface UpdateDomainRuleData {
  domain?: string
  matcherType?: string
  category?: string
  description?: string | null
  priority?: number
  isActive?: boolean
}

// ============================================
// API FUNCTIONS
// ============================================

export const domainRulesApi = {
  /**
   * Get all domain rules
   */
  list: (): Promise<DomainRulesListResponse> =>
    api.get('/api/domain-rules'),

  /**
   * Get single domain rule by ID
   */
  get: (id: string): Promise<DomainRuleDetailResponse> =>
    api.get(`/api/domain-rules/${id}`),

  /**
   * Create new domain rule
   */
  create: (data: CreateDomainRuleData): Promise<DomainRuleDetailResponse> =>
    api.post('/api/domain-rules', data),

  /**
   * Update domain rule
   */
  update: (id: string, data: UpdateDomainRuleData): Promise<DomainRuleDetailResponse> =>
    api.put(`/api/domain-rules/${id}`, data),

  /**
   * Delete domain rule
   */
  delete: (id: string): Promise<{ success: boolean }> =>
    api.delete(`/api/domain-rules/${id}`),

  /**
   * Toggle domain rule active status
   */
  toggle: (id: string, isActive: boolean): Promise<DomainRuleDetailResponse> =>
    api.put(`/api/domain-rules/${id}`, { isActive }),
}

export default domainRulesApi

