/**
 * Centralized, type-safe query key factory
 * 
 * This ensures consistent query keys across the application,
 * enabling proper cache invalidation and type inference.
 * 
 * Usage:
 * - queryKeys.employees.all - All employee queries
 * - queryKeys.employees.list({ teamId: 'abc' }) - Filtered employee list
 * - queryKeys.employees.detail('employee-id') - Single employee
 * 
 * Invalidation patterns:
 * - queryClient.invalidateQueries({ queryKey: queryKeys.employees.all })
 *   → Invalidates all employee-related queries
 * - queryClient.invalidateQueries({ queryKey: queryKeys.employees.lists() })
 *   → Invalidates all employee list queries
 */

// Type definitions for query filters
export interface EmployeeFilters {
  teamId?: string
  startDate?: string
  endDate?: string
}

export interface AnalyticsFilters {
  startDate?: string
  endDate?: string
  teamIds?: string[]
}

export interface ScreenshotFilters {
  employeeId: string
  offset?: number
  limit?: number
  startDate?: string
  endDate?: string
}

export interface AuditFilters {
  action?: string
  limit?: number
  offset?: number
}

export interface AppRuleFilters {
  isActive?: boolean
  category?: string
}

export interface DomainRuleFilters {
  isActive?: boolean
  category?: string
}

export interface PolicyFilters {
  isDefault?: boolean
}

export interface LiveViewFilters {
  teamId?: string
}

