// License monitoring service
// Periodically checks license status and handles expiration during active sessions

use crate::storage::AppState;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{interval, Duration};
use log::{info, warn, error};

// Global flag to control the license monitor service
static LICENSE_MONITOR_RUNNING: AtomicBool = AtomicBool::new(false);

/// License check interval in seconds
/// Changed to 30 seconds for faster license change detection (complementing SSE)
/// Can be overridden with TRACKEX_LICENSE_CHECK_INTERVAL env var for testing
fn get_license_check_interval() -> u64 {
    std::env::var("TRACKEX_LICENSE_CHECK_INTERVAL")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(30) // Changed from 300 (5 min) to 30 seconds
}

/// Start the license monitoring background service
/// This should be called after successful authentication
pub async fn start_license_monitor() {
    if LICENSE_MONITOR_RUNNING.load(Ordering::Relaxed) {
        info!("License monitor already running");
        return;
    }

    LICENSE_MONITOR_RUNNING.store(true, Ordering::Relaxed);
    info!("Starting license monitoring service with interval: {}s", get_license_check_interval());

    tokio::spawn(async move {
        let mut check_interval = interval(Duration::from_secs(get_license_check_interval()));
        
        loop {
            check_interval.tick().await;

            if !LICENSE_MONITOR_RUNNING.load(Ordering::Relaxed) {
                info!("License monitor stopped");
                break;
            }

            // Only check if authenticated
            if !crate::sampling::is_authenticated().await {
                continue;
            }

            // Perform license check every 30 seconds
            // The server-side endpoint has its own 30s cache to minimize DB load
            match check_license_and_handle_expiration().await {
                Ok(valid) => {
                    if !valid {
                        info!("License check failed - license is invalid");
                        // License invalid - auto-clockout will be triggered if needed
                    }
                }
                Err(e) => {
                    // Network errors are expected occasionally, just log at debug level
                    if e.contains("connect") || e.contains("timeout") {
                        log::debug!("License check network error (expected occasionally): {}", e);
                    } else {
                        warn!("License check error: {}", e);
                    }
                }
            }
        }
    });
}

/// Stop the license monitoring service
pub async fn stop_license_monitor() {
    LICENSE_MONITOR_RUNNING.store(false, Ordering::Relaxed);
    info!("Stopping license monitoring service");
}

/// Check license status and handle expiration if needed
/// Returns Ok(true) if license is valid, Ok(false) if invalid
async fn check_license_and_handle_expiration() -> Result<bool, String> {
    // Get app state to access server URL and device token
    let app_state = crate::storage::get_global_app_state()
        .map_err(|e| format!("Failed to get app state: {}", e))?;
    
    let (server_url, device_token) = {
        let state = app_state.lock().await;
        (state.server_url.clone(), state.device_token.clone())
    };

    if server_url.is_none() || device_token.is_none() {
        return Err("Not authenticated".to_string());
    }

    // Create API client
    let client = match crate::api::client::ApiClient::new().await {
        Ok(client) => client,
        Err(e) => return Err(format!("Failed to create API client: {}", e)),
    };

    // Use the new fast license check endpoint with 30s cache
    let license_url = "/api/agent/license-check-fast";
    
    // Make license check request using the get_with_auth method
    let response = match client.get_with_auth(license_url).await {
        Ok(resp) => resp,
        Err(e) => {
            let err_str = e.to_string();
            if err_str.contains("connect") {
                return Err("Cannot connect to server".to_string());
            } else if err_str.contains("timeout") {
                return Err("Connection timeout".to_string());
            } else {
                return Err(format!("Network error: {}", e));
            }
        }
    };

    let status_code = response.status();
    
    if status_code.is_success() {
        let license_response: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let valid = license_response.get("valid")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        
        let status = license_response.get("status")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        // Update state with license info and timestamp
        {
            let mut state = app_state.lock().await;
            state.license_valid = Some(valid);
            state.license_status = status.clone();
            state.last_license_check = Some(chrono::Utc::now().timestamp());
        }

        if !valid {
            warn!("License is invalid: {:?}", status);
            // Handle license expiration - auto-clockout if needed
            handle_license_expiration(app_state.clone()).await;
        }

        Ok(valid)
    } else if status_code.as_u16() == 402 {
        // Payment Required - no valid license
        let error_response: serde_json::Value = response
            .json()
            .await
            .unwrap_or(serde_json::json!({"message": "No valid license found"}));
        
        let status = error_response.get("licenseStatus")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        // Update state with invalid license info
        {
            let mut state = app_state.lock().await;
            state.license_valid = Some(false);
            state.license_status = status.clone();
            state.last_license_check = Some(chrono::Utc::now().timestamp());
        }

        error!("License expired or invalid: {:?}", status);
        
        // Handle license expiration - auto-clockout if needed
        handle_license_expiration(app_state.clone()).await;

        Ok(false)
    } else {
        // For 404, 500, or other server errors, return error to trigger retry
        // Don't update license state or clock out - this is likely a temporary server issue
        warn!("License check failed with status {}: Server may be down, will retry", status_code);
        Err(format!("License check failed with status: {}", status_code))
    }
}

/// Handle license expiration by auto-clocking out if user is clocked in
/// Handle license expiration - called when license becomes invalid
/// Can be called from SSE stream or periodic checks
pub async fn handle_license_expiration(_state: Arc<Mutex<AppState>>) {
    info!("Handling license expiration...");

    // Check if user is currently clocked in using the sampling module function
    if !crate::sampling::is_clocked_in().await {
        info!("User not clocked in, no auto-clockout needed");
        return;
    }

    warn!("License expired while user is clocked in - performing auto-clockout");

    // End local app usage session
    if let Err(e) = crate::storage::app_usage::end_current_session().await {
        error!("Failed to end current app session during license expiration: {}", e);
    }

    // Stop background services
    crate::sampling::stop_services().await;
    crate::sampling::reset_idle_state();

    // Send clock_out event to backend
    match crate::api::client::ApiClient::new().await {
        Ok(client) => {
            let event_data = serde_json::json!({
                "events": [{
                    "type": "clock_out",
                    "timestamp": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
                    "data": {
                        "source": "license_expiration",
                        "reason": "license_expired"
                    }
                }]
            });
            
            match client.post_with_auth("/api/ingest/events", &event_data).await {
                Ok(response) => {
                    if response.status().is_success() {
                        info!("Successfully sent clock_out event due to license expiration");
                    } else {
                        error!("Backend returned error status during license expiration clockout: {}", response.status());
                    }
                }
                Err(e) => {
                    error!("Failed to send clock_out event during license expiration: {}", e);
                    // Queue the event for later sync if network is unavailable
                    let _ = crate::storage::offline_queue::queue_event("clock_out", &event_data).await;
                }
            }
        }
        Err(e) => {
            error!("Failed to create API client during license expiration: {}", e);
        }
    }

    // End local work session
    if let Err(e) = crate::storage::work_session::end_session().await {
        error!("Failed to end local session during license expiration: {}", e);
    }

    info!("Auto-clockout due to license expiration completed");
}

/// Check if the license monitor is currently running
pub fn is_license_monitor_running() -> bool {
    LICENSE_MONITOR_RUNNING.load(Ordering::Relaxed)
}
