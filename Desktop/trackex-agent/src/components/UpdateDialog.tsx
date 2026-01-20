import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { 
  connectToUpdateStream, 
  disconnectFromUpdateStream, 
  addUpdateListener,
  type UpdateNotification 
} from "../utils/update-listener";
import "./UpdateDialog.css";

interface UpdateInfo {
  available: boolean;
  version?: string;
  notes?: string;
  current_version: string;
  release_date?: string;
  mandatory?: boolean;
  error?: string;
  diagnostic_info?: string;
}

interface UpdateProgress {
  downloaded: number;
  total: number;
  percentage: number;
}

interface UpdateDialogProps {
  /** Whether to show the dialog automatically when an update is found */
  autoCheck?: boolean;
  /** Callback when user dismisses the update dialog */
  onDismiss?: () => void;
}

type UpdateState = "idle" | "checking" | "available" | "downloading" | "error" | "mandatory-blocked";

function UpdateDialog({ autoCheck = true, onDismiss }: Readonly<UpdateDialogProps>) {
  const [state, setState] = useState<UpdateState>("idle");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [error, setError] = useState<string>("");
  const [dismissed, setDismissed] = useState(false);

  // Check if current update is mandatory
  const isMandatory = updateInfo?.mandatory === true;

  const checkForUpdates = useCallback(async () => {
    setState("checking");
    setError("");

    try {
      const info = await invoke<UpdateInfo>("check_for_updates");
      setUpdateInfo(info);

      // Check if there's an error in the response
      if (info.error) {
        setError(info.diagnostic_info || info.error);
        setState("error");
      } else if (info.available) {
        // If mandatory, auto-start download immediately
        if (info.mandatory) {
          console.log("[UpdateDialog] Mandatory update detected, auto-starting download...");
          setState("downloading");
          setProgress({ downloaded: 0, total: 0, percentage: 0 });
          try {
            await invoke("install_update");
          } catch (err) {
            console.error("Failed to auto-install mandatory update:", err);
            setError(err as string);
            setState("error");
          }
        } else {
          setState("available");
        }
      } else {
        setState("idle");
      }
    } catch (err) {
      console.error("Failed to check for updates:", err);
      setError(err as string);
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (autoCheck) {
      // Check for updates on mount
      checkForUpdates();

      // Check more frequently for mandatory updates (every 30 minutes)
      // This ensures users can't indefinitely avoid mandatory updates
      const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [autoCheck, checkForUpdates]);

  // Real-time update notification listener (SSE)
  useEffect(() => {
    // Connect to SSE stream for real-time notifications
    connectToUpdateStream();

    // Handle incoming notifications
    const unsubscribe = addUpdateListener((notification: UpdateNotification) => {
      console.log("[UpdateDialog] Received real-time notification:", notification.type);

      // React to version changes by checking for updates
      if (
        notification.type === 'version_created' ||
        notification.type === 'version_update'
      ) {
        // If it's a mandatory update notification, check immediately
        if (notification.mandatory) {
          console.log("[UpdateDialog] Mandatory update notification received, checking immediately...");
        }
        // Always re-check for updates when notified
        checkForUpdates();
      }
    });

    return () => {
      unsubscribe();
      disconnectFromUpdateStream();
    };
  }, [checkForUpdates]);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    // Listen for progress events from the Rust backend
    const setupListener = async () => {
      unlisten = await listen<UpdateProgress>("update-progress", (event) => {
        setProgress(event.payload);
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  const handleInstall = async () => {
    setState("downloading");
    setProgress({ downloaded: 0, total: 0, percentage: 0 });
    setError("");

    try {
      await invoke("install_update");
      // If we get here without error, the app will restart
    } catch (err) {
      console.error("Failed to install update:", err);
      setError(err as string);
      setState("error");
    }
  };

  const handleDismiss = () => {
    // Block dismissal for mandatory updates
    if (isMandatory) {
      console.log("[UpdateDialog] Cannot dismiss mandatory update");
      return;
    }
    setDismissed(true);
    onDismiss?.();
  };

  const handleRetry = () => {
    checkForUpdates();
  };

  // Don't render anything if dismissed (but not for mandatory) or no update available
  // Mandatory updates cannot be dismissed
  if ((dismissed && !isMandatory) || state === "idle") {
    return null;
  }

  // Error state
  if (state === "error") {
    const isInstallError = error.includes("403") || error.includes("404") || error.includes("Download");
    const title = isInstallError ? "Update Installation Failed" : "Update Check Failed";
    
    return (
      <div className={`update-dialog-overlay ${isMandatory ? 'mandatory' : ''}`}>
        <div className="update-dialog">
          <div className="update-dialog-header">
            <span className="update-icon error">!</span>
            <h2>{title}</h2>
          </div>
          <div className="update-dialog-body">
            {isMandatory && (
              <div className="mandatory-banner">
                ⚠️ This is a required update. The app cannot be used until updated.
              </div>
            )}
            <p className="error-message">{error}</p>
            {updateInfo?.current_version && (
              <p className="update-note">
                Current version: {updateInfo.current_version}
              </p>
            )}
            {isInstallError && (
              <p className="update-note" style={{ marginTop: '10px', fontSize: '0.9em', opacity: 0.8 }}>
                💡 For development testing: Update check works, but installation requires real release files uploaded to a CDN.
              </p>
            )}
          </div>
          <div className="update-dialog-actions">
            {/* Only show Dismiss button for non-mandatory updates */}
            {!isMandatory && (
              <button className="update-btn secondary" onClick={handleDismiss}>
                Dismiss
              </button>
            )}
            <button className="update-btn primary" onClick={handleRetry}>
              Retry Update
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Checking state - show small indicator
  if (state === "checking") {
    return (
      <div className="update-checking">
        <div className="update-spinner-small"></div>
        <span>Checking for updates...</span>
      </div>
    );
  }

  // Downloading state
  if (state === "downloading") {
    return (
      <div className={`update-dialog-overlay ${isMandatory ? 'mandatory' : ''}`}>
        <div className="update-dialog">
          <div className="update-dialog-header">
            <span className="update-icon">↓</span>
            <h2>{isMandatory ? 'Installing Required Update' : 'Installing Update'}</h2>
          </div>
          <div className="update-dialog-body">
            {isMandatory && (
              <div className="mandatory-banner">
                ⚠️ This is a required update. Please wait while it installs.
              </div>
            )}
            <p>
              Downloading version {updateInfo?.version}...
            </p>
            <div className="update-progress">
              <div
                className="update-progress-bar"
                style={{ width: `${progress?.percentage || 0}%` }}
              />
            </div>
            <p className="update-progress-text">
              {progress?.percentage || 0}%
              {progress?.total ? ` (${formatBytes(progress.downloaded)} / ${formatBytes(progress.total)})` : ""}
            </p>
            <p className="update-note">
              The app will restart automatically when ready.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Update available state
  if (state === "available" && updateInfo) {
    return (
      <div className={`update-dialog-overlay ${isMandatory ? 'mandatory' : ''}`}>
        <div className="update-dialog">
          <div className="update-dialog-header">
            <span className="update-icon">{isMandatory ? '⚠️' : '↑'}</span>
            <h2>{isMandatory ? 'Required Update' : 'Update Available'}</h2>
          </div>
          <div className="update-dialog-body">
            {isMandatory && (
              <div className="mandatory-banner">
                ⚠️ This update is required. You must install it to continue using the app.
              </div>
            )}
            <div className="update-version-info">
              <span className="version-current">v{updateInfo.current_version}</span>
              <span className="version-arrow">→</span>
              <span className="version-new">v{updateInfo.version}</span>
            </div>
            
            {updateInfo.notes && (
              <div className="update-notes">
                <h3>What's New:</h3>
                <div className="notes-content">
                  {updateInfo.notes}
                </div>
              </div>
            )}
          </div>
          <div className="update-dialog-actions">
            {/* Only show Later button for non-mandatory updates */}
            {!isMandatory && (
              <button className="update-btn secondary" onClick={handleDismiss}>
                Later
              </button>
            )}
            <button className="update-btn primary" onClick={handleInstall}>
              {isMandatory ? 'Install Required Update' : 'Install & Restart'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default UpdateDialog;

