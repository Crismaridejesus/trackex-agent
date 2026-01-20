/**
 * License Listener - Real-time License Status Handler
 * 
 * Connects to the server's SSE endpoint to receive real-time notifications
 * when the employee's license status changes (activated, revoked, expired).
 * This allows the agent to immediately respond to license changes without polling.
 */

import { invoke } from "@tauri-apps/api/core";

export interface LicenseNotification {
  type: 'connected' | 'heartbeat' | 'license_updated' | 'license_expired' | 'license_renewed' | 'license_revoked';
  timestamp: string;
  employeeId?: string;
  status?: string;
  valid?: boolean;
  tier?: string;
  expiresAt?: string | null;
  message?: string;
}

type LicenseListener = (notification: LicenseNotification) => void;

// Singleton connection management
let eventSource: EventSource | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 60000; // 1 minute

const listeners: Set<LicenseListener> = new Set();

// Cache the device token to avoid repeated Tauri invokes
let cachedToken: string | null = null;

interface DeviceTokenResponse {
  device_token: string | null;
  server_url: string | null;
}

/**
 * Get the device token from Tauri backend
 */
async function getDeviceToken(): Promise<string | null> {
  if (cachedToken) {
    return cachedToken;
  }
  
  try {
    // Get device token from Tauri backend
    const response = await invoke<DeviceTokenResponse>('get_device_token');
    cachedToken = response.device_token || null;
    return cachedToken;
  } catch (err) {
    console.error('[LicenseListener] Failed to get device token:', err);
    return null;
  }
}

/**
 * Clear cached token (call on logout)
 */
export function clearCachedToken(): void {
  cachedToken = null;
}

/**
 * Get the SSE endpoint URL with token for authentication
 */
async function getSSEEndpoint(): Promise<string | null> {
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
  const token = await getDeviceToken();
  
  if (!token) {
    console.warn('[LicenseListener] No device token available');
    return null;
  }
  
  const endpoint = `${serverUrl}/api/desktop/license-stream?token=${encodeURIComponent(token)}`;
  console.log(`[LicenseListener] Using SSE endpoint: ${serverUrl}/api/desktop/license-stream`);
  return endpoint;
}

/**
 * Connect to the license notification SSE stream
 */
export async function connectToLicenseStream(): Promise<void> {
  if (eventSource?.readyState === EventSource.OPEN) {
    console.log('[LicenseListener] Already connected to license stream');
    return;
  }

  // Close any existing connection
  disconnectFromLicenseStream();

  const url = await getSSEEndpoint();
  if (!url) {
    console.warn('[LicenseListener] Cannot connect - no device token');
    scheduleReconnect();
    return;
  }
  
  console.log('[LicenseListener] Connecting to license stream...');

  try {
    eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log('[LicenseListener] Connected to license stream');
      reconnectAttempts = 0; // Reset on successful connection
    };

    eventSource.onmessage = (event) => {
      try {
        const notification: LicenseNotification = JSON.parse(event.data);
        console.log('[LicenseListener] Received notification:', notification.type);

        // Notify all registered listeners
        for (const listener of listeners) {
          try {
            listener(notification);
          } catch (err) {
            console.error('[LicenseListener] Error in listener callback:', err);
          }
        }
      } catch (err) {
        console.error('[LicenseListener] Failed to parse notification:', err);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[LicenseListener] Connection error:', error);
      
      // Close the errored connection
      eventSource?.close();
      eventSource = null;

      // Schedule reconnection with exponential backoff
      scheduleReconnect();
    };
  } catch (err) {
    console.error('[LicenseListener] Failed to create EventSource:', err);
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
    console.warn('[LicenseListener] Max reconnect attempts reached, giving up');
    return;
  }

  // Exponential backoff with jitter
  const delay = Math.min(
    BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts) + Math.random() * 1000,
    MAX_RECONNECT_DELAY
  );

  reconnectAttempts++;
  console.log(`[LicenseListener] Scheduling reconnect attempt ${reconnectAttempts} in ${Math.round(delay)}ms`);

  reconnectTimeout = setTimeout(() => {
    connectToLicenseStream();
  }, delay);
}

/**
 * Disconnect from the license notification stream
 */
export function disconnectFromLicenseStream(): void {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (eventSource) {
    console.log('[LicenseListener] Disconnecting from license stream');
    eventSource.close();
    eventSource = null;
  }

  reconnectAttempts = 0;
}

/**
 * Register a listener for license notifications
 */
export function addLicenseListener(listener: LicenseListener): () => void {
  listeners.add(listener);
  console.log(`[LicenseListener] Added listener. Total: ${listeners.size}`);
  
  // Return unsubscribe function
  return () => {
    listeners.delete(listener);
    console.log(`[LicenseListener] Removed listener. Total: ${listeners.size}`);
  };
}

/**
 * Check if currently connected to the license stream
 */
export function isConnectedToLicenseStream(): boolean {
  return eventSource?.readyState === EventSource.OPEN;
}

/**
 * Get current connection state
 */
export function getLicenseConnectionState(): 'disconnected' | 'connecting' | 'connected' {
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

/**
 * Reset reconnection attempts (call when user manually triggers reconnect)
 */
export function resetReconnectAttempts(): void {
  reconnectAttempts = 0;
}
