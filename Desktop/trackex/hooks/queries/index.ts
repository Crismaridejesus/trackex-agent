/**
 * Query Hooks - Centralized Exports
 * 
 * Import all query hooks from this file:
 * import { useEmployees, useTeams, useAnalytics } from '@/hooks/queries'
 */

// Employees
export {
  useEmployees,
  useEmployee,
  useEmployeeAnalytics,
  useEmployeeAppUsage,
  useEmployeeDevices,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useUpdateEmployeeScreenshots,
  usePrefetchEmployee,
} from './use-employees'

// Teams
export {
  useTeams,
  useTeam,
  useTeamMembers,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useAddTeamMember,
  useRemoveTeamMember,
} from './use-teams'

// Analytics
export {
  useHomeAnalytics,
  useEmployeeAnalytics as useEmployeeAnalyticsHook,
  usePrefetchAnalytics,
  usePrefetchEmployeeAnalytics,
} from './use-analytics'

// Screenshots
export {
  useInfiniteScreenshots,
  useScreenshots,
  useScreenshot,
  useScreenshotJob,
  useRequestScreenshot,
  usePrefetchNextScreenshots,
} from './use-screenshots'

// Policies
export {
  usePolicies,
  usePolicy,
  useCreatePolicy,
  useUpdatePolicy,
  useDeletePolicy,
  useSetDefaultPolicy,
} from './use-policies'

// App Rules
export {
  useAppRules,
  useAppRule,
  useCreateAppRule,
  useUpdateAppRule,
  useDeleteAppRule,
  useToggleAppRule,
  useTestAppRule,
} from './use-app-rules'

// Domain Rules
export {
  useDomainRules,
  useDomainRule,
  useCreateDomainRule,
  useUpdateDomainRule,
  useDeleteDomainRule,
  useToggleDomainRule,
} from './use-domain-rules'

// Audit Logs
export {
  useInfiniteAuditLogs,
  useAuditLogs,
} from './use-audit-logs'

// Live View
export {
  useLiveView,
  useLiveViewWithSSE,
  useRequestLiveScreenshot,
} from './use-live-view'

