// In-memory store with optional Redis fallback for real-time data

import { prisma } from "@/lib/db"

interface PresenceData {
  employeeId: string
  deviceId: string
  status: "online" | "idle" | "offline"
  currentApp?: {
    name: string
    windowTitle?: string
    url?: string
    domain?: string
    is_idle?: boolean  // Idle status flag - must be preserved when storing
  }
  lastSeen: Date
  activeTimeToday?: number
  idleTimeToday?: number
}

class DatabaseStore {
  private readonly TTL = 5 * 60 * 1000 // 5 minutes
  private isConnected = true
  private lastConnectionCheck = 0
  private readonly CONNECTION_CHECK_INTERVAL = 30000 // 30 seconds

  private async checkConnection(): Promise<boolean> {
    const now = Date.now()
    if (now - this.lastConnectionCheck < this.CONNECTION_CHECK_INTERVAL) {
      return this.isConnected
    }

    try {
      await prisma.$queryRaw`SELECT 1`
      this.isConnected = true
      this.lastConnectionCheck = now
      return true
    } catch (error) {
      console.warn("Database connection check failed:", error)
      this.isConnected = false
      this.lastConnectionCheck = now

      // Try to reconnect if connection was lost
      if (this.isConnected === false) {
        try {
          await prisma.$connect()
          this.isConnected = true
          return true
        } catch (reconnectError) {
          console.warn("Failed to reconnect to database:", reconnectError)
        }
      }

      return false
    }
  }

  async setPresence(deviceId: string, data: PresenceData) {
    if (!(await this.checkConnection())) {
      console.warn("Database not available, skipping presence update")
      return
    }

    try {
      // Store presence data in device table
      // IMPORTANT: Both 'online' and 'idle' statuses keep isActive=true
      // 'idle' means the user is still connected but inactive - they should remain visible
      // Only explicit removal (clock_out/disconnect) should set isActive=false
      await prisma.device.update({
        where: { id: deviceId },
        data: {
          lastSeen: data.lastSeen,
          isActive: data.status === "online" || data.status === "idle",
          // Store current app in a JSON field if available
          ...(data.currentApp && {
            currentApp: JSON.stringify(data.currentApp),
          }),
        },
      })
    } catch (error) {
      console.error("Failed to store presence in database:", error)
      this.isConnected = false
    }
  }

  async getPresence(deviceId: string): Promise<PresenceData | null> {
    if (!(await this.checkConnection())) {
      console.warn("Database not available, returning null for presence")
      return null
    }

    try {
      const device = await prisma.device.findUnique({
        where: { id: deviceId },
        include: {
          employee: {
            select: {
              id: true,
              isActive: true,
            },
          },
        },
      })

      if (!device || !device.employee.isActive || !device.lastSeen) {
        return null
      }

      // Check if expired
      if (Date.now() - device.lastSeen.getTime() > this.TTL) {
        return null
      }

      let currentApp = null
      if (device.currentApp) {
        try {
          currentApp = JSON.parse(device.currentApp)
        } catch (e) {
          console.warn("Failed to parse currentApp:", e)
        }
      }

      return {
        employeeId: device.employeeId,
        deviceId: device.id,
        status: device.isActive ? "online" : "offline",
        lastSeen: device.lastSeen,
        currentApp,
      }
    } catch (error) {
      console.error("Failed to get presence from database:", error)
      this.isConnected = false
      return null
    }
  }

  async getAllPresence(): Promise<PresenceData[]> {
    if (!(await this.checkConnection())) {
      console.warn("Database not available, returning empty presence array")
      return []
    }

    try {
      const cutoff = new Date(Date.now() - this.TTL)

      const devices = await prisma.device.findMany({
        where: {
          isActive: true,
          lastSeen: {
            gte: cutoff,
          },
          employee: {
            isActive: true,
          },
        },
        include: {
          employee: {
            select: {
              id: true,
              isActive: true,
            },
          },
        },
      })

      return devices.map((device) => {
        let currentApp = null
        if (device.currentApp) {
          try {
            currentApp = JSON.parse(device.currentApp)
          } catch (e) {
            console.warn("Failed to parse currentApp:", e)
          }
        }

        return {
          employeeId: device.employeeId,
          deviceId: device.id,
          status: device.isActive ? "online" : "offline",
          lastSeen: device.lastSeen || new Date(),
          currentApp,
        }
      })
    } catch (error) {
      console.error("Failed to get all presence from database:", error)
      this.isConnected = false
      return []
    }
  }

  async removePresence(deviceId: string) {
    if (!(await this.checkConnection())) {
      console.warn("Database not available, skipping presence removal")
      return
    }

    try {
      await prisma.device.update({
        where: { id: deviceId },
        data: {
          isActive: false,
          lastSeen: new Date(),
        },
      })
    } catch (error) {
      console.error("Failed to remove presence from database:", error)
      this.isConnected = false
    }
  }
}

