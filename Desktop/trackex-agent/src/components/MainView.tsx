import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { confirm } from "@tauri-apps/plugin-dialog";
import VersionBadge from "./VersionBadge";
import { 
  connectToLicenseStream, 
  disconnectFromLicenseStream, 
  addLicenseListener,
  LicenseNotification 
} from "../utils/license-listener";

interface AuthStatus {
    is_authenticated: boolean;
    email?: string;
    device_id?: string;
}

interface WorkSessionInfo {
    is_active: boolean;
    started_at?: string;
    current_app?: string;
    idle_time_seconds: number;
    is_paused: boolean;
}

interface TrackingStatus {
    is_tracking: boolean;
    is_paused: boolean;
    current_app?: string;
    idle_time_seconds: number;
}

interface AppInfo {
    name: string;
    app_id: string;
    window_title?: string;
    url?: string;
    domain?: string;
}

interface MainViewProps {
    authStatus: AuthStatus;
    onLogout: () => Promise<void>;
}

interface RecentSession {
    id: string;
    started_at: string;
    ended_at?: string;
    duration: number;
    date: string;
}

// Removed unused SessionHistory interface

interface LicenseCheckResult {
    valid: boolean;
    status?: string;
    message: string;
}

interface LicenseError {
    isLicenseError: boolean;
    status: string;
    message: string;
}

