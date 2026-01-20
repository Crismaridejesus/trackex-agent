import { NextRequest } from "next/server"
import {
  addAgentConnection,
  removeAgentConnection,
} from "@/lib/agent-update-stream"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * SSE Endpoint for Agent Update Notifications
 *
 * Agents connect to this endpoint to receive real-time notifications
 * when new versions are published or existing versions are modified.
 *
 * This allows agents to immediately check for mandatory updates
 * without relying solely on polling.
 *
 * Connection URL: /api/desktop/update-notifications
 *
 * Events sent:
 * - { type: 'connected', timestamp: '...' } - Initial connection confirmation
 * - { type: 'heartbeat', timestamp: '...' } - Periodic keepalive (every 30s)
 * - { type: 'version_update' | 'version_created' | 'version_deleted', ... } - Update notifications
 */
export async function GET(request: NextRequest) {
  try {
    // Extract agent info from headers for logging
    const userAgent = request.headers.get("user-agent") || "unknown"
    const platform = userAgent.includes("Windows")
      ? "windows"
      : userAgent.includes("Mac")
        ? "darwin"
        : "unknown"

    console.log(`[Agent Update Stream] New SSE connection from ${platform} agent`)

    let controller: ReadableStreamDefaultController<Uint8Array> | null = null
    let heartbeatInterval: NodeJS.Timeout | null = null

    const stream = new ReadableStream<Uint8Array>({
      start(ctrl) {
        try {
          controller = ctrl

          // Add to broadcast set
          addAgentConnection(controller)

          // Send initial connection confirmation
          const initialData = `data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`
          controller.enqueue(new TextEncoder().encode(initialData))

          // Send heartbeat every 30 seconds to keep connection alive
          heartbeatInterval = setInterval(() => {
            try {
              const heartbeat = `data: ${JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() })}\n\n`
              controller?.enqueue(new TextEncoder().encode(heartbeat))
            } catch (e) {
              console.error("[Agent Update Stream] Error sending heartbeat:", e)
              // Connection closed, cleanup will happen in cancel()
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval)
              }
            }
          }, 30000)
        } catch (error) {
          console.error("[Agent Update Stream] Error in stream start:", error)
          throw error
        }
      },

      cancel() {
        // Cleanup on disconnect
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
        }
        if (controller) {
          removeAgentConnection(controller)
        }
        console.log(
          `[Agent Update Stream] SSE connection closed for ${platform} agent`
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
    console.error("[Agent Update Stream] Failed to establish SSE connection:", error)
    
    return new Response(
      JSON.stringify({
        error: "Failed to establish update notification stream",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
