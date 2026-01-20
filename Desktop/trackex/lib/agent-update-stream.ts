/**
 * Agent Update Stream Utilities
 *
 * Manages Server-Sent Events connections for real-time update notifications
 * to TrackEx Agent instances. When agent versions are created/updated/deleted,
 * connected agents are notified to check for updates.
 * 
 * Uses globalThis to persist connections across module reloads in development
 * and within the same serverless function instance.
 */

// Use globalThis to persist connections across module reloads (like Prisma pattern)
const globalForAgentStream = globalThis as unknown as {
  agentConnections: Set<ReadableStreamDefaultController<Uint8Array>> | undefined
}

// Store active agent SSE connections - persisted via globalThis
export const agentConnections = 
  globalForAgentStream.agentConnections ?? 
  new Set<ReadableStreamDefaultController<Uint8Array>>();

// Always persist to globalThis to survive module reloads
globalForAgentStream.agentConnections = agentConnections;

export interface AgentUpdateNotification {
  type: 'version_update' | 'version_created' | 'version_deleted';
  timestamp: string;
  platform?: string;
  arch?: string;
  version?: string;
  mandatory?: boolean;
}

/**
 * Broadcast an update notification to all connected agents
 * Called from agent-versions API routes when data changes
 */
export function broadcastAgentUpdateNotification(notification: AgentUpdateNotification) {
  const message = `data: ${JSON.stringify(notification)}\n\n`;
  const encoded = new TextEncoder().encode(message);

  const deadConnections: ReadableStreamDefaultController<Uint8Array>[] = [];
  
  console.log(`[Agent Update Stream] Broadcasting to ${agentConnections.size} connected agents...`);

  for (const controller of agentConnections) {
    try {
      controller.enqueue(encoded);
    } catch (e) {
      // Connection may be closed, mark for removal
      deadConnections.push(controller);
    }
  }

  // Clean up dead connections
  for (const controller of deadConnections) {
    agentConnections.delete(controller);
  }

  console.log(`[Agent Update Stream] Broadcast complete. Active connections: ${agentConnections.size}, Type: ${notification.type}`);
}

/**
 * Add a new agent connection to the broadcast set
 */
export function addAgentConnection(controller: ReadableStreamDefaultController<Uint8Array>) {
  agentConnections.add(controller);
  console.log(`[Agent Update Stream] Agent connected. Total connections: ${agentConnections.size}`);
}

/**
 * Remove an agent connection from the broadcast set
 */
export function removeAgentConnection(controller: ReadableStreamDefaultController<Uint8Array>) {
  agentConnections.delete(controller);
  console.log(`[Agent Update Stream] Agent disconnected. Total connections: ${agentConnections.size}`);
}

/**
 * Get current connection count (for debugging)
 */
export function getConnectionCount(): number {
  return agentConnections.size;
}