// Query key factory
export const queryKeys = {
  // ============================================
  // EMPLOYEES
  // ============================================
  employees: {
    all: ['employees'] as const,
    lists: () => [...queryKeys.employees.all, 'list'] as const,
    list: (filters?: EmployeeFilters) => [...queryKeys.employees.lists(), filters] as const,
    details: () => [...queryKeys.employees.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.employees.details(), id] as const,
    analytics: (id: string, filters?: AnalyticsFilters) => 
      [...queryKeys.employees.detail(id), 'analytics', filters] as const,
    appUsage: (id: string, filters?: AnalyticsFilters) => 
      [...queryKeys.employees.detail(id), 'app-usage', filters] as const,
    sessions: (id: string) => [...queryKeys.employees.detail(id), 'sessions'] as const,
    devices: (id: string) => [...queryKeys.employees.detail(id), 'devices'] as const,
  },

  // ============================================
  // TEAMS
  // ============================================
  teams: {
    all: ['teams'] as const,
    lists: () => [...queryKeys.teams.all, 'list'] as const,
    list: () => [...queryKeys.teams.lists()] as const,
    details: () => [...queryKeys.teams.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.teams.details(), id] as const,
    members: (id: string) => [...queryKeys.teams.detail(id), 'members'] as const,
  },

  // ============================================
  // ANALYTICS
  // ============================================
  analytics: {
    all: ['analytics'] as const,
    home: (filters?: AnalyticsFilters) => [...queryKeys.analytics.all, 'home', filters] as const,
    employee: (id: string, filters?: AnalyticsFilters) => 
      [...queryKeys.analytics.all, 'employee', id, filters] as const,
  },

  // ============================================
  // SCREENSHOTS
  // ============================================
  screenshots: {
    all: ['screenshots'] as const,
    lists: () => [...queryKeys.screenshots.all, 'list'] as const,
    list: (filters?: ScreenshotFilters) => [...queryKeys.screenshots.lists(), filters] as const,
    infinite: (filters?: Omit<ScreenshotFilters, 'offset'>) => 
      [...queryKeys.screenshots.all, 'infinite', filters] as const,
    details: () => [...queryKeys.screenshots.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.screenshots.details(), id] as const,
    job: (jobId: string) => [...queryKeys.screenshots.all, 'job', jobId] as const,
  },

  // ============================================
  // APP RULES
  // ============================================
  appRules: {
    all: ['app-rules'] as const,
    lists: () => [...queryKeys.appRules.all, 'list'] as const,
    list: (filters?: AppRuleFilters) => [...queryKeys.appRules.lists(), filters] as const,
    details: () => [...queryKeys.appRules.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.appRules.details(), id] as const,
  },

  // ============================================
  // DOMAIN RULES
  // ============================================
  domainRules: {
    all: ['domain-rules'] as const,
    lists: () => [...queryKeys.domainRules.all, 'list'] as const,
    list: (filters?: DomainRuleFilters) => [...queryKeys.domainRules.lists(), filters] as const,
    details: () => [...queryKeys.domainRules.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.domainRules.details(), id] as const,
  },

  // ============================================
  // POLICIES
  // ============================================
  policies: {
    all: ['policies'] as const,
    lists: () => [...queryKeys.policies.all, 'list'] as const,
    list: (filters?: PolicyFilters) => [...queryKeys.policies.lists(), filters] as const,
    details: () => [...queryKeys.policies.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.policies.details(), id] as const,
  },

  // ============================================
  // AGENT VERSIONS
  // ============================================
  agentVersions: {
    all: ['agent-versions'] as const,
    lists: () => [...queryKeys.agentVersions.all, 'list'] as const,
    list: () => [...queryKeys.agentVersions.lists()] as const,
    details: () => [...queryKeys.agentVersions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.agentVersions.details(), id] as const,
  },

  // ============================================
  // AUDIT LOGS
  // ============================================
  auditLogs: {
    all: ['audit-logs'] as const,
    lists: () => [...queryKeys.auditLogs.all, 'list'] as const,
    list: (filters?: AuditFilters) => [...queryKeys.auditLogs.lists(), filters] as const,
    infinite: (filters?: Omit<AuditFilters, 'offset'>) => 
      [...queryKeys.auditLogs.all, 'infinite', filters] as const,
  },

  // ============================================
  // LIVE VIEW
  // ============================================
  live: {
    all: ['live'] as const,
    online: (filters?: LiveViewFilters) => [...queryKeys.live.all, 'online', filters] as const,
    stream: (teamId?: string) => [...queryKeys.live.all, 'stream', teamId] as const,
  },

  // ============================================
  // DEVICES
  // ============================================
  devices: {
    all: ['devices'] as const,
    lists: () => [...queryKeys.devices.all, 'list'] as const,
    list: () => [...queryKeys.devices.lists()] as const,
    details: () => [...queryKeys.devices.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.devices.details(), id] as const,
    token: (id: string) => [...queryKeys.devices.detail(id), 'token'] as const,
  },

  // ============================================
  // SESSION / AUTH
  // ============================================
  session: {
    all: ['session'] as const,
    current: () => [...queryKeys.session.all, 'current'] as const,
  },

  // ============================================
  // EXPORTS
  // ============================================
  exports: {
    all: ['exports'] as const,
    appUsage: (filters?: AnalyticsFilters) => [...queryKeys.exports.all, 'app-usage', filters] as const,
    homeAnalytics: (filters?: AnalyticsFilters) => [...queryKeys.exports.all, 'home-analytics', filters] as const,
    employeeSessions: (id: string, filters?: AnalyticsFilters) => 
      [...queryKeys.exports.all, 'employee-sessions', id, filters] as const,
  },
} as const

// Type helpers for query key types
export type QueryKeys = typeof queryKeys
export type EmployeeQueryKey = ReturnType<typeof queryKeys.employees.list>
export type TeamQueryKey = ReturnType<typeof queryKeys.teams.list>
export type AnalyticsQueryKey = ReturnType<typeof queryKeys.analytics.home>
export type ScreenshotQueryKey = ReturnType<typeof queryKeys.screenshots.list>
export type AuditLogQueryKey = ReturnType<typeof queryKeys.auditLogs.list>
export type LiveQueryKey = ReturnType<typeof queryKeys.live.online>

