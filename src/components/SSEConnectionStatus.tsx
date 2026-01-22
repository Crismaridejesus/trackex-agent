import { useState, useEffect } from "react";
import { getConnectionState } from "../utils/update-listener";
import "./SSEConnectionStatus.css";

/**
 * SSE Connection Status Indicator
 * 
 * Displays the current connection state of the update notification SSE stream.
 * Shows a warning when disconnected so users know real-time updates aren't working.
 */
export function SSEConnectionStatus() {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Check connection state every 5 seconds
    const checkStatus = () => {
      const currentStatus = getConnectionState();
      setStatus(currentStatus);
      
      // Show warning if disconnected for more than 10 seconds
      if (currentStatus !== 'connected') {
        setTimeout(() => {
          if (getConnectionState() !== 'connected') {
            setShowWarning(true);
          }
        }, 10000);
      } else {
        setShowWarning(false);
      }
    };

    checkStatus(); // Initial check
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  // Don't show anything if connected
  if (status === 'connected' && !showWarning) {
    return null;
  }

  // Only show warning if disconnected for a while
  if (!showWarning) {
    return null;
  }

  return (
    <div className="sse-status-warning">
      <span className="warning-icon">⚠️</span>
      <span className="warning-text">
        Update notifications offline (falling back to 30-min checks)
      </span>
      <span className="status-indicator" data-status={status}>
        {status === 'connecting' ? '🔄' : '⭕'}
      </span>
    </div>
  );
}