class InMemoryStore {
  private readonly presence: Map<string, PresenceData> = new Map()
  private readonly TTL = 5 * 60 * 1000 // 5 minutes

  setPresence(deviceId: string, data: PresenceData) {
    this.presence.set(deviceId, {
      ...data,
      lastSeen: new Date(),
    })

    // Clean up expired entries
    this.cleanup()
  }

  getPresence(deviceId: string): PresenceData | null {
    const data = this.presence.get(deviceId)
    if (!data) return null

    // Check if expired
    if (Date.now() - data.lastSeen.getTime() > this.TTL) {
      this.presence.delete(deviceId)
      return null
    }

    return data
  }

  getAllPresence(): PresenceData[] {
    this.cleanup()
    return Array.from(this.presence.values())
  }

  removePresence(deviceId: string) {
    this.presence.delete(deviceId)
  }

  private cleanup() {
    const now = Date.now()
    const entries = Array.from(this.presence.entries())
    for (const [deviceId, data] of entries) {
      if (now - data.lastSeen.getTime() > this.TTL) {
        this.presence.delete(deviceId)
      }
    }
  }
}

class RedisStore {
  private redis: any = null // eslint-disable-line @typescript-eslint/no-explicit-any
  private readonly fallback = new DatabaseStore()
  private readonly inMemoryFallback = new InMemoryStore()

  private constructor() {
    // Constructor stays synchronous
  }

  /**
   * Factory method to create and initialize the RedisStore asynchronously.
   */
  static async create(): Promise<RedisStore> {
    const instance = new RedisStore()
    await instance.initRedis()
    return instance
  }

  private async initRedis() {
    try {
      const redisUrl = process.env.REDIS_URL
      if (!redisUrl) {
        console.log("No REDIS_URL found, using in-memory store")
        return
      }

      // Dynamic import to avoid requiring Redis if not available
      const { createClient } = await import("redis")
      this.redis = createClient({ url: redisUrl })

      await this.redis.connect()
      console.log("Connected to Redis for real-time data")
    } catch (error) {
      console.log("Redis not available, using in-memory store:", error)
      this.redis = null
    }
  }

  async setPresence(deviceId: string, data: PresenceData) {
    if (this.redis) {
      try {
        await this.redis.setEx(
          `presence:${deviceId}`,
          300, // 5 minutes TTL
          JSON.stringify(data)
        )
        // Also store in database for persistence
        await this.fallback.setPresence(deviceId, data)
        return
      } catch (error) {
        console.error("Redis error, falling back to in-memory:", error)
      }
    }

    // Fallback to in-memory store
    this.inMemoryFallback.setPresence(deviceId, data)
    // Also try to store in database
    await this.fallback.setPresence(deviceId, data)
  }

  async getPresence(deviceId: string): Promise<PresenceData | null> {
    if (this.redis) {
      try {
        const data = await this.redis.get(`presence:${deviceId}`)
        if (data) {
          return JSON.parse(data)
        }
      } catch (error) {
        console.error("Redis error, falling back to in-memory:", error)
      }
    }

    // Try in-memory store first
    const inMemoryData = this.inMemoryFallback.getPresence(deviceId)
    if (inMemoryData) {
      return inMemoryData
    }

    // Fallback to database
    return this.fallback.getPresence(deviceId)
  }

  async getAllPresence(): Promise<PresenceData[]> {
    if (this.redis) {
      try {
        const keys = await this.redis.keys("presence:*")
        const data = await Promise.all(
          keys.map(async (key: string) => {
            const value = await this.redis.get(key)
            return value ? JSON.parse(value) : null
          })
        )
        const redisData = data.filter(Boolean)
        if (redisData.length > 0) {
          return redisData
        }
      } catch (error) {
        console.error("Redis error, falling back to in-memory:", error)
      }
    }

    // Try in-memory store first
    const inMemoryData = this.inMemoryFallback.getAllPresence()
    if (inMemoryData.length > 0) {
      return inMemoryData
    }

    // Fallback to database
    return this.fallback.getAllPresence()
  }

  async removePresence(deviceId: string) {
    if (this.redis) {
      try {
        await this.redis.del(`presence:${deviceId}`)
      } catch (error) {
        console.error("Redis error, falling back to in-memory:", error)
      }
    }

    // Remove from in-memory store
    this.inMemoryFallback.removePresence(deviceId)
    // Also try to remove from database
    await this.fallback.removePresence(deviceId)
  }
}

// Global store instance
let realtimeStorePromise: Promise<RedisStore> | null = null

export function getRealtimeStore(): Promise<RedisStore> {
  realtimeStorePromise ??= RedisStore.create()
  return realtimeStorePromise
}
// export const realtimeStore = await RedisStore.create();

export type { PresenceData }
