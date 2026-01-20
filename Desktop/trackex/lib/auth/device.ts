import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { 
  hashDeviceToken, 
  verifyDeviceTokenWithMigration,
  isLegacyBcryptHash 
} from "@/lib/utils/device-tokens"
import { LRUCache } from "lru-cache"

export interface DeviceAuth {
  device: {
    id: string
    employeeId: string
    platform: string
    deviceName: string
    version: string | null
    employee: {
      id: string
      name: string
      email: string
      isActive: boolean
    }
  }
  token: {
    id: string
  }
}

// In-memory token cache with LRU eviction and automatic TTL cleanup
// Replaces Map to prevent unbounded memory growth
const tokenCache = new LRUCache<string, DeviceAuth>({
  max: 1000, // Maximum 1000 cached tokens
  ttl: 5 * 60 * 1000, // 5 minutes TTL
  updateAgeOnGet: true, // Refresh TTL on access
  // LRU handles cleanup automatically - no need for manual cleanup!
})

/**
 * Authenticate a device using O(1) token lookup.
 * 
 * OPTIMIZATION: Previously this was O(n) - it loaded ALL tokens and compared
 * each one using bcrypt. With 1000 devices, this could take 100+ seconds.
 * 
 * Now we use SHA-256 hashing which is deterministic, allowing direct database
 * lookup by hash. This is O(1) regardless of the number of devices.
 * 
 * Migration: Legacy bcrypt hashes are detected and verified using the old
 * method, then automatically upgraded to SHA-256 on successful auth.
 */
export async function authenticateDevice(
  req: NextRequest
): Promise<DeviceAuth> {
  const authHeader = req.headers.get("authorization")

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Invalid authorization header")
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix

  if (!token) {
    throw new Error("Device token is required")
  }

  // Check cache first - LRU cache automatically handles TTL and eviction
  const cached = tokenCache.get(token)
  if (cached) {
    return cached
  }

  // O(1) LOOKUP: Hash the token and look up directly by hash
  const tokenHash = hashDeviceToken(token)
  
  // Try direct lookup first (new SHA-256 tokens)
  let deviceToken = await prisma.deviceToken.findFirst({
    where: { 
      tokenHash: tokenHash,
      isActive: true 
    },
    include: {
      device: {
        include: {
          employee: true,
        },
      },
    },
  })

  // If not found, check for legacy bcrypt tokens (migration path)
  // This is slower but only happens for old tokens that haven't been migrated
  if (!deviceToken) {
    deviceToken = await findLegacyBcryptToken(token)
  }

  if (!deviceToken) {
    throw new Error("Invalid device token")
  }

  // Check if employee is still active
  if (!deviceToken.device.employee.isActive) {
    throw new Error("Employee is inactive")
  }

  // Update last used timestamp (async, don't await)
  prisma.deviceToken.update({
    where: { id: deviceToken.id },
    data: { lastUsed: new Date() },
  }).catch(() => {}) // Ignore errors

  const deviceAuth: DeviceAuth = {
    device: deviceToken.device,
    token: { id: deviceToken.id },
  }

  // Cache the authentication result - LRU handles TTL automatically
  tokenCache.set(token, deviceAuth)

  return deviceAuth
}

/**
 * Find and migrate a legacy bcrypt token.
 * This is called only when the O(1) lookup fails, to support tokens
 * created before the SHA-256 migration.
 * 
 * Once found, the token is automatically migrated to SHA-256 for future O(1) lookups.
 */
async function findLegacyBcryptToken(token: string) {
  // Find all active tokens with bcrypt hashes (they start with $2a$, $2b$, or $2y$)
  const legacyTokens = await prisma.deviceToken.findMany({
    where: { 
      isActive: true,
      tokenHash: { startsWith: '$2' } // bcrypt hashes start with $2
    },
    include: {
      device: {
        include: {
          employee: true,
        },
      },
    },
  })

  for (const deviceToken of legacyTokens) {
    const { valid, needsMigration } = await verifyDeviceTokenWithMigration(
      token, 
      deviceToken.tokenHash
    )

    if (valid) {
      // Migrate to SHA-256 hash for future O(1) lookups
      if (needsMigration) {
        const newHash = hashDeviceToken(token)
        await prisma.deviceToken.update({
          where: { id: deviceToken.id },
          data: { tokenHash: newHash },
        }).catch((err) => {
          console.error("Failed to migrate token hash:", err)
        })
        console.log(`Migrated device token ${deviceToken.id} from bcrypt to SHA-256`)
      }

      return deviceToken
    }
  }

  return null
}

export async function requireDeviceAuth(req: NextRequest): Promise<DeviceAuth> {
  try {
    return await authenticateDevice(req)
  } catch (error) {
    throw new Error(
      `Device authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}
