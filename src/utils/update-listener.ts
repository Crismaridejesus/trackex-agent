/**
 * Update Listener - Real-time Update Notification Handler
 * 
 * Connects to the server's SSE endpoint to receive real-time notifications
 * when agent versions are created, updated, or deleted. This allows agents
 * to immediately check for mandatory updates without waiting for the next
 * polling interval.
 */

export interface UpdateNotification {
  type: 'connected' | 'heartbeat' | 'version_update' | 'version_created' | 'version_deleted';
  timestamp: string;
  platform?: string;
  arch?: string;
  version?: string;
  mandatory?: boolean;
}

type UpdateListener = (notification: UpdateNotification) => void;

// Singleton connection management
let eventSource: EventSource | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 60000; // 1 minute

const listeners: Set<UpdateListener> = new Set();

/**
 * Get the appropriate SSE endpoint URL based on environment
 * 
 * Uses VITE_SERVER_URL from .env.local for consistency with other API calls
 */
function getSSEEndpoint(): string {
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
  const endpoint = `${serverUrl}/api/desktop/update-notifications`;
  console.log(`[UpdateListener] Using SSE endpoint: ${endpoint}`);
  return endpoint;
}

/**
 * Connect to the update notification SSE stream
 */
export function connectToUpdateStream(): void {
  if (eventSource?.readyState === EventSource.OPEN) {
    console.log('[UpdateListener] Already connected to update stream');
    return;
  }

  // Close any existing connection
  disconnectFromUpdateStream();

  const url = getSSEEndpoint();
  console.log(`[UpdateListener] Connecting to update stream: ${url}`);

  try {
    eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log('[UpdateListener] Connected to update stream');
      reconnectAttempts = 0; // Reset on successful connection
    };

    eventSource.onmessage = (event) => {
      try {
        const notification: UpdateNotification = JSON.parse(event.data);
        console.log('[UpdateListener] Received notification:', notification.type);

        // Notify all registered listeners
        for (const listener of listeners) {
          try {
            listener(notification);
          } catch (err) {
            console.error('[UpdateListener] Error in listener callback:', err);
          }
        }
      } catch (err) {
        console.error('[UpdateListener] Failed to parse notification:', err);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[UpdateListener] Connection error:', error);
      
      // Close the errored connection
      eventSource?.close();
      eventSource = null;

      // Schedule reconnection with exponential backoff
      scheduleReconnect();
    };
  } catch (err) {
    console.error('[UpdateListener] Failed to create EventSource:', err);
    scheduleReconnect();
  }
}

/**
 * Schedule a reconnection attempt with exponential backoff
 */
function scheduleReconnect(): void {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn('[UpdateListener] Max reconnect attempts reached, giving up');
    return;
  }

  // Exponential backoff with jitter
  const delay = Math.min(
    BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts) + Math.random() * 1000,
    MAX_RECONNECT_DELAY
  );

  reconnectAttempts++;
  console.log(`[UpdateListener] Scheduling reconnect attempt ${reconnectAttempts} in ${Math.round(delay)}ms`);

  reconnectTimeout = setTimeout(() => {
    connectToUpdateStream();
  }, delay);
}

/**
 * Disconnect from the update notification stream
 */
export function disconnectFromUpdateStream(): void {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (eventSource) {
    console.log('[UpdateListener] Disconnecting from update stream');
    eventSource.close();
    eventSource = null;
  }

  reconnectAttempts = 0;
}

/**
 * Register a listener for update notifications
 */
export function addUpdateListener(listener: UpdateListener): () => void {
  listeners.add(listener);
  console.log(`[UpdateListener] Added listener. Total: ${listeners.size}`);
  
  // Return unsubscribe function
  return () => {
    listeners.delete(listener);
    console.log(`[UpdateListener] Removed listener. Total: ${listeners.size}`);
  };
}

/**
 * Check if currently connected to the update stream
 */
export function isConnectedToUpdateStream(): boolean {
  return eventSource?.readyState === EventSource.OPEN;
}

/**
 * Get current connection state
 */
export function getConnectionState(): 'disconnected' | 'connecting' | 'connected' {
  if (!eventSource) return 'disconnected';
  switch (eventSource.readyState) {
    case EventSource.CONNECTING:
      return 'connecting';
    case EventSource.OPEN:
      return 'connected';
    default:
      return 'disconnected';
  }
}
