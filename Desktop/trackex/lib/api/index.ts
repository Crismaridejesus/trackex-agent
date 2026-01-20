/**
 * API Layer - Centralized Exports
 * 
 * Import all API modules from this file:
 * import { employeesApi, teamsApi, analyticsApi } from '@/lib/api'
 */

export { api, ApiError } from './client'
export { employeesApi, type Employee, type EmployeeListResponse, type CreateEmployeeData, type UpdateEmployeeData } from './employees.api'
export { teamsApi, type Team, type TeamsListResponse, type CreateTeamData, type UpdateTeamData } from './teams.api'
export { analyticsApi, type HomeAnalyticsResponse, type EmployeeAnalyticsResponse, type AnalyticsTotals } from './analytics.api'
export { screenshotsApi, type Screenshot, type ScreenshotsListResponse, type ScreenshotJobResponse } from './screenshots.api'
export { policiesApi, type Policy, type PoliciesListResponse, type CreatePolicyData, type UpdatePolicyData } from './policies.api'
export { appRulesApi, type AppRule, type AppRulesListResponse, type CreateAppRuleData, type UpdateAppRuleData } from './app-rules.api'
export { domainRulesApi, type DomainRule, type DomainRulesListResponse, type CreateDomainRuleData, type UpdateDomainRuleData } from './domain-rules.api'
export { auditApi, type AuditLog, type AuditLogsListResponse } from './audit.api'
export { liveApi, type LiveViewResponse, type OnlineEmployee, type FinishedSession } from './live.api'
export { agentVersionsApi, type AgentVersion, type AgentVersionsListResponse, type CreateAgentVersionData, type UpdateAgentVersionData } from './agent-versions.api'

