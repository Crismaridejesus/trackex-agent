import { authenticateDevice } from "@/lib/auth/device"
import { NextRequest, NextResponse } from "next/server"
import {
  addLicenseConnection,
  removeLicenseConnection,
} from "@/lib/license-stream"
import { getLicenseStatus } from "@/lib/licensing"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * SSE Endpoint for License Status Notifications
 *
 * Agents connect to this endpoint to receive real-time notifications
 * when their license status changes (activated, revoked, expired, etc).
 *
 * Requires device authentication via:
 * - Authorization header (Bearer token) - preferred
 * - Query parameter (?token=xxx) - for EventSource which can't send headers
 *
 * Connection URL: /api/desktop/license-stream?token=<device_token>
 *
 * Events sent:
 * - { type: 'connected', timestamp: '...' } - Initial connection confirmation with current license status
 * - { type: 'heartbeat', timestamp: '...' } - Periodic keepalive (every 30s)
 * - { type: 'license_updated' | 'license_expired' | 'license_renewed' | 'license_revoked', ... } - License change notifications
 */
export async function GET(request: NextRequest) {
  try {
    // Check for token in query parameter (for EventSource which can't send headers)
    const tokenFromQuery = request.nextUrl.searchParams.get("token")
    
    // Create a modified request with the token as Authorization header if provided via query
    let authRequest = request
    if (tokenFromQuery && !request.headers.get("authorization")) {
      // Create new headers with Authorization
      const newHeaders = new Headers(request.headers)
      newHeaders.set("Authorization", `Bearer ${tokenFromQuery}`)
      authRequest = new NextRequest(request.url, {
        headers: newHeaders,
        method: request.method,
      })
    }
    
    // Authenticate the device and get employee info
    const deviceAuth = await authenticateDevice(authRequest)
    const employeeId = deviceAuth.device.employeeId

    console.log(
      `[License Stream] New SSE connection from employee ${employeeId}`
    )

    // Get current license status to send on connection
    const licenseStatus = await getLicenseStatus(employeeId)

    let controller: ReadableStreamDefaultController<Uint8Array> | null = null
    let heartbeatInterval: NodeJS.Timeout | null = null

    const stream = new ReadableStream<Uint8Array>({
      start(ctrl) {
        try {
          controller = ctrl

          // Add to broadcast set for this employee
          addLicenseConnection(employeeId, controller)

          // Send initial connection confirmation with current license status
          const initialData = `data: ${JSON.stringify({
            type: "connected",
            timestamp: new Date().toISOString(),
            employeeId,
            status: licenseStatus.status,
            valid: licenseStatus.valid,
            tier: licenseStatus.tier,
            expiresAt: licenseStatus.expiresAt,
            message: licenseStatus.message,
          })}\n\n`
          controller.enqueue(new TextEncoder().encode(initialData))

          // Send heartbeat every 30 seconds to keep connection alive
          heartbeatInterval = setInterval(() => {
            try {
              const heartbeat = `data: ${JSON.stringify({
                type: "heartbeat",
                timestamp: new Date().toISOString(),
              })}\n\n`
              controller?.enqueue(new TextEncoder().encode(heartbeat))
            } catch (e) {
              console.error("[License Stream] Error sending heartbeat:", e)
              // Connection closed, cleanup will happen in cancel()
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval)
              }
            }
          }, 30000)
        } catch (error) {
          console.error("[License Stream] Error in stream start:", error)
          throw error
        }
      },

      cancel() {
        // Cleanup on disconnect
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
        }
        if (controller) {
          removeLicenseConnection(employeeId, controller)
        }
        console.log(
          `[License Stream] Client disconnected for employee ${employeeId}`
        )
      },
    })

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (error) {
    console.error("[License Stream] Authentication failed:", error)

    // Return appropriate error based on authentication failure
    if (error instanceof Error) {
      if (
        error.message.includes("authentication") ||
        error.message.includes("Authorization")
      ) {
        return NextResponse.json(
          { error: "Device authentication required" },
          { status: 401 }
        )
      }
    }

    return NextResponse.json(
      { error: "Failed to establish license stream" },
      { status: 500 }
    )
  }
}
