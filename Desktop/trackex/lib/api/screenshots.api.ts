/**
 * Screenshots API
 * 
 * All screenshot-related API calls
 */

import { api } from './client'

// ============================================
// TYPES
// ============================================

export interface Screenshot {
  id: string
  cloudinaryUrl: string
  cloudinaryPublicId: string
  width: number
  height: number
  format: string
  bytes: number
  isAuto: boolean
  isRedacted: boolean
  takenAt: string
  createdAt: string
  device?: {
    id: string
    deviceName: string
    platform: string
  }
}

export interface ScreenshotPagination {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface ScreenshotsListResponse {
  screenshots: Screenshot[]
  pagination: ScreenshotPagination
}

export interface ScreenshotJobResponse {
  jobId: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  screenshotData?: string
  error?: string
  employee?: {
    name: string
    email: string
  }
}

export interface RequestScreenshotData {
  employeeId: string
  deviceId: string
}

// ============================================
// API FUNCTIONS
// ============================================

export const screenshotsApi = {
  /**
   * Get paginated screenshots for an employee
   */
  list: (params: {
    employeeId: string
    offset?: number
    limit?: number
    startDate?: string
    endDate?: string
  }): Promise<ScreenshotsListResponse> => {
    const queryParams: Record<string, string | number | undefined> = {
      employeeId: params.employeeId,
      offset: params.offset ?? 0,
      limit: params.limit ?? 12,
    }
    if (params.startDate) {
      queryParams.startDate = params.startDate
    }
    if (params.endDate) {
      queryParams.endDate = params.endDate
    }
    return api.get('/api/screenshots', queryParams)
  },

  /**
   * Get single screenshot by ID
   */
  get: (id: string): Promise<Screenshot> =>
    api.get(`/api/screenshots/${id}`),

  /**
   * Request a manual screenshot
   */
  request: (data: RequestScreenshotData): Promise<{ jobId: string }> =>
    api.post('/api/screenshots', data),

  /**
   * Get screenshot job status (for polling)
   */
  getJob: (jobId: string): Promise<ScreenshotJobResponse> =>
    api.get('/api/screenshots', { jobId }),

  /**
   * Get screenshot image data
   */
  getImage: (id: string): Promise<Response> =>
    api.get(`/api/screenshots/${id}/image`),
}

export default screenshotsApi

