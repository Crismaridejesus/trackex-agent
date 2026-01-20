import { PrismaClient } from "@prisma/client";
// Re-exported Prisma client with latest schema

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Build connection URL with pool configuration
// Prisma uses query parameters for pool settings in PostgreSQL
function getDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL || ""

  // If URL already has pool settings, use as-is
  if (
    baseUrl.includes("connection_limit") ||
    baseUrl.includes("pool_timeout")
  ) {
    return baseUrl
  }

  // Add connection pool settings for production stability
  // These prevent connection exhaustion under load
  const separator = baseUrl.includes("?") ? "&" : "?"
  const poolSettings = [
    "connection_limit=10", // Max connections per Prisma client instance
    "pool_timeout=30", // Seconds to wait for available connection
    "connect_timeout=10", // Seconds to wait for initial connection
  ].join("&")

  return `${baseUrl}${separator}${poolSettings}`
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    // Connection pool configuration (critical for production)
    // Pool settings are applied via DATABASE_URL query parameters:
    // - connection_limit=10: Max connections per instance (prevents exhaustion)
    // - pool_timeout=30: Wait up to 30s for connection from pool
    // - connect_timeout=10: Timeout for establishing new connections
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
