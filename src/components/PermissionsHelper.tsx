import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface PermissionsStatus {
  screen_recording: boolean;
  accessibility: boolean;
}

interface PermissionsHelperProps {
  permissionsStatus: PermissionsStatus;
  onPermissionsGranted: () => void;
}

function PermissionsHelper({ permissionsStatus, onPermissionsGranted }: PermissionsHelperProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasStartedSetup, setHasStartedSetup] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState<string>("macos");

  useEffect(() => {
    const getPlatform = async () => {
      try {
        // Get platform from the app info command
        const appInfo = await invoke<{ platform: string }>("get_app_info");
        setCurrentPlatform(appInfo.platform);
      } catch (error) {
        console.error("Failed to get platform:", error);
        // Default to macos if detection fails
        setCurrentPlatform("macos");
      }
    };
    getPlatform();
  }, []);

  const handleStartPermissionSetup = async () => {
    setHasStartedSetup(true);
    setIsRequesting(true);
    
    try {
      // First, trigger the actual permission dialog by attempting a screenshot
      // This is more reliable on macOS than ScreenCaptureAccess.request()
      await invoke("trigger_screen_permission_dialog");
      
      // Then call the standard permission request
      await invoke("request_permissions");
      
      // Give user time to respond to the system dialog
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if permission was actually granted
      const newStatus = await invoke<PermissionsStatus>("get_permissions_status");
      
      if (newStatus.screen_recording) {
        // Success! Permission was granted, proceed to main app
        onPermissionsGranted();
      } else {
        // Permission not granted - show manual fallback instructions
        setIsRequesting(false);
      }
    } catch (error) {
      console.error("Failed to request permissions:", error);
      // On error, show manual fallback
      setIsRequesting(false);
    }
  };

  const handleRetryPermissions = () => {
    setHasStartedSetup(false);
    setIsRequesting(false);
  };

  // If permissions are still not granted after setup attempt
  if (hasStartedSetup && !permissionsStatus.screen_recording && !isRequesting) {
    return (
      <div className="permissions-container">
        <div className="permissions-helper">
          <div className="permissions-header">
            <h1>Manual Permission Setup Needed</h1>
            <p>The automatic permission setup didn't complete. Please enable it manually:</p>
          </div>

          <div className="permissions-instructions">
            <h3>Step-by-Step Instructions:</h3>
            <ol>
              <li>Open <strong>System Preferences</strong> (or <strong>System Settings</strong> on newer macOS)</li>
              <li>Go to <strong>Security & Privacy</strong> → <strong>Privacy</strong> tab</li>
              <li>Click <strong>Screen Recording</strong> from the left sidebar</li>
              <li>Click the <strong>🔒 lock icon</strong> and <strong>enter your password</strong> to make changes</li>
              <li>Find and <strong>check the box</strong> next to <strong>TrackEx</strong> or <strong>trackex</strong></li>
              <li><strong>Quit and restart</strong> the TrackEx app completely</li>
            </ol>
          </div>

          <div className="permissions-blocked">
            <div className="permission-status">
              <div className="permission-text">
                <h3>Screen Recording: Not Enabled</h3>
                <p>Required for work activity tracking</p>
              </div>
            </div>
          </div>

          <div className="permissions-actions">
            <button
              onClick={handleRetryPermissions}
              className="request-permissions-button secondary"
            >
              ← Try Automatic Setup Again
            </button>
          </div>

          <div className="permissions-footer">
            <p>💡 <strong>Tip:</strong> {currentPlatform === "macos" ? "You may need to enter your macOS password to grant this permission" : "Administrator privileges may be required to grant this permission"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="permissions-container">
      <div className="permissions-helper">
        <div className="permissions-header">
          <h1>Final Setup Step</h1>
          <p>Almost there! Now let's enable work tracking permissions.</p>
        </div>

        <div className="permissions-explanation">
          <div className="permission-preview">
            <div className="permission-icon">🖥️</div>
            <div className="permission-text">
              <h3>What happens next:</h3>
              <p>
                {currentPlatform === "macos" 
                  ? "macOS will ask you to grant Screen Recording permission for work activity tracking. You may need to enter your macOS password." 
                  : "Your system will ask you to grant screen monitoring permission for work activity tracking."}
              </p>
              <p style={{ marginTop: '10px' }}>After granting permission, <strong>restart the app</strong> and you're all set!</p>
            </div>
          </div>
        </div>

        <div className="permissions-benefits">
          <h3>Once enabled, TrackEx will:</h3>
          <ul>
            <li>Automatically track your work sessions</li>
            <li>Monitor application usage for productivity insights</li>
            <li>Capture work activity when needed</li>
            <li>Remember your login credentials</li>
          </ul>
        </div>

        <div className="permissions-actions">
          {isRequesting ? (
            <div className="requesting-permissions">
              <div className="loading-spinner"></div>
              <p>Requesting permission from {currentPlatform === "macos" ? "macOS" : "your system"}...</p>
              <p style={{ fontSize: '0.9em', marginTop: '8px', opacity: 0.8 }}>You may see a system dialog - please grant the permission</p>
            </div>
          ) : (
            <button
              onClick={handleStartPermissionSetup}
              className="request-permissions-button primary large"
            >
              Enable Work Tracking
            </button>
          )}
        </div>

        <div className="permissions-footer">
          <p>This permission is required for TrackEx to function properly</p>
        </div>
      </div>
    </div>
  );
}

export default PermissionsHelper;