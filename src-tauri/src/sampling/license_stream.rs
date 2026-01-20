//! License SSE Stream Client
//!
//! Connects to /api/agent/license-stream to receive real-time license updates
//! without polling. When the admin activates a license, the agent instantly receives
//! the update and refreshes the license state.

use crate::sampling::license_monitor;
use crate::storage::AppState;
use anyhow::{Context, Result};
use serde::Deserialize;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tokio::time::sleep;

/// License update event from SSE stream
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct LicenseEvent {
    #[serde(rename = "type")]
    event_type: String,
    timestamp: String,
    #[serde(rename = "employeeId")]
    employee_id: Option<String>,
    status: Option<String>,
    tier: Option<String>,
    #[serde(rename = "expiresAt")]
    expires_at: Option<String>,
    valid: Option<bool>,
    message: Option<String>,
}

/// Start the license SSE stream listener
///
/// This function connects to the `/api/desktop/license-stream` endpoint
/// and listens for `license_updated` events. When received, it updates
/// the AppState and handles license expiration if necessary.
///
/// Auto-reconnects with exponential backoff (1s → 2s → 4s → ... → 60s max)
/// Stops retrying if authentication fails (401) - requires re-login
pub async fn start_license_stream(state: Arc<Mutex<AppState>>) {
    tokio::spawn(async move {
        let mut backoff_seconds = 1u64;
        const MAX_BACKOFF: u64 = 60;
        let mut consecutive_auth_failures = 0;
        const MAX_AUTH_FAILURES: u32 = 3;

        loop {
            log::info!("Starting license SSE stream connection...");

            match connect_and_listen(state.clone()).await {
                Ok(_) => {
                    log::info!("License SSE stream connection ended normally");
                    backoff_seconds = 1; // Reset backoff on clean disconnect
                    consecutive_auth_failures = 0; // Reset auth failure counter
                }
                Err(e) => {
                    let error_msg = e.to_string();
                    
                    // Check if this is an authentication error (401)
                    if error_msg.contains("401") || error_msg.contains("authentication") {
                        consecutive_auth_failures += 1;
                        log::error!(
                            "License stream authentication failed ({}/{}): {}",
                            consecutive_auth_failures,
                            MAX_AUTH_FAILURES,
                            error_msg
                        );
                        
                        if consecutive_auth_failures >= MAX_AUTH_FAILURES {
                            log::error!(
                                "License stream: Too many authentication failures. Stopping reconnection attempts. Please re-login."
                            );
                            break; // Stop retrying on persistent auth failures
                        }
                    } else {
                        log::error!("License SSE stream error: {}", error_msg);
                        consecutive_auth_failures = 0; // Reset counter on non-auth errors
                    }
                }
            }

            // Exponential backoff before reconnecting
            log::info!("Reconnecting license stream in {} seconds...", backoff_seconds);
            sleep(Duration::from_secs(backoff_seconds)).await;
            backoff_seconds = (backoff_seconds * 2).min(MAX_BACKOFF);
        }
        
        log::info!("License stream listener terminated");
    });
}

/// Connect to the SSE stream and listen for events
async fn connect_and_listen(state: Arc<Mutex<AppState>>) -> Result<()> {
    // Get server URL and device token from state
    let (server_url, device_token) = {
        let state_lock = state.lock().await;
        let server = state_lock
            .server_url
            .clone()
            .context("Server URL not configured")?;
        let token = state_lock
            .device_token
            .clone()
            .context("Device token not available")?;
        (server, token)
    };

    let url = format!("{}/api/desktop/license-stream", server_url);
    log::info!("Connecting to license stream: {}", url);

    // Create HTTP client with auth header
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(300)) // 5-minute timeout for long connections
        .build()
        .context("Failed to build HTTP client")?;

    // Start the SSE connection
    let mut response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", device_token))
        .header("Accept", "text/event-stream")
        .header("Cache-Control", "no-cache")
        .send()
        .await
        .context("Failed to connect to license stream")?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "Unable to read response".to_string());
        anyhow::bail!("License stream connection failed: {} - {}", status, body);
    }

    log::info!("License SSE stream connected successfully");

    // Process the stream line by line
    let mut data_buffer = String::new();

    while let Some(chunk) = response.chunk().await? {
        let text = String::from_utf8_lossy(&chunk);

        for line in text.lines() {
            if line.starts_with("data:") {
                data_buffer.push_str(line[5..].trim());
            } else if line.is_empty() && !data_buffer.is_empty() {
                // End of message - parse the event
                if let Err(e) = handle_license_event(&data_buffer, state.clone()).await {
                    log::error!("Failed to handle license event: {}", e);
                }

                // Clear buffer
                data_buffer.clear();
            }
        }
    }

    Ok(())
}

