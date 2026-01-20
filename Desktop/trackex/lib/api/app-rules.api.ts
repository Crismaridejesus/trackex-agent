/**
 * App Rules API
 * 
 * All app rule-related API calls
 */

import { api } from './client'

// ============================================
// TYPES
// ============================================

export type MatcherType = 'exact' | 'contains' | 'regex' | 'prefix' | 'suffix'
export type CategoryType = 'PRODUCTIVE' | 'NEUTRAL' | 'DISTRACTING'

export interface AppRule {
  id: string
  matcherType: MatcherType
  value: string
  category: CategoryType
  priority: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AppRulesListResponse {
  rules: AppRule[]
}

export interface AppRuleDetailResponse {
  rule: AppRule
}

export interface CreateAppRuleData {
  matcherType: MatcherType
  value: string
  category: CategoryType
  priority?: number
  isActive?: boolean
}

export interface UpdateAppRuleData {
  matcherType?: MatcherType
  value?: string
  category?: CategoryType
  priority?: number
  isActive?: boolean
}

export interface TestAppRuleData {
  rule: {
    matcherType: MatcherType
    value: string
  }
  appName: string
}

export interface TestAppRuleResponse {
  matches: boolean
  matchedValue?: string
}

// ============================================
// API FUNCTIONS
// ============================================

export const appRulesApi = {
  /**
   * Get all app rules
   */
  list: (): Promise<AppRulesListResponse> =>
    api.get('/api/app-rules'),

  /**
   * Get single app rule by ID
   */
  get: (id: string): Promise<AppRuleDetailResponse> =>
    api.get(`/api/app-rules/${id}`),

  /**
   * Create new app rule
   */
  create: (data: CreateAppRuleData): Promise<AppRuleDetailResponse> =>
    api.post('/api/app-rules', data),

  /**
   * Update app rule
   */
  update: (id: string, data: UpdateAppRuleData): Promise<AppRuleDetailResponse> =>
    api.put(`/api/app-rules/${id}`, data),

  /**
   * Delete app rule
   */
  delete: (id: string): Promise<{ success: boolean }> =>
    api.delete(`/api/app-rules/${id}`),

  /**
   * Toggle app rule active status
   */
  toggle: (id: string, isActive: boolean): Promise<AppRuleDetailResponse> =>
    api.put(`/api/app-rules/${id}`, { isActive }),

  /**
   * Test an app rule against an app name
   */
  test: (data: TestAppRuleData): Promise<TestAppRuleResponse> =>
    api.post('/api/app-rules/test', data),
}

export default appRulesApi

