/**
 * Analytics API
 * 
 * All analytics-related API calls
 */

import { api } from './client'

// ============================================
// TYPES
// ============================================

export interface AnalyticsTotals {
  totalWork: number
  activeTime: number
  idleTime: number
  productiveTime: number
  neutralTime: number
  distractingTime: number
  avgPerEmployee?: number
  productivityScore?: number
}

export interface DailyAnalytics {
  date: string
  totalWork: number
  activeTime: number
  idleTime: number
  productiveTime: number
  neutralTime: number
  distractingTime: number
}

export interface TopApp {
  appName: string
  activeTime: number
  idleTime: number
  totalTime: number
  category: string
  sessions: number
}

export interface TopDomain {
  domain: string
  activeTime: number
  category: string
  visits: number
}

export interface HomeAnalyticsResponse {
  analytics: {
    totals: AnalyticsTotals
    dailyAnalytics: DailyAnalytics[]
    topApps: TopApp[]
    topDomains: TopDomain[]
    employeeCount: number
  }
}

export interface EmployeeAnalyticsResponse {
  analytics: {
    totals: AnalyticsTotals
    dailyAnalytics: DailyAnalytics[]
    topApps: TopApp[]
    topDomains: TopDomain[]
  }
}

// ============================================
// API FUNCTIONS
// ============================================

export const analyticsApi = {
  /**
   * Get home dashboard analytics
   */
  getHome: (params: {
    startDate: string
    endDate: string
    teamIds?: string[]
  }): Promise<HomeAnalyticsResponse> => {
    const queryParams: Record<string, string | undefined> = {
      startDate: params.startDate,
      endDate: params.endDate,
    }
    if (params.teamIds && params.teamIds.length > 0) {
      queryParams.teamIds = params.teamIds.join(',')
    }
    return api.get('/api/analytics/home', queryParams)
  },

  /**
   * Get employee-specific analytics
   */
  getEmployee: (
    employeeId: string,
    params: { startDate: string; endDate: string }
  ): Promise<EmployeeAnalyticsResponse> =>
    api.get(`/api/analytics/employee/${employeeId}`, params),

  /**
   * Export home analytics as CSV
   */
  exportHomeCSV: (params: {
    startDate: string
    endDate: string
    teamIds?: string[]
  }): Promise<Response> => {
    const queryParams: Record<string, string | undefined> = {
      startDate: params.startDate,
      endDate: params.endDate,
    }
    if (params.teamIds && params.teamIds.length > 0) {
      queryParams.teamIds = params.teamIds.join(',')
    }
    return api.get('/api/exports/home-analytics', queryParams)
  },

  /**
   * Export app usage as CSV
   */
  exportAppUsageCSV: (params: {
    startDate: string
    endDate: string
    teamIds?: string[]
  }): Promise<Response> => {
    const queryParams: Record<string, string | undefined> = {
      startDate: params.startDate,
      endDate: params.endDate,
    }
    if (params.teamIds && params.teamIds.length > 0) {
      queryParams.teamIds = params.teamIds.join(',')
    }
    return api.get('/api/exports/app-usage', queryParams)
  },
}

export default analyticsApi

