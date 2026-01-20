/**
 * Audit Logs API
 * 
 * All audit log-related API calls
 */

import { api } from './client'

// ============================================
// TYPES
// ============================================

export interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId: string | null
  details: string | null
  ipAddress: string | null
  userAgent: string | null
  userId: string | null
  user?: {
    id: string
    name: string
    email: string
  } | null
  createdAt: string
}

export interface AuditLogPagination {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface AuditLogsListResponse {
  logs: AuditLog[]
  pagination: AuditLogPagination
}

// ============================================
// API FUNCTIONS
// ============================================

export const auditApi = {
  /**
   * Get paginated audit logs
   */
  list: (params?: {
    action?: string
    limit?: number
    offset?: number
  }): Promise<AuditLogsListResponse> => {
    const queryParams: Record<string, string | number | undefined> = {
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
    }
    if (params?.action) {
      queryParams.action = params.action
    }
    return api.get('/api/audit', queryParams)
  },
}

export default auditApi

