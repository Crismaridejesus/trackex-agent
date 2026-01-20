/**
 * License Stream Utilities
 *
 * Manages Server-Sent Events connections for real-time license status notifications
 * to TrackEx Agent instances. When an employee's license status changes (renewed,
 * expired, updated), connected agents are notified immediately.
 *
 * Uses globalThis to persist connections across module reloads in development
 * and within the same serverless function instance.
 */

// Use globalThis to persist connections across module reloads (like Prisma pattern)
const globalForLicenseStream = globalThis as unknown as {
  licenseConnections:
    | Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>
    | undefined
}

// Store active license SSE connections by employeeId - persisted via globalThis
export const licenseConnections =
  globalForLicenseStream.licenseConnections ??
  new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>()

// Always persist to globalThis to survive module reloads
globalForLicenseStream.licenseConnections = licenseConnections

export interface LicenseUpdateNotification {
  type:
    | "license_updated"
    | "license_expired"
    | "license_renewed"
    | "license_revoked"
  timestamp: string
  employeeId: string
  status?: string
  tier?: string
  expiresAt?: string | null
  valid?: boolean
  message?: string
}

/**
 * Broadcast a license update notification to a specific employee's connected agents
 * Called from license API routes or license management services when license status changes
 */
export function broadcastLicenseUpdate(
  employeeId: string,
  notification: LicenseUpdateNotification
) {
  const connections = licenseConnections.get(employeeId)

  if (!connections || connections.size === 0) {
    console.log(
      `[License Stream] No connected agents for employee ${employeeId}`
    )
    return
  }

  const message = `data: ${JSON.stringify(notification)}\n\n`
  const encoded = new TextEncoder().encode(message)

  const deadConnections: ReadableStreamDefaultController<Uint8Array>[] = []

  console.log(
    `[License Stream] Broadcasting to ${connections.size} agent(s) for employee ${employeeId}...`
  )

  for (const controller of connections) {
    try {
      controller.enqueue(encoded)
    } catch (e) {
      // Connection may be closed, mark for removal
      deadConnections.push(controller)
    }
  }

  // Clean up dead connections
  for (const controller of deadConnections) {
    connections.delete(controller)
  }

  // Remove empty connection sets
  if (connections.size === 0) {
    licenseConnections.delete(employeeId)
  }

  console.log(
    `[License Stream] Broadcast complete for employee ${employeeId}. Active connections: ${connections.size}, Type: ${notification.type}`
  )
}

/**
 * Add a new license stream connection for an employee
 */
export function addLicenseConnection(
  employeeId: string,
  controller: ReadableStreamDefaultController<Uint8Array>
) {
  if (!licenseConnections.has(employeeId)) {
    licenseConnections.set(employeeId, new Set())
  }

  const connections = licenseConnections.get(employeeId)!
  connections.add(controller)

  console.log(
    `[License Stream] Agent connected for employee ${employeeId}. Total connections for this employee: ${connections.size}`
  )
}

/**
 * Remove a license stream connection for an employee
 */
export function removeLicenseConnection(
  employeeId: string,
  controller: ReadableStreamDefaultController<Uint8Array>
) {
  const connections = licenseConnections.get(employeeId)

  if (connections) {
    connections.delete(controller)

    // Remove empty connection sets
    if (connections.size === 0) {
      licenseConnections.delete(employeeId)
    }

    console.log(
      `[License Stream] Agent disconnected for employee ${employeeId}. Remaining connections for this employee: ${connections.size}`
    )
  }
}

/**
 * Get current connection count for an employee (for debugging)
 */
export function getEmployeeConnectionCount(employeeId: string): number {
  return licenseConnections.get(employeeId)?.size || 0
}

/**
 * Get total connection count across all employees (for debugging)
 */
export function getTotalConnectionCount(): number {
  let total = 0
  for (const connections of licenseConnections.values()) {
    total += connections.size
  }
  return total
}
