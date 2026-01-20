/**
 * Employees API
 * 
 * All employee-related API calls
 */

import { api } from './client'

// ============================================
// TYPES
// ============================================

export interface Employee {
  id: string
  name: string
  email: string
  isActive: boolean
  teamId: string | null
  autoScreenshots: boolean
  screenshotInterval: number | null
  team?: {
    id: string
    name: string
  } | null
  devices?: Device[]
  sessions?: WorkSession[]
  _count?: {
    screenshots: number
    sessions: number
  }
  analytics?: EmployeeAnalytics
  createdAt: string
  updatedAt: string
}

export interface WorkSession {
  id: string
  clockIn: string
  clockOut: string | null
  activeTime: number | null
  idleTime: number | null
  totalWork: number | null
}

export interface Device {
  id: string
  deviceName: string
  name?: string
  platform: string
  version?: string
  lastSeen: string
  isActive: boolean
}

export interface EmployeeAnalytics {
  totalWork: number
  activeTime: number
  idleTime: number
  productivityScore: number
}

export interface EmployeeListResponse {
  employees: Employee[]
  total: number
}

export interface EmployeeDetailResponse {
  employee: Employee
}

export interface CreateEmployeeData {
  name: string
  email: string
  teamId?: string
  password?: string
}

export interface UpdateEmployeeData {
  name?: string
  email?: string
  teamId?: string | null
  isActive?: boolean
  autoScreenshots?: boolean
  screenshotInterval?: number | null
}

export interface EmployeeAnalyticsResponse {
  analytics: {
    totals: {
      totalWork: number
      activeTime: number
      idleTime: number
      productivityScore?: number
      productiveTime?: number
    }
    dailyAnalytics: Array<{
      date: string
      totalWork: number
      activeTime: number
      idleTime: number
    }>
    topApps: Array<{
      appName: string
      activeTime: number
      category: string
    }>
  }
}

export interface EmployeeAppUsageResponse {
  statistics: {
    totalDuration: number
    activeDuration: number
    idleDuration: number
  }
  appSummary: Array<{
    appName: string
    activeDuration: number
    idleDuration: number
    totalDuration: number
    category: string
    sessions: number
  }>
}

export interface EmployeeCredentialsResponse {
  email: string
  password: string
  deviceToken?: string
}

// ============================================
// API FUNCTIONS
// ============================================

export const employeesApi = {
  /**
   * Get all employees with optional filters
   */
  list: (params?: {
    teamId?: string
    startDate?: string
    endDate?: string
    excludeTeam?: string
  }): Promise<EmployeeListResponse> => {
    const queryParams: Record<string, string | undefined> = {}
    if (params?.teamId && params.teamId !== 'all') {
      queryParams.teamId = params.teamId
    }
    if (params?.startDate) {
      queryParams.startDate = params.startDate
    }
    if (params?.endDate) {
      queryParams.endDate = params.endDate
    }
    if (params?.excludeTeam) {
      queryParams.excludeTeam = params.excludeTeam
    }
    return api.get('/api/employees', queryParams)
  },

  /**
   * Get all employees (alias for list)
   */
  getAll: (params?: {
    teamId?: string
    startDate?: string
    endDate?: string
    excludeTeam?: string
  }): Promise<EmployeeListResponse> => {
    const queryParams: Record<string, string | undefined> = {}
    if (params?.teamId && params.teamId !== 'all') {
      queryParams.teamId = params.teamId
    }
    if (params?.startDate) {
      queryParams.startDate = params.startDate
    }
    if (params?.endDate) {
      queryParams.endDate = params.endDate
    }
    if (params?.excludeTeam) {
      queryParams.excludeTeam = params.excludeTeam
    }
    return api.get('/api/employees', queryParams)
  },

  /**
   * Get single employee by ID
   */
  get: (id: string): Promise<EmployeeDetailResponse> =>
    api.get(`/api/employees/${id}`),

  /**
   * Create new employee
   */
  create: (data: CreateEmployeeData): Promise<EmployeeDetailResponse> =>
    api.post('/api/employees', data),

  /**
   * Update employee
   */
  update: (id: string, data: UpdateEmployeeData): Promise<EmployeeDetailResponse> =>
    api.put(`/api/employees/${id}`, data),

  /**
   * Delete employee
   */
  delete: (id: string): Promise<{ success: boolean }> =>
    api.delete(`/api/employees/${id}`),

  /**
   * Get employee analytics
   */
  getAnalytics: (
    id: string,
    params: { startDate: string; endDate: string }
  ): Promise<EmployeeAnalyticsResponse> =>
    api.get(`/api/analytics/employee/${id}`, params),

  /**
   * Get employee app usage
   */
  getAppUsage: (
    id: string,
    params: { startDate: string; endDate: string }
  ): Promise<EmployeeAppUsageResponse> =>
    api.get(`/api/employees/${id}/app-usage`, params),

  /**
   * Get employee credentials (for device setup)
   */
  getCredentials: (id: string): Promise<EmployeeCredentialsResponse> =>
    api.get(`/api/employees/${id}/credentials`),

  /**
   * Update employee screenshot settings
   */
  updateScreenshotSettings: (
    id: string,
    data: { autoScreenshots: boolean; screenshotInterval: number }
  ): Promise<EmployeeDetailResponse> =>
    api.put(`/api/employees/${id}`, data),

  /**
   * Get employee devices
   */
  getDevices: (id: string): Promise<{ devices: Device[] }> =>
    api.get(`/api/employees/${id}/devices`),
}

export default employeesApi

