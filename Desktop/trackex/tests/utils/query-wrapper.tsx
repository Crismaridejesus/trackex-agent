/**
 * React Query Test Wrapper
 * 
 * Provides a QueryClient wrapper for testing components that use React Query.
 * 
 * Usage:
 * ```tsx
 * import { renderWithQuery } from '@/tests/utils/query-wrapper'
 * 
 * test('renders employee list', async () => {
 *   const { getByText } = renderWithQuery(<EmployeeList />)
 *   await waitFor(() => expect(getByText('John Doe')).toBeInTheDocument())
 * })
 * ```
 */

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions, type RenderResult } from '@testing-library/react'

/**
 * Create a test QueryClient with settings optimized for testing
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

interface WrapperProps {
  children: React.ReactNode
}

/**
 * Create a wrapper component with QueryClientProvider
 */
export function createQueryWrapper(queryClient?: QueryClient): React.FC<WrapperProps> {
  const client = queryClient || createTestQueryClient()
  
  return function QueryWrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={client}>
        {children}
      </QueryClientProvider>
    )
  }
}

interface RenderWithQueryOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
}

interface RenderWithQueryResult extends RenderResult {
  queryClient: QueryClient
}

/**
 * Render a component wrapped in QueryClientProvider
 * Returns the render result plus the queryClient for assertions
 */
export function renderWithQuery(
  ui: React.ReactElement,
  options: RenderWithQueryOptions = {}
): RenderWithQueryResult {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options
  
  const Wrapper = createQueryWrapper(queryClient)
  
  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  }
}

/**
 * Helper to mock a successful query response
 */
export function mockQuerySuccess<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  data: T
): void {
  queryClient.setQueryData(queryKey, data)
}

/**
 * Helper to mock a query error
 */
export function mockQueryError(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  error: Error
): void {
  queryClient.setQueryData(queryKey, undefined)
  queryClient.setQueryDefaults(queryKey, {
    queryFn: () => Promise.reject(error),
  })
}

/**
 * Helper to wait for all queries to finish
 */
export async function waitForQueries(queryClient: QueryClient): Promise<void> {
  await queryClient.isFetching() === 0
  // Give React time to update
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Mock API response helper
 */
export function mockFetchResponse<T>(data: T, options: { status?: number; ok?: boolean } = {}): void {
  const { status = 200, ok = true } = options
  
  // @ts-expect-error - We're mocking fetch
  global.fetch.mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(data),
    headers: new Headers({ 'content-type': 'application/json' }),
  })
}

/**
 * Mock API error helper
 */
export function mockFetchError(message: string, status = 500): void {
  // @ts-expect-error - We're mocking fetch
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
    headers: new Headers({ 'content-type': 'application/json' }),
  })
}