/// Handle any license event from the stream
async fn handle_license_event(data: &str, state: Arc<Mutex<AppState>>) -> Result<()> {
    let event: LicenseEvent = serde_json::from_str(data)
        .context("Failed to parse license event data")?;

    log::info!("Received license event: type={}, valid={:?}", event.event_type, event.valid);

    match event.event_type.as_str() {
        "connected" => {
            log::info!("License stream connected successfully");
            // Update state with initial license status from connection event
            if let Some(valid) = event.valid {
                let mut state_lock = state.lock().await;
                state_lock.license_valid = Some(valid);
                state_lock.license_status = event.status.clone();
                state_lock.last_license_check = Some(chrono::Utc::now().timestamp());
                log::info!(
                    "Initial license state: valid={}, status={:?}",
                    valid,
                    event.status
                );
            }
        }
        "heartbeat" => {
            log::debug!("License stream heartbeat received");
        }
        "license_updated" | "license_renewed" | "license_activated" => {
            handle_license_update(event, state.clone()).await?;
        }
        "license_expired" | "license_revoked" => {
            handle_license_revocation(event, state.clone()).await?;
        }
        _ => {
            log::warn!("Unknown license event type: {}", event.event_type);
        }
    }

    Ok(())
}

/// Handle positive license update events (activated, renewed, updated)
async fn handle_license_update(event: LicenseEvent, state: Arc<Mutex<AppState>>) -> Result<()> {
    log::info!("License update received: {:?}", event);

    let valid = event.valid.unwrap_or(false);

    // Update AppState with new license info
    {
        let mut state_lock = state.lock().await;
        state_lock.license_valid = Some(valid);
        state_lock.license_status = event.status.clone();
        state_lock.last_license_check = Some(chrono::Utc::now().timestamp());
        log::info!(
            "Updated license state: valid={}, status={:?}, message={:?}",
            valid,
            event.status,
            event.message
        );
    }

    // If license became valid, no action needed - UI will automatically update
    // If license became invalid, handle it
    if !valid {
        handle_license_invalidation(state).await;
    }

    Ok(())
}

/// Handle license revocation/expiration events
async fn handle_license_revocation(event: LicenseEvent, state: Arc<Mutex<AppState>>) -> Result<()> {
    log::warn!("License revocation received: {:?}", event);

    // Update AppState
    {
        let mut state_lock = state.lock().await;
        state_lock.license_valid = Some(false);
        state_lock.license_status = event.status.clone();
        state_lock.last_license_check = Some(chrono::Utc::now().timestamp());
    }

    // Handle the license becoming invalid
    handle_license_invalidation(state).await;

    Ok(())
}

/// Handle cases where license becomes invalid (expired, revoked, etc)
async fn handle_license_invalidation(state: Arc<Mutex<AppState>>) {
    // If user is clocked in, handle expiration (auto-clockout)
    if crate::sampling::is_clocked_in().await {
        log::warn!("License became invalid while clocked in - triggering auto-clockout");
        license_monitor::handle_license_expiration(state.clone()).await;
    } else {
        log::info!("License became invalid, but user is not clocked in - no action needed");
    }
}
