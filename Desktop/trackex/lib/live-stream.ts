/**
 * Live Stream Utilities
 *
 * Manages Server-Sent Events connections for real-time updates
 * in the Live View dashboard.
 */

// Store active connections for broadcasting
export const connections = new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>();

/**
 * Broadcast an update to all connected clients for a team
 * Can be called from other API routes when data changes
 */
export function broadcastUpdate(teamId: string, data: any) {
  const teamConnections = connections.get(teamId);
  const allConnections = connections.get("all");

  const message = `data: ${JSON.stringify({ type: "update", ...data })}\n\n`;
  const encoded = new TextEncoder().encode(message);

  // Send to specific team connections
  if (teamConnections) {
    for (const controller of teamConnections) {
      try {
        controller.enqueue(encoded);
      } catch (e) {
        // Connection may be closed
        teamConnections.delete(controller);
      }
    }
  }

  // Send to "all teams" connections
  if (allConnections && teamId !== "all") {
    for (const controller of allConnections) {
      try {
        controller.enqueue(encoded);
      } catch (e) {
        allConnections.delete(controller);
      }
    }
  }
}
