/**
 * Base API client with standardized error handling
 * 
 * Provides consistent fetch wrapper with:
 * - Automatic JSON parsing
 * - Error message extraction
 * - Type-safe responses
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

/**
 * Build URL with query parameters
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return endpoint
  
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  
  const queryString = searchParams.toString()
  return queryString ? `${endpoint}?${queryString}` : endpoint
}

/**
 * Base fetch wrapper with error handling
 */
async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options
  const url = buildUrl(endpoint, params)

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  })

  // Handle non-JSON responses
  const contentType = response.headers.get('content-type')
  const isJson = contentType?.includes('application/json')

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`
    let errorData: unknown

    if (isJson) {
      try {
        const errorBody = await response.json()
        errorMessage = errorBody.error || errorBody.message || errorMessage
        errorData = errorBody
      } catch {
        // Ignore JSON parse errors for error responses
      }
    }

    throw new ApiError(errorMessage, response.status, errorData)
  }

  // Return empty object for 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  if (isJson) {
    return response.json()
  }

  // Return raw response for non-JSON (like file downloads)
  return response as unknown as T
}

/**
 * API methods
 */
export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
    fetchApi<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, data?: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    fetchApi<T>(endpoint, { method: 'DELETE' }),
}

export default api