function MainView({ authStatus, onLogout }: Readonly<MainViewProps>) {
    const [workSession, setWorkSession] = useState<WorkSessionInfo | null>(null);
    const [trackingStatus, setTrackingStatus] = useState<TrackingStatus | null>(null);
    const [currentApp, setCurrentApp] = useState<AppInfo | null>(null);
    const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [currentTime, setCurrentTime] = useState(new Date());
    const [licenseError, setLicenseError] = useState<LicenseError | null>(null);
    const [retrying, setRetrying] = useState(false);

    // Handle license updates from SSE stream
    const handleLicenseUpdate = useCallback(async (notification: LicenseNotification) => {
        console.log("[MainView] License notification received:", notification.type, notification);
        
        if (notification.type === 'connected') {
            // Initial connection - check if license is invalid
            console.log("[MainView] License stream connected. Valid:", notification.valid);
            if (notification.valid === false) {
                const licenseErr = parseLicenseError("NO_VALID_LICENSE: Your organization needs to activate a license for your account before you can use the desktop agent. Please contact your administrator.");
                if (licenseErr) {
                    setLicenseError(licenseErr);
                }
            } else if (notification.valid === true) {
                // Clear any existing license error
                setLicenseError(null);
            }
        } else if (notification.type === 'license_updated' || notification.type === 'license_renewed') {
            // License was activated or renewed
            console.log("[MainView] License updated! Valid:", notification.valid);
            if (notification.valid === true) {
                // Clear license error - user now has a valid license!
                console.log("[MainView] Clearing license error - license is now valid");
                setLicenseError(null);
            }
        } else if (notification.type === 'license_expired' || notification.type === 'license_revoked') {
            // License was revoked or expired
            console.log("[MainView] License revoked/expired!");
            const licenseErr = parseLicenseError("Your license has been revoked or expired. Please contact your administrator.");
            if (licenseErr) {
                setLicenseError(licenseErr);
            }
        }
    }, []);

    const parseLicenseError = (errorMessage: string): LicenseError | null => {
        // Check if the error is a license error (402 Payment Required)
        if (errorMessage.includes('NO_VALID_LICENSE') || errorMessage.includes('402') || errorMessage.includes('license')) {
            return {
                isLicenseError: true,
                status: 'NO_LICENSE',
                message: 'Your organization needs to activate a license for your account before you can use the desktop agent.',
            };
        }
        return null;
    };

    const handleLicenseRetry = async () => {
        setRetrying(true);
        setLicenseError(null);
        setError("");

        try {
            // Call the retry_license_check command
            const result = await invoke<LicenseCheckResult>('retry_license_check');
            
            if (!result.valid) {
                // License still invalid
                const licenseErr = parseLicenseError(result.message);
                if (licenseErr) {
                    // This is a real license error (402) - backend will auto clock-out
                    setLicenseError(licenseErr);
                } else {
                    setError('License verification failed. Please contact your administrator.');
                }
            }
            // If valid, licenseError will remain null and UI will show normally
        } catch (error) {
            const errorMessage = error as string;
            const licenseErr = parseLicenseError(errorMessage);
            if (licenseErr) {
                // This is a real license error (402) - backend will auto clock-out
                setLicenseError(licenseErr);
            } else {
                // This is a server/network error (404, 500, etc.) - show as regular error
                setError(errorMessage);
            }
        } finally {
            setRetrying(false);
        }
    };

    // Connect to license stream when authenticated
    useEffect(() => {
        if (authStatus?.is_authenticated) {
            console.log("[MainView] User authenticated, connecting to license stream...");
            connectToLicenseStream();
            
            // Add listener for license updates
            const unsubscribe = addLicenseListener(handleLicenseUpdate);
            
            return () => {
                unsubscribe();
            };
        } else {
            // Disconnect when not authenticated
            disconnectFromLicenseStream();
        }
    }, [authStatus?.is_authenticated, handleLicenseUpdate]);

    // Check license status on component mount
    useEffect(() => {
        const checkLicense = async () => {
            try {
                const result = await invoke<LicenseCheckResult>("check_license_status");
                if (!result.valid) {
                    // License is invalid - set license error state
                    const licenseErr = parseLicenseError(result.message);
                    if (licenseErr) {
                        setLicenseError(licenseErr);
                    } else {
                        setError('License validation failed. Please contact your administrator.');
                    }
                }
            } catch (error) {
                console.error("Failed to check license status:", error);
                // If license check fails, parse and set the error
                const errorMessage = String(error);
                const licenseErr = parseLicenseError(errorMessage);
                if (licenseErr) {
                    setLicenseError(licenseErr);
                } else {
                    setError(errorMessage);
                }
            }
        };

        // Check license immediately on mount
        checkLicense();
    }, []);

    useEffect(() => {

        fetchStatus();

        // Update time every second for the timer
        const timeInterval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        // Note: do not schedule heartbeats or DB clearing from the UI.
        // Backend services handle heartbeats/app focus/job polling when clocked in.

        // Update current app every 3 seconds for live tracking when clocked in
        const appUpdateInterval = setInterval(async () => {
            if (authStatus.is_authenticated && workSession?.is_active) {
                try {
                    const app = await invoke<AppInfo | null>("get_current_app");
                    setCurrentApp(app);
                } catch (error) {
                    console.error('Failed to get current app:', error);
                }
            }
        }, 3000);

        // Update full status every 10 seconds
        const statusUpdateInterval = setInterval(() => {
            if (authStatus.is_authenticated) {
                fetchStatus();
            }
        }, 10000);

        // Note: Heartbeat, app focus, job polling, and idle detection are now handled by backend services
        // They automatically start when user clocks in and stop when user clocks out
        // No need for frontend intervals - backend services handle this efficiently

        return () => {
            clearInterval(timeInterval);
            clearInterval(appUpdateInterval);
            clearInterval(statusUpdateInterval);
        };
    }, [authStatus.is_authenticated, workSession?.is_active]);

    const fetchStatus = async () => {
        try {
            const [session, tracking, app, sessionsData] = await Promise.all([
                invoke<WorkSessionInfo>("get_work_session"),
                invoke<TrackingStatus>("get_tracking_status"),
                invoke<AppInfo | null>("get_current_app"),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                invoke<any>("get_recent_sessions")
            ]);
            setWorkSession(session);
            setTrackingStatus(tracking);
            setCurrentApp(app);

            // Update recent sessions
            if (sessionsData?.sessions) {
                setRecentSessions(sessionsData.sessions);
            }
        } catch (error) {
            console.error("Failed to fetch status:", error);
        }
    };

    const handleClockIn = async () => {
        setLoading(true);
        setError("");

        try {
            await invoke("clock_in");
            await fetchStatus();
        } catch (error) {
            setError(error as string);
        } finally {
            setLoading(false);
        }
    };

    const handleClockOut = async () => {
        setLoading(true);
        setError("");

        try {
            await invoke("clock_out");
            await fetchStatus();
        } catch (error) {
            setError(error as string);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        // If user is clocked in, show confirmation dialog
        if (workSession?.is_active) {
            const confirmed = await confirm(
                "You are currently clocked in. Logging out will automatically clock you out. Do you want to continue?",
                {
                    title: "Confirm Logout",
                    kind: "warning",
                    okLabel: "Logout & Clock Out",
                    cancelLabel: "Cancel"
                }
            );
            if (!confirmed) {
                return;
            }
        }
        
        setLoading(true);
        try {
            await invoke("logout");
            // Use the onLogout prop to properly reset the app state
            await onLogout();
        } catch (error) {
            setError(error as string);
        } finally {
            setLoading(false);
        }
    };

    const formatTimer = (start?: string) => {
        if (!start) return "00:00:00";
        const startTime = new Date(start);
        const diff = currentTime.getTime() - startTime.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatStartTime = (timestamp?: string) => {
        if (!timestamp) return "N/A";
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour12: true,
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const formatSessionDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')} h`;
    };

    return (
        <div className="trackex-main">
            <VersionBadge position="bottom-right" />
            
            {/* License Error Overlay */}
            {licenseError && (
                <div className="license-error-overlay">
                    <div className="license-error-modal">
                        <div className="license-error-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 17L12 22L22 17" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 12L12 17L22 12" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h3 className="license-error-title">License Required</h3>
                        <p className="license-error-message">{licenseError.message}</p>
                        <div className="license-error-actions">
                            <p className="license-error-hint">Please contact your organization administrator to activate your license.</p>
                            <button 
                                type="button" 
                                className="license-error-retry" 
                                onClick={handleLicenseRetry}
                                disabled={retrying}
                            >
                                {retrying ? 'Checking...' : 'Try Again'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className="trackex-header">
                <div className="trackex-logo">
                    <h1>TrackEx</h1>
                </div>
                <div className="trackex-user">
                    <span className="user-email">{authStatus.email}</span>
                    <button onClick={handleLogout} className="logout-btn">
                        Logout
                    </button>
                </div>
            </div>

            {/* Date */}
            <div className="trackex-date">
                {formatDate(currentTime)}
            </div>

            {/* Main Timer Section */}
            <div className="trackex-timer-section">
                {workSession?.is_active ? (
                    <>
                        <div className="timer-display">
                            {formatTimer(workSession.started_at)} <span className="timer-unit">h</span>
                        </div>
                        <div className="timer-subtitle">
                            Started at {formatStartTime(workSession.started_at)}
                        </div>
                        <button
                            onClick={handleClockOut}
                            disabled={loading}
                            className="clock-button clock-out"
                        >
                            {loading ? "Clocking Out..." : "Clock Out"}
                        </button>
                    </>
                ) : (
                    <>
                        <div className="timer-display">
                            {formatTime(currentTime)}
                        </div>
                        <div className="timer-subtitle">
                            Ready to start tracking
                        </div>
                        <button
                            onClick={handleClockIn}
                            disabled={loading}
                            className="clock-button clock-in"
                        >
                            {loading ? "Clocking In..." : "Clock In"}
                        </button>
                    </>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="trackex-error">
                    {error}
                </div>
            )}

            {/* Activity Status */}
            {workSession?.is_active && (
                <div className="trackex-activity">
                    <div className="activity-item">
                        <span className="activity-label">Current App</span>
                        <span className="activity-value">
                            {currentApp?.name || "--"}
                            {currentApp?.domain && (
                                <span className="activity-domain"> • {currentApp.domain}</span>
                            )}
                        </span>
                    </div>
                    <div className="activity-item">
                        <span className="activity-label">Status</span>
                        <span className="activity-value">
                            {trackingStatus?.is_paused ? "Paused" : "Active"}
                        </span>
                    </div>
                </div>
            )}

            {/* Recent Sessions Preview */}
            <div className="trackex-recent">
                <h3>Recent Sessions</h3>
                {recentSessions.length > 0 ? (
                    <div className="recent-sessions-list">
                        {recentSessions.slice(0, 5).map((session) => (
                            <div key={session.id} className="recent-session-item">
                                <div className="session-date">{session.date}</div>
                                <div className="session-details">
                                    <div className="session-times">
                                        <span>Clock In</span>
                                        <span>Clock Out</span>
                                        <span></span>
                                    </div>
                                    <div className="session-values">
                                        <span>{formatStartTime(session.started_at)}</span>
                                        <span>{session.ended_at ? formatStartTime(session.ended_at) : "---"}</span>
                                        <span className="session-duration">{formatSessionDuration(session.duration)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="recent-placeholder">
                        No recent sessions to display
                    </div>
                )}
            </div>
            
            <style>{`
                .license-error-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .license-error-modal {
                    background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
                    border: 1px solid #F59E0B;
                    border-radius: 12px;
                    padding: 32px;
                    text-align: center;
                    max-width: 400px;
                    margin: 20px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }

                .license-error-icon {
                    margin-bottom: 20px;
                }

                .license-error-title {
                    color: #92400E;
                    font-size: 20px;
                    font-weight: 600;
                    margin: 0 0 12px 0;
                }

                .license-error-message {
                    color: #78350F;
                    font-size: 16px;
                    margin: 0 0 20px 0;
                    line-height: 1.5;
                }

                .license-error-actions {
                    margin-top: 20px;
                }

                .license-error-hint {
                    color: #92400E;
                    font-size: 14px;
                    margin: 0 0 16px 0;
                }

                .license-error-retry {
                    background: #F59E0B;
                    color: white;
                    border: none;
                    padding: 12px 32px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .license-error-retry:hover {
                    background: #D97706;
                }

                .license-error-retry:disabled {
                    background: #9CA3AF;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
}

export default MainView;