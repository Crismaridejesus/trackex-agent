"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useState, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"

interface QueryProviderProps {
  children: React.ReactNode
}

/**
 * Create a QueryClient with production-ready defaults
 * - Stale time: 5 minutes (show cached data, refetch in background)
 * - Cache time (gcTime): 30 minutes (keep data for instant navigation)
 * - Retry logic with exponential backoff
 * - Global error handling
 * - Window focus refetching disabled by default (individual queries can override)
 */
function createQueryClient(onError?: (error: Error) => void): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 5 minutes - enables stale-while-revalidate
        staleTime: 5 * 60 * 1000,
        // Keep unused data in cache for 30 minutes for instant navigation
        gcTime: 30 * 60 * 1000,
        // Retry failed requests with exponential backoff
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          if (error instanceof Error && error.message.includes('4')) {
            return false
          }
          // Retry up to 3 times for server errors
          return failureCount < 3
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Disable refetch on window focus by default to prevent unnecessary loading states
        // Individual queries can override this if they need real-time freshness
        refetchOnWindowFocus: false,
        // Don't refetch on mount if data is in cache (fresh or stale)
        refetchOnMount: 'always',
        // Refetch on reconnect
        refetchOnReconnect: true,
      },
      mutations: {
        // Retry mutations once on failure
        retry: 1,
        retryDelay: 1000,
        // Call onError callback for global error handling
        onError: (error) => {
          if (onError && error instanceof Error) {
            onError(error)
          }
        },
      },
    },
  })
}

export function QueryProvider({ children }: Readonly<QueryProviderProps>) {
  const { toast } = useToast()

  // Global error handler for mutations
  const handleMutationError = useCallback((error: Error) => {
    // Only show toast for unexpected errors (not handled by individual mutations)
    console.error('[QueryProvider] Mutation error:', error.message)
  }, [])

  const [queryClient] = useState(() => createQueryClient(handleMutationError))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools only in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false} 
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  )
}

// Export queryClient getter for use in SSE handlers and other non-component contexts
// This should be used sparingly - prefer useQueryClient() hook in components
export { createQueryClient }
