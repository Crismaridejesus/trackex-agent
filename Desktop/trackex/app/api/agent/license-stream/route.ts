import { NextRequest } from "next/server"
import { requireDeviceAuth } from "@/lib/auth/device"
import {
  addLicenseConnection,
  removeLicenseConnection,
} from "@/lib/license-stream"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * SSE Endpoint for License Update Notifications
 *
 * Agents connect to this endpoint to receive real-time notifications
 * when their license status changes (renewed, expired, tier updated, etc.).
 *
 * This allows agents to immediately respond to license changes without
 * relying solely on periodic polling.
 *
 * Connection URL: /api/agent/license-stream
 * Authorization: Bearer {deviceToken}
 *
 * Events sent:
 * - { type: 'connected', timestamp: '...' } - Initial connection confirmation
 * - { type: 'keepalive', timestamp: '...' } - Periodic keepalive (every 30s)
 * - { type: 'license_updated' | 'license_expired' | 'license_renewed' | 'license_revoked', ... } - License status changes
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate device using device token
    const deviceAuth = await requireDeviceAuth(request)
    const employeeId = deviceAuth.device.employeeId
    const deviceName = deviceAuth.device.deviceName
    const platform = deviceAuth.device.platform

    console.log(
      `[License Stream] New SSE connection from ${platform} device "${deviceName}" for employee ${employeeId}`
    )

    let controller: ReadableStreamDefaultController<Uint8Array> | null = null
    let keepaliveInterval: NodeJS.Timeout | null = null

    const stream = new ReadableStream<Uint8Array>({
      start(ctrl) {
        controller = ctrl

        // Add to employee's connection set
        addLicenseConnection(employeeId, controller)

        // Send initial connection confirmation
        const initialData = `data: ${JSON.stringify({
          type: "connected",
          timestamp: new Date().toISOString(),
          employeeId: employeeId,
        })}\n\n`
        controller.enqueue(new TextEncoder().encode(initialData))

        // Send keepalive every 30 seconds to keep connection alive
        keepaliveInterval = setInterval(() => {
          try {
            const keepalive = `data: ${JSON.stringify({
              type: "keepalive",
              timestamp: new Date().toISOString(),
            })}\n\n`
            controller?.enqueue(new TextEncoder().encode(keepalive))
          } catch (e) {
            // Connection closed, cleanup will happen in cancel()
            if (keepaliveInterval) {
              clearInterval(keepaliveInterval)
            }
          }
        }, 30000)
      },

      cancel() {
        // Cleanup on disconnect
        if (keepaliveInterval) {
          clearInterval(keepaliveInterval)
        }
        if (controller) {
          removeLicenseConnection(employeeId, controller)
        }
        console.log(
          `[License Stream] SSE connection closed for employee ${employeeId} (${deviceName})`
        )
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    })
  } catch (error) {
    console.error("[License Stream] Authentication failed:", error)

    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message:
          error instanceof Error
            ? error.message
            : "Device authentication failed",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  }
}
