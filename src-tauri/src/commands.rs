use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};

use crate::storage::{AppState, consent, app_usage};

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    pub server_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthStatus {
    pub is_authenticated: bool,
    pub email: Option<String>,
    pub device_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConsentStatus {
    pub accepted: bool,
    pub accepted_at: Option<String>,
    pub version: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkSessionInfo {
    pub is_active: bool,
    pub started_at: Option<String>,
    pub current_app: Option<String>,
    pub idle_time_seconds: u64,
    pub is_paused: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TrackingStatus {
    pub is_tracking: bool,
    pub is_paused: bool,
    pub current_app: Option<String>,
    pub idle_time_seconds: u64,
}

// Use AppInfo from the app_focus module
use crate::sampling::app_focus::AppInfo;

// Helper functions for device registration
fn get_platform_name() -> &'static str {
    match std::env::consts::OS {
        "windows" => "Windows",
        "macos" => "macOS", 
        "linux" => "Linux",
        _ => "Unknown"
    }
}

fn get_os_version() -> String {
    #[cfg(target_os = "windows")]
    {
        // Method 1: Try PowerShell to get accurate Windows version (most reliable)
        if let Ok(output) = std::process::Command::new("powershell")
            .args(&["-Command", "Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, WindowsBuildLabEx | ConvertTo-Json"])
            .output()
        {
            if let Ok(json_str) = String::from_utf8(output.stdout) {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&json_str) {
                    if let Some(product_name) = json.get("WindowsProductName").and_then(|v| v.as_str()) {
                        if let Some(version) = json.get("WindowsVersion").and_then(|v| v.as_str()) {
                            let result = format!("{} {}", product_name, version);
                            return result;
                        }
                    }
                }
            }
        }
        
        // Method 2: Try wmic (Windows Management Instrumentation)
        if let Ok(output) = std::process::Command::new("wmic")
            .args(&["os", "get", "Caption,Version,BuildNumber", "/value"])
            .output()
        {
            if let Ok(wmic_output) = String::from_utf8(output.stdout) {
                let mut caption = String::new();
                let mut version = String::new();
                let mut build = String::new();
                
                for line in wmic_output.lines() {
                    if line.starts_with("Caption=") {
                        caption = line.replace("Caption=", "").trim().to_string();
                    } else if line.starts_with("Version=") {
                        version = line.replace("Version=", "").trim().to_string();
                    } else if line.starts_with("BuildNumber=") {
                        build = line.replace("BuildNumber=", "").trim().to_string();
                    }
                }
                
                if !caption.is_empty() && !version.is_empty() {
                    let result = format!("{} Version {} Build {}", caption, version, build);
                    return result;
                }
            }
        }
        
        // Method 3: Parse cmd /C ver output (improved parsing)
        if let Ok(output) = std::process::Command::new("cmd")
            .args(&["/C", "ver"])
            .output()
        {
            if let Ok(version_str) = String::from_utf8(output.stdout) {
                let trimmed = version_str.trim();
                
                // Parse "Microsoft Windows [Version 10.0.22621.2861]"
                if let Some(start) = trimmed.find("[Version ") {
                    if let Some(end) = trimmed[start..].find(']') {
                        let version_part = &trimmed[start + 9..start + end];
                        let parts: Vec<&str> = version_part.split('.').collect();
                        if parts.len() >= 4 {
                            let major = parts[0].parse::<u32>().unwrap_or(0);
                            let minor = parts[1].parse::<u32>().unwrap_or(0);
                            let build = parts[2].parse::<u32>().unwrap_or(0);
                            let revision = parts[3].parse::<u32>().unwrap_or(0);
                            
                            // Better Windows version detection
                            let os_name = if major >= 10 && build >= 22000 {
                                "Windows 11"
                            } else if major >= 10 {
                                "Windows 10"
                            } else if major == 6 && minor == 3 {
                                "Windows 8.1"
                            } else if major == 6 && minor == 2 {
                                "Windows 8"
                            } else if major == 6 && minor == 1 {
                                "Windows 7"
                            } else {
                                "Windows"
                            };
                            
                            let result = format!("{} Build {}.{}.{}.{}", os_name, major, minor, build, revision);
                            return result;
                        }
                    }
                }
                return trimmed.to_string();
            }
        }
        
        // Method 4: Fallback to GetVersionExW (but with better build number detection)
        unsafe {
            use winapi::um::sysinfoapi::GetVersionExW;
            use winapi::um::winnt::OSVERSIONINFOW;
            use std::mem;
            
            let mut os_info: OSVERSIONINFOW = mem::zeroed();
            os_info.dwOSVersionInfoSize = mem::size_of::<OSVERSIONINFOW>() as u32;
            
            if GetVersionExW(&mut os_info) != 0 {
                let major = os_info.dwMajorVersion;
                let minor = os_info.dwMinorVersion;
                let build = os_info.dwBuildNumber;
                
                
                // Use build number to better detect Windows 10/11
                let os_name = if build >= 22000 {
                    "Windows 11"  // Windows 11 builds start from 22000
                } else if build >= 10240 {
                    "Windows 10"  // Windows 10 builds start from 10240
                } else if major == 6 && minor == 3 {
                    "Windows 8.1"
                } else if major == 6 && minor == 2 {
                    "Windows 8"
                } else if major == 6 && minor == 1 {
                    "Windows 7"
                } else {
                    "Windows"
                };
                
                let result = format!("{} Build {}", os_name, build);
                return result;
            }
        }
        
        log::warn!("🔍 All Windows version detection methods failed");
        "Windows Unknown".to_string()
    }
    
    #[cfg(target_os = "macos")]
    {
        // Get macOS version using sw_vers
        if let Ok(output) = std::process::Command::new("sw_vers")
            .arg("-productVersion")
            .output()
        {
            if let Ok(version_str) = String::from_utf8(output.stdout) {
                return format!("macOS {}", version_str.trim());
            }
        }
        
        // Fallback to system_profiler
        if let Ok(output) = std::process::Command::new("system_profiler")
            .args(&["SPSoftwareDataType"])
            .output()
        {
            if let Ok(output_str) = String::from_utf8(output.stdout) {
                for line in output_str.lines() {
                    if line.contains("System Version:") {
                        return line.replace("System Version:", "").trim().to_string();
                    }
                }
            }
        }
        
        "macOS Unknown".to_string()
    }
    
    #[cfg(target_os = "linux")]
    {
        // Try to get Linux version from /etc/os-release
        if let Ok(content) = std::fs::read_to_string("/etc/os-release") {
            for line in content.lines() {
                if line.starts_with("PRETTY_NAME=") {
                    return line.replace("PRETTY_NAME=", "").trim_matches('"').to_string();
                }
            }
        }
        
        // Fallback to uname
        if let Ok(output) = std::process::Command::new("uname")
            .args(&["-r"])
            .output()
        {
            if let Ok(kernel_version) = String::from_utf8(output.stdout) {
                return format!("Linux Kernel {}", kernel_version.trim());
            }
        }
        
        "Linux Unknown".to_string()
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        format!("{} Unknown", std::env::consts::OS)
    }
}

fn get_device_name() -> String {
    #[cfg(target_os = "windows")]
    {
        // Try to get the computer name on Windows with consistent fallbacks
        use std::process::Command;
        
        // Method 1: Try hostname command
        if let Ok(output) = Command::new("hostname").output() {
            if let Ok(hostname) = String::from_utf8(output.stdout) {
                let trimmed = hostname.trim().to_string();
                if !trimmed.is_empty() && trimmed != "hostname" {
                    return trimmed;
                }
            }
        }
        
        // Method 2: Try COMPUTERNAME environment variable
        if let Ok(computername) = std::env::var("COMPUTERNAME") {
            let trimmed = computername.trim().to_string();
            if !trimmed.is_empty() {
                return trimmed;
            }
        }
        
        // Method 3: Try USERNAME as last resort
        if let Ok(username) = std::env::var("USERNAME") {
            let trimmed = username.trim().to_string();
            if !trimmed.is_empty() {
                return format!("Windows-{}", trimmed);
            }
        }
        
        // Final fallback
        log::warn!("🔍 All Windows device name methods failed, using fallback");
        "Windows-Unknown".to_string()
    }
    
    #[cfg(target_os = "macos")]
    {
        // Try to get the computer name on macOS
        use std::process::Command;
        if let Ok(output) = Command::new("scutil").args(&["--get", "ComputerName"]).output() {
            if let Ok(hostname) = String::from_utf8(output.stdout) {
                return hostname.trim().to_string();
            }
        }
        // Fallback to environment variable
        return std::env::var("HOSTNAME").unwrap_or_else(|_| "macOS Device".to_string());
    }
    
    #[cfg(target_os = "linux")]
    {
        // Try to get the hostname on Linux
        use std::process::Command;
        if let Ok(output) = Command::new("hostname").output() {
            if let Ok(hostname) = String::from_utf8(output.stdout) {
                return hostname.trim().to_string();
            }
        }
        // Fallback to environment variable
        return std::env::var("HOSTNAME").unwrap_or_else(|_| "Linux Device".to_string());
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        // Fallback for unknown platforms
        "Unknown Device".to_string()
    }
}

// Import PermissionsStatus from our dedicated permissions module
use crate::permissions::PermissionsStatus;

#[tauri::command]
pub async fn trigger_sync() -> Result<String, String> {
    
    // Try to sync pending heartbeats
    let mut synced_heartbeats = 0;
    if let Ok(heartbeats) = crate::storage::offline_queue::get_pending_heartbeats().await {
        for heartbeat in heartbeats {
            if let Ok(_) = crate::sampling::send_heartbeat_to_backend(&heartbeat.heartbeat_data).await {
                if let Ok(_) = crate::storage::offline_queue::mark_heartbeat_processed(heartbeat.id).await {
                    synced_heartbeats += 1;
                }
            }
        }
    }
    
    // Try to sync pending events
    let mut synced_events = 0;
    if let Ok(events) = crate::storage::offline_queue::get_pending_events().await {
        for event in events {
            if let Ok(_) = crate::sampling::send_event_to_backend(&event.event_type, &event.event_data).await {
                if let Ok(_) = crate::storage::offline_queue::mark_event_processed(event.id).await {
                    synced_events += 1;
                }
            }
        }
    }
    
    let message = format!("Sync completed: {} heartbeats, {} events synced", synced_heartbeats, synced_events);
    Ok(message)
}

#[tauri::command]
pub async fn login(
    request: LoginRequest,
    state: State<'_, Arc<Mutex<AppState>>>,
    app_handle: tauri::AppHandle,
) -> Result<AuthStatus, String> {
    
    // Create HTTP client with timeout
    let client = reqwest::Client::builder()
        .user_agent(format!("TrackEx-Agent/{}", env!("CARGO_PKG_VERSION")))
        .timeout(std::time::Duration::from_secs(30))
        .connect_timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    // Prepare login request
    let login_url = format!("{}/api/auth/employee-login", request.server_url.trim_end_matches('/'));
    let login_data = serde_json::json!({
        "email": request.email,
        "password": request.password
    });

    // Make login request
    let response = client
        .post(&login_url)
        .header("Content-Type", "application/json")
        .json(&login_data)
        .send()
        .await
        .map_err(|e| {
            if e.is_connect() {
                "Cannot connect to server. Please check your network connection.".to_string()
            } else if e.is_timeout() {
                "Connection timeout. Please check your network connection.".to_string()
            } else {
                format!("Network error: {}", e)
            }
        })?;

    if response.status().is_success() {
        let login_response: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        if let Some(employee) = login_response.get("employee") {
            let employee_id = employee.get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing employee ID")?;

            // Now register device for this employee
            let device_name = get_device_name();
            let platform_name = get_platform_name();
            let os_version = get_os_version();
            
            // Get or create a stable device UUID to prevent duplicate device records
            let device_uuid = match crate::storage::database::get_or_create_device_uuid() {
                Ok(uuid) => Some(uuid),
                Err(e) => {
                    log::warn!("Failed to get/create device UUID: {}", e);
                    None
                }
            };
            
            let device_data = serde_json::json!({
                "employeeId": employee_id,
                "deviceName": device_name,
                "platform": platform_name,
                "osVersion": os_version,
                "appVersion": env!("CARGO_PKG_VERSION"),
                "deviceUuid": device_uuid // Stable UUID for device matching
            });

            let register_url = format!("{}/api/devices/employee-register", request.server_url.trim_end_matches('/'));
            let device_response = client
                .post(&register_url)
                .header("Content-Type", "application/json")
                .json(&device_data)
                .send()
                .await
                .map_err(|e| format!("Device registration error: {}", e))?;

            // Handle both success (200) and "no license" (402) responses
            // We want to complete login even without a license so the agent can receive activation events
            let device_status = device_response.status();
            let has_no_license = device_status.as_u16() == 402;
            
            if device_response.status().is_success() || has_no_license {
                let device_result: serde_json::Value = device_response
                    .json()
                    .await
                    .map_err(|e| format!("Failed to parse device response: {}", e))?;

                if let Some(device) = device_result.get("device") {
                    let device_id = device.get("id")
                        .and_then(|v| v.as_str())
                        .ok_or("Missing device ID")?;

                    let device_token = device.get("token")
                        .and_then(|v| v.as_str())
                        .ok_or("Missing device token")?;

                    // Store credentials securely
                    {
                        let mut app_state = state.lock().await;
                        app_state.server_url = Some(request.server_url.clone());
                        app_state.device_token = Some(device_token.to_string());
                        app_state.device_id = Some(device_id.to_string());
                        app_state.email = Some(request.email.clone());
                        app_state.employee_id = Some(employee_id.to_string());
                    }

                    // Sync device token to global app state for background services
                    if let Err(e) = crate::storage::sync_device_token_to_global(
                        device_token.to_string(),
                        device_id.to_string(),
                        request.email.clone(),
                        request.server_url.clone(),
                        employee_id.to_string(),
                    ).await {
                        log::error!("Failed to sync device token to global state1: {}", e);
                    }

                    // NOTE: Do NOT start background services on login!
                    // Background services (heartbeat, app tracking, etc.) should only start when
                    // user explicitly clocks in. This prevents "Online Now" appearing without clock-in.
                    // The clock_in command handles starting background services.
                    let _ = app_handle; // Suppress unused variable warning

                    // Store complete session data in secure storage for persistence
                    let session_data = crate::storage::secure_store::SessionData {
                        device_token: device_token.to_string(),
                        email: request.email.clone(),
                        device_id: device_id.to_string(),
                        server_url: request.server_url.clone(),
                        employee_id: Some(employee_id.to_string()),
                    };
                    
                    if let Err(e) = crate::storage::secure_store::store_session_data(&session_data).await {
                        log::warn!("Failed to store session data securely: {}", e);
                    }
                    
                    // Also store device token separately for backward compatibility
                    if let Err(e) = crate::storage::secure_store::store_device_token(&device_token).await {
                        log::warn!("Failed to store device token securely: {}", e);
                    }
                    
                    // Store session metadata in SQLite as backup (not the token, just metadata)
                    let cache_entry = crate::storage::database::SessionCacheEntry {
                        email: request.email.clone(),
                        device_id: device_id.to_string(),
                        server_url: request.server_url.clone(),
                        employee_id: Some(employee_id.to_string()),
                        last_validated_at: Some(chrono::Utc::now().to_rfc3339()),
                    };
                    if let Err(e) = crate::storage::database::store_session_cache(&cache_entry) {
                        log::warn!("Failed to store session cache in SQLite: {}", e);
                    }

                    // Clear any existing active sessions to ensure clean state
                    if let Err(e) = crate::storage::work_session::clear_all_active_sessions().await {
                        log::warn!("Failed to clear existing active sessions: {}", e);
                    }

                    // Reset app usage tracker to prevent stale sessions from causing large duration calculations
                    if let Err(e) = crate::storage::app_usage::reset_tracker().await {
                        log::warn!("Failed to reset app usage tracker: {}", e);
                    }

                    // Start license SSE stream to receive real-time license updates
                    // This is started BEFORE checking license so agent can receive activation events
                    crate::sampling::license_stream::start_license_stream(state.inner().clone()).await;

                    // If device registration returned 402, set license_valid to false
                    // but still complete login so agent can receive license activation events
                    if has_no_license {
                        log::warn!("Device registered but no valid license. Starting in limited mode.");
                        let mut app_state = state.lock().await;
                        app_state.license_valid = Some(false);
                        app_state.license_status = Some("NO_LICENSE".to_string());
                        // Note: Login still succeeds so license stream can receive activation
                    }

                    return Ok(AuthStatus {
                        is_authenticated: true,
                        email: Some(request.email),
                        device_id: Some(device_id.to_string()),
                    });
                }
            } else {
                // Device registration failed with a real error (not 402, which we handle above)
                let status = device_response.status();
                let error_text = device_response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                
                log::error!("Device registration failed: {} - {}", status, error_text);
                return Err(format!("Device registration failed: {}", error_text));
            }
        }
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        
        // Provide more specific error messages based on status code
        let error_message = match status.as_u16() {
            401 => "Invalid email or password. Please check your credentials.",
            402 => {
                // 402 Payment Required - No valid license
                // Parse the error response to get the license status
                if error_text.contains("NO_VALID_LICENSE") {
                    "NO_VALID_LICENSE: Your organization needs to activate a license for your account before you can use the desktop agent. Please contact your administrator."
                } else {
                    "Payment required. Please contact your administrator to activate your license."
                }
            },
            404 => "Server not found. Please check your network connection.",
            500 => "Server error. Please try again later.",
            _ => &error_text
        };
        
        return Err(format!("Login failed ({}): {}", status, error_message));
    }

    Err("Login failed".to_string())
}

#[tauri::command]
pub async fn logout(state: State<'_, Arc<Mutex<AppState>>>) -> Result<(), String> {
    log::info!("Logout: Starting logout process");

    // ✅ FIRST: Check if user has an active work session and clock them out
    // This must happen BEFORE clearing credentials, otherwise the clock_out API call will fail
    if crate::storage::work_session::is_session_active().await.unwrap_or(false) {
        log::info!("Logout: User is clocked in, performing automatic clock-out");
        
        // End local app usage session first
        if let Err(e) = crate::storage::app_usage::end_current_session().await {
            log::warn!("Logout: Failed to end current app session: {}", e);
        }

        // Send a final app focus event to close any open app usage entries
        if let Ok(Some(current_app)) = crate::commands::get_current_app().await {
            log::info!("Logout: Sending final app focus event to close open entries");
            let event_data = serde_json::json!({
                "app_name": current_app.name,
                "app_id": current_app.app_id,
                "window_title": current_app.window_title,
                "timestamp": chrono::Utc::now().to_rfc3339()
            });
            if let Err(e) = crate::sampling::send_event_to_backend("app_focus", &event_data).await {
                log::warn!("Logout: Failed to send final app focus event: {}", e);
            }
        }

        // Process any remaining queued events before stopping
        log::info!("Logout: Processing remaining queued events");
        if let Ok(events) = crate::storage::offline_queue::get_pending_events().await {
            for event in events {
                match crate::sampling::send_event_to_backend(&event.event_type, &event.event_data).await {
                    Ok(_) => {
                        let _ = crate::storage::offline_queue::mark_event_processed(event.id).await;
                    }
                    Err(e) => {
                        log::warn!("Logout: Failed to send queued event {}: {}", event.id, e);
                        let _ = crate::storage::offline_queue::mark_event_failed(event.id).await;
                    }
                }
            }
        }

        // Process pending heartbeats
        if let Ok(heartbeats) = crate::storage::offline_queue::get_pending_heartbeats().await {
            for heartbeat in heartbeats {
                match crate::sampling::send_heartbeat_to_backend(&heartbeat.heartbeat_data).await {
                    Ok(_) => {
                        let _ = crate::storage::offline_queue::mark_heartbeat_processed(heartbeat.id).await;
                    }
                    Err(e) => {
                        log::warn!("Logout: Failed to send queued heartbeat {}: {}", heartbeat.id, e);
                        let _ = crate::storage::offline_queue::mark_heartbeat_failed(heartbeat.id).await;
                    }
                }
            }
        }

        // End local work session
        if let Err(e) = crate::storage::work_session::end_session().await {
            log::warn!("Logout: Failed to end local work session: {}", e);
        }

        // Send clock_out event to backend while we still have credentials
        let (server_url, device_token) = {
            let app_state = state.lock().await;
            (app_state.server_url.clone(), app_state.device_token.clone())
        };

        if let (Some(_server_url), Some(_device_token)) = (server_url, device_token) {
            if let Ok(client) = crate::api::client::ApiClient::new().await {
                let event_data = serde_json::json!({
                    "events": [{
                        "type": "clock_out",
                        "timestamp": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
                        "data": {
                            "source": "desktop_agent",
                            "reason": "logout"
                        }
                    }]
                });
                match client.post_with_auth("/api/ingest/events", &event_data).await {
                    Ok(response) => {
                        if response.status().is_success() {
                            log::info!("Logout: Successfully sent clock_out event to backend");
                        } else {
                            log::warn!("Logout: Clock_out event failed with status: {}", response.status());
                        }
                    }
                    Err(e) => {
                        log::warn!("Logout: Failed to send clock_out event: {}", e);
                    }
                }
            }
        }
        log::info!("Logout: Automatic clock-out completed");
    }

    // Clear in-memory state
    {
        let mut app_state = state.lock().await;
        app_state.device_token = None;
        app_state.device_id = None;
        app_state.email = None;
        app_state.server_url = None;
        app_state.employee_id = None;
        app_state.is_paused = false;
    }

    // Also clear global app state
    if let Ok(global_state) = crate::storage::get_global_app_state() {
        let mut state = global_state.lock().await;
        state.device_token = None;
        state.device_id = None;
        state.email = None;
        state.server_url = None;
        state.employee_id = None;
        state.is_paused = false;
    }

    // Stop all background services on logout
    log::info!("Logout: Stopping all background services");
    crate::sampling::stop_services().await;

    // Reset app usage tracker to clear any active sessions
    if let Err(e) = crate::storage::app_usage::reset_tracker().await {
        log::warn!("Failed to reset app usage tracker on logout: {}", e);
    }

    // Reset idle state to prevent stale idle events
    crate::sampling::reset_idle_state();

    // Clear stored session data
    if let Err(e) = crate::storage::secure_store::delete_session_data().await {
        log::warn!("Failed to clear stored session data: {}", e);
    }
    
    // Also clear device token for backward compatibility
    if let Err(e) = crate::storage::secure_store::delete_device_token().await {
        log::warn!("Failed to clear stored device token: {}", e);
    }
    
    // Clear SQLite session cache
    if let Err(e) = crate::storage::database::clear_session_cache() {
        log::warn!("Failed to clear SQLite session cache: {}", e);
    }

    Ok(())
}

#[tauri::command]
pub async fn get_auth_status(
    state: State<'_, Arc<Mutex<AppState>>>,
    app_handle: tauri::AppHandle,
) -> Result<AuthStatus, String> {
    let app_state = state.lock().await;
    
    // First check in-memory state
    if app_state.device_token.is_some() && app_state.email.is_some() && app_state.server_url.is_some() {
        let token = app_state.device_token.as_ref().unwrap().clone();
        let email = app_state.email.as_ref().unwrap().clone();
        let device_id = app_state.device_id.as_ref().unwrap().clone();
        let server_url = app_state.server_url.as_ref().unwrap().clone();
        
        // Validate token with server
        drop(app_state); // Release lock for async operation
        
        match validate_token_with_server(&server_url, &token).await {
            Ok(true) => {
                // Token is valid
                let _ = crate::storage::database::update_session_cache_validation();
                
                // Start license SSE stream for real-time license updates
                crate::sampling::license_stream::start_license_stream(state.inner().clone()).await;
                
                // Only start services if there's an active work session
                if crate::storage::work_session::is_session_active().await.unwrap_or(false) {
                    tokio::spawn(async move {
                        crate::sampling::start_all_background_services(app_handle).await;
                    });
                }

                return Ok(AuthStatus {
                    is_authenticated: true,
                    email: Some(email),
                    device_id: Some(device_id),
                });
            }
            Ok(false) => {
                // Token is explicitly invalid, clear session
                log::info!("In-memory token is invalid, clearing session");
                let mut app_state = state.lock().await;
                app_state.device_token = None;
                app_state.email = None;
                app_state.device_id = None;
                app_state.server_url = None;
                app_state.employee_id = None;
                
                // Clear stored session data
                let _ = crate::storage::secure_store::delete_session_data().await;
                let _ = crate::storage::database::clear_session_cache();
            }
            Err(e) => {
                // Network error - allow offline access with cached session
                log::info!("Network error during in-memory token validation: {} - allowing offline access", e);
                
                // Start license SSE stream for real-time license updates (will retry on network restore)
                crate::sampling::license_stream::start_license_stream(state.inner().clone()).await;
                
                // Only start services if there's an active work session
                if crate::storage::work_session::is_session_active().await.unwrap_or(false) {
                    tokio::spawn(async move {
                        crate::sampling::start_all_background_services(app_handle).await;
                    });
                }

                return Ok(AuthStatus {
                    is_authenticated: true,
                    email: Some(email),
                    device_id: Some(device_id),
                });
            }
        }
    } else {
        drop(app_state); // Release lock for async operation
    }
    
    // Try to restore session from secure storage with timeout
    // Increased timeout to 10 seconds to allow for macOS keychain permission dialogs
    log::info!("Attempting to restore session from secure storage...");
    let restore_result = tokio::time::timeout(
        std::time::Duration::from_secs(10),
        crate::storage::secure_store::get_session_data()
    ).await;
    
    match restore_result {
        Ok(Ok(Some(session_data))) => {
            log::info!("Found stored session in secure storage, validating...");
            // Validate restored token with server
            match validate_token_with_server(&session_data.server_url, &session_data.device_token).await {
                Ok(is_valid) => {
                    if is_valid {
                        return restore_session_to_memory(
                            state.clone(),
                            app_handle,
                            session_data.device_token,
                            session_data.email,
                            session_data.device_id,
                            session_data.server_url,
                            session_data.employee_id,
                        ).await;
                    } else {
                        log::warn!("Stored token is invalid, clearing session");
                        let _ = crate::storage::secure_store::delete_session_data().await;
                        let _ = crate::storage::database::clear_session_cache();
                    }
                }
                Err(e) => {
                    log::warn!("Token validation failed: {}", e);
                    // On network error, still allow cached session (offline-first)
                    log::info!("Network error during validation - allowing cached session for offline use");
                    return restore_session_to_memory(
                        state.clone(),
                        app_handle,
                        session_data.device_token,
                        session_data.email,
                        session_data.device_id,
                        session_data.server_url,
                        session_data.employee_id,
                    ).await;
                }
            }
        }
        Ok(Ok(None)) => {
            log::info!("No stored session found in secure storage, checking SQLite cache...");
        }
        Ok(Err(e)) => {
            log::error!("Error retrieving stored session from secure storage: {}", e);
            log::info!("Falling back to SQLite session cache...");
        }
        Err(_) => {
            log::error!("Timeout retrieving stored session (keychain access may be blocked)");
            log::info!("Falling back to SQLite session cache...");
        }
    }
    
    // Fallback: Try to restore from SQLite session cache
    // This is useful when:
    // 1. Secure storage fails or times out
    // 2. On Windows where secure storage may have issues
    // Note: SQLite cache doesn't store the token, so we need to check if secure storage has the token
    if let Ok(Some(cache_entry)) = crate::storage::database::get_session_cache() {
        log::info!("Found session cache in SQLite for {}, attempting token retrieval...", cache_entry.email);
        
        // Try to get the device token from secure storage
        if let Ok(Some(device_token)) = crate::storage::secure_store::get_device_token().await {
            log::info!("Retrieved device token from secure storage, validating...");
            
            // Validate the token
            match validate_token_with_server(&cache_entry.server_url, &device_token).await {
                Ok(is_valid) => {
                    if is_valid {
                        log::info!("SQLite cache + secure token validated successfully");
                        return restore_session_to_memory(
                            state.clone(),
                            app_handle,
                            device_token,
                            cache_entry.email,
                            cache_entry.device_id,
                            cache_entry.server_url,
                            cache_entry.employee_id,
                        ).await;
                    } else {
                        log::warn!("Token from SQLite fallback is invalid, clearing all session data");
                        let _ = crate::storage::secure_store::delete_session_data().await;
                        let _ = crate::storage::secure_store::delete_device_token().await;
                        let _ = crate::storage::database::clear_session_cache();
                    }
                }
                Err(e) => {
                    log::warn!("Token validation failed during SQLite fallback: {}", e);
                    // On network error, allow cached session for offline use
                    log::info!("Network error - allowing SQLite cached session for offline use");
                    return restore_session_to_memory(
                        state.clone(),
                        app_handle,
                        device_token,
                        cache_entry.email,
                        cache_entry.device_id,
                        cache_entry.server_url,
                        cache_entry.employee_id,
                    ).await;
                }
            }
        } else {
            log::warn!("SQLite cache exists but no device token in secure storage - session cannot be restored");
            // Clear the orphaned cache entry
            let _ = crate::storage::database::clear_session_cache();
        }
    }
    
    // No valid session found, user needs to login
    log::info!("No valid session found - user needs to login");
    Ok(AuthStatus {
        is_authenticated: false,
        email: None,
        device_id: None,
    })
}

/// Response for get_device_token command
#[derive(Debug, serde::Serialize)]
pub struct DeviceTokenResponse {
    pub device_token: Option<String>,
    pub server_url: Option<String>,
}

/// Get the device token for SSE authentication
/// This is used by the frontend to connect to authenticated SSE endpoints
#[tauri::command]
pub async fn get_device_token(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<DeviceTokenResponse, String> {
    let app_state = state.lock().await;
    
    Ok(DeviceTokenResponse {
        device_token: app_state.device_token.clone(),
        server_url: app_state.server_url.clone(),
    })
}

/// Helper function to restore session data to memory and return authenticated status
/// Also checks backend for active work session and syncs local state
async fn restore_session_to_memory(
    state: State<'_, Arc<Mutex<AppState>>>,
    app_handle: tauri::AppHandle,
    device_token: String,
    email: String,
    device_id: String,
    server_url: String,
    employee_id: Option<String>,
) -> Result<AuthStatus, String> {
    let mut app_state = state.lock().await;
    
    // Restore ALL session data to memory
    app_state.device_token = Some(device_token.clone());
    app_state.email = Some(email.clone());
    app_state.device_id = Some(device_id.clone());
    app_state.server_url = Some(server_url.clone());
    app_state.employee_id = employee_id.clone();
    
    drop(app_state); // Release lock

    // Sync device token to global app state for background services
    if let Some(ref emp_id) = employee_id {
        if let Err(e) = crate::storage::sync_device_token_to_global(
            device_token.clone(),
            device_id.clone(),
            email.clone(),
            server_url.clone(),
            emp_id.clone(),
        ).await {
            log::error!("Failed to sync device token to global state: {}", e);
        }

        // Clear any existing active sessions to ensure clean state
        if let Err(e) = crate::storage::work_session::clear_all_active_sessions().await {
            log::warn!("Failed to clear existing active sessions: {}", e);
        }

        // Reset app usage tracker to prevent stale sessions from causing large duration calculations
        if let Err(e) = crate::storage::app_usage::reset_tracker().await {
            log::warn!("Failed to reset app usage tracker: {}", e);
        }
        
        // CRITICAL: Check backend for active work session
        // If user was clocked in before app restart, we need to:
        // 1. Restore local clock-in state
        // 2. Start background services to resume SSE streaming
        log::info!("Checking backend for active work session...");
        
        match crate::api::client::check_backend_active_session(&server_url, &device_token).await {
            Ok(response) => {
                if response.has_active_session {
                    log::info!("Backend has active session! Restoring local clock-in state and starting services");
                    
                    // Restore local work session state
                    if let Err(e) = crate::storage::work_session::start_session().await {
                        log::warn!("Failed to restore local work session: {}", e);
                    } else {
                        log::info!("Local work session restored successfully");
                    }
                    
                    // Start background services to resume SSE streaming
                    let app_handle_clone = app_handle.clone();
                    tokio::spawn(async move {
                        log::info!("Starting background services after session restoration...");
                        crate::sampling::start_all_background_services(app_handle_clone).await;
                        log::info!("Background services started - SSE streaming should resume");
                    });
                } else {
                    log::info!("No active session on backend - user needs to clock in");
                }
            }
            Err(e) => {
                // Network error - can't determine backend state
                // This is okay - user will need to manually clock in if needed
                log::warn!("Failed to check backend for active session: {}", e);
                log::info!("Offline or network error - user may need to clock in manually");
            }
        }
    }
    
    // Update session cache validation timestamp
    let _ = crate::storage::database::update_session_cache_validation();
    
    // Start license SSE stream for real-time license updates
    // This is critical for receiving seat activation events even after app restart
    crate::sampling::license_stream::start_license_stream(state.inner().clone()).await;
    
    log::info!("Session restored successfully");
    
    Ok(AuthStatus {
        is_authenticated: true,
        email: Some(email),
        device_id: Some(device_id),
    })
}

// Helper function to validate token with server
// Returns Ok(true) if token is valid
// Returns Ok(false) if token is explicitly invalid (server rejected it)
// Returns Err if there was a network/connectivity issue (caller can decide to allow offline access)
async fn validate_token_with_server(server_url: &str, token: &str) -> Result<bool, String> {
    // Add timeout to prevent hanging
    let client = reqwest::Client::builder()
        .user_agent(format!("TrackEx-Agent/{}", env!("CARGO_PKG_VERSION")))
        .timeout(std::time::Duration::from_secs(10))
        .connect_timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let url = format!("{}/api/auth/validate", server_url.trim_end_matches('/'));
    
    match client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                // Parse response to confirm valid: true
                if let Ok(json) = response.json::<serde_json::Value>().await {
                    let is_valid = json.get("valid").and_then(|v| v.as_bool()).unwrap_or(false);
                    log::info!("Token validation result: {}", if is_valid { "valid" } else { "invalid" });
                    return Ok(is_valid);
                }
                // If we can't parse the response, assume valid since request succeeded
                Ok(true)
            } else {
                // Server explicitly rejected the token
                log::info!("Token validation failed with status: {}", response.status());
                Ok(false)
            }
        }
        Err(e) => {
            // Network error - return Err so caller can decide to allow offline access
            log::warn!("Network error during token validation: {}", e);
            if e.is_connect() || e.is_timeout() {
                Err(format!("Network connectivity issue: {}", e))
            } else {
                // Other errors (DNS, SSL, etc.) - also treat as connectivity issue
                Err(format!("Network error: {}", e))
            }
        }
    }
}

#[tauri::command]
pub async fn clear_local_database() -> Result<(), String> {
    log::info!("Clearing local database...");
    let conn = crate::storage::database::get_connection()
        .map_err(|e| format!("Failed to get database connection: {}", e))?;
    
    // Clear all tables
    conn.execute("DELETE FROM app_usage_sessions", [])
        .map_err(|e| format!("Failed to clear app_usage_sessions: {}", e))?;
    
    conn.execute("DELETE FROM work_sessions", [])
        .map_err(|e| format!("Failed to clear work_sessions: {}", e))?;
    
    conn.execute("DELETE FROM offline_queue", [])
        .map_err(|e| format!("Failed to clear offline_queue: {}", e))?;

    // Clear event and heartbeat queues to prevent residual sends
    conn.execute("DELETE FROM event_queue", [])
        .map_err(|e| format!("Failed to clear event_queue: {}", e))?;
    conn.execute("DELETE FROM heartbeat_queue", [])
        .map_err(|e| format!("Failed to clear heartbeat_queue: {}", e))?;
    
    // Reset auto-increment counters
    conn.execute("DELETE FROM sqlite_sequence WHERE name IN ('app_usage_sessions', 'work_sessions', 'offline_queue', 'event_queue', 'heartbeat_queue')", [])
        .map_err(|e| format!("Failed to reset auto-increment counters: {}", e))?;

    log::info!("Local database cleared successfully - all tables and sequences reset");
    
    Ok(())
}

#[tauri::command]
pub async fn get_recent_sessions(state: State<'_, Arc<Mutex<AppState>>>) -> Result<serde_json::Value, String> {
    let (server_url, device_token) = {
        let app_state = state.lock().await;
        (app_state.server_url.clone(), app_state.device_token.clone())
    };

    if let (Some(server_url), Some(device_token)) = (server_url, device_token) {
        let client = reqwest::Client::builder()
            .user_agent(format!("TrackEx-Agent/{}", env!("CARGO_PKG_VERSION")))
            .build()
            .map_err(|e| format!("Failed to build client: {}", e))?;
        
        // Call real API to get recent sessions
        let url = format!("{}/api/employees/sessions/recent", server_url);
        
        match client
            .get(&url)
            .header("Authorization", format!("Bearer {}", device_token))
            .send()
            .await
        {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<serde_json::Value>().await {
                        Ok(sessions_data) => {
                            return Ok(sessions_data);
                        }
                        Err(e) => {
                            log::error!("Failed to parse sessions response: {}", e);
                        }
                    }
                } else {
                    log::error!("API request failed with status: {}", response.status());
                }
            }
            Err(e) => {
                log::error!("Failed to fetch sessions from API: {}", e);
            }
        }
        
        // Return empty sessions if API call fails
        return Ok(serde_json::json!({
            "sessions": []
        }));
    }

    Err("Not authenticated".to_string())
}

#[tauri::command]
pub async fn accept_consent(version: String) -> Result<(), String> {
    // Initialize database first
    if let Err(e) = crate::storage::database::init().await {
        log::error!("Failed to initialize database: {}", e);
        return Err(format!("Failed to initialize database: {}", e));
    }
    
    match consent::accept_consent(&version).await {
        Ok(_) => {
            Ok(())
        }
        Err(e) => {
            log::error!("Failed to accept consent: {}", e);
            Err(format!("Failed to accept consent: {}", e))
        }
    }
}

#[tauri::command]
pub async fn get_consent_status() -> Result<ConsentStatus, String> {
    // Initialize database first with timeout
    let db_init_result = tokio::time::timeout(
        std::time::Duration::from_secs(5),
        crate::storage::database::init()
    ).await;
    
    match db_init_result {
        Ok(Ok(_)) => {
            log::info!("Database initialized successfully");
        }
        Ok(Err(e)) => {
            log::error!("Failed to initialize database: {}", e);
            return Err(format!("Failed to initialize database: {}", e));
        }
        Err(_) => {
            log::error!("Timeout initializing database");
            return Err("Database initialization timeout".to_string());
        }
    }
    
    // Get consent status with timeout
    let consent_result = tokio::time::timeout(
        std::time::Duration::from_secs(3),
        consent::get_consent_status()
    ).await;
    
    match consent_result {
        Ok(Ok(status)) => Ok(ConsentStatus {
            accepted: status.accepted,
            accepted_at: status.accepted_at.map(|dt| dt.to_rfc3339()),
            version: status.version,
        }),
        Ok(Err(e)) => {
            log::error!("Failed to get consent status: {}", e);
            Err(format!("Failed to get consent status: {}", e))
        }
        Err(_) => {
            log::error!("Timeout getting consent status");
            Err("Consent status check timeout".to_string())
        }
    }
}

#[tauri::command]
pub async fn clock_in(state: State<'_, Arc<Mutex<AppState>>>, app_handle: tauri::AppHandle) -> Result<(), String> {
    
    // ✅ 1. Save to LOCAL database first
    let session_id = crate::storage::work_session::start_session().await
        .map_err(|e| format!("Failed to start local session: {}", e))?;
    
    log::info!("Clock in: Local session started with ID {}", session_id);
    
    let (server_url, device_token) = {
        let app_state = state.lock().await;
        (app_state.server_url.clone(), app_state.device_token.clone())
    };

    if let (Some(_server_url), Some(_device_token)) = (server_url, device_token) {
        // ✅ 2. Send clock_in event to REMOTE backend
        let client = match crate::api::client::ApiClient::new().await {
            Ok(client) => client,
            Err(e) => return Err(format!("Failed to create API client: {}", e)),
        };
        
        let event_data = serde_json::json!({
            "events": [{
                "type": "clock_in",
                "timestamp": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
                "data": {
                    "session_id": session_id,
                    "source": "desktop_agent"
                }
            }]
        });

        let response = client
            .post_with_auth("/api/ingest/events", &event_data)
            .await
            .map_err(|e| format!("Network error: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("Clock in failed: {}", error_text));
        }

        // ✅ 3. Start background services now that user is clocked in
        log::info!("Clock in: Starting background services");
        tokio::spawn(async move {
            crate::sampling::start_all_background_services(app_handle).await;
        });
        
        // ✅ 4. Start license monitoring service
        log::info!("Clock in: Starting license monitoring service");
        crate::sampling::license_monitor::start_license_monitor().await;

    } else {
        return Err("Not authenticated. Please login first.".to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn clock_out(state: State<'_, Arc<Mutex<AppState>>>) -> Result<(), String> {
    
    log::info!("Clock out: Ending local session");
    
    // End local app usage session
    if let Err(e) = crate::storage::app_usage::end_current_session().await {
        log::warn!("Failed to end current app session: {}", e);
    }
    
    // Send a final app focus event to ensure any open app usage entries are closed on the backend
    // This prevents the issue where the last app usage entry remains open with endTime: null
    if let Ok(Some(current_app)) = crate::commands::get_current_app().await {
        log::info!("Clock out: Sending final app focus event to close open entries");
        
        let event_data = serde_json::json!({
            "app_name": current_app.name,
            "app_id": current_app.app_id,
            "window_title": current_app.window_title,
            "timestamp": chrono::Utc::now().to_rfc3339()
        });

        match crate::sampling::send_event_to_backend("app_focus", &event_data).await {
            Ok(_) => {
                log::info!("✓ Final app focus event sent to close open entries");
            }
            Err(e) => {
                log::warn!("Failed to send final app focus event: {}", e);
            }
        }
    }
    
    // ✅ 1. Process any remaining queued events before stopping services
    log::info!("Clock out: Processing remaining queued events");
    
    // Process pending events
    if let Ok(events) = crate::storage::offline_queue::get_pending_events().await {
        for event in events {
            match crate::sampling::send_event_to_backend(&event.event_type, &event.event_data).await {
                Ok(_) => {
                    let _ = crate::storage::offline_queue::mark_event_processed(event.id).await;
                    log::info!("Clock out: Processed queued event {}", event.id);
                }
                Err(e) => {
                    log::warn!("Clock out: Failed to send queued event {}: {}", event.id, e);
                    let _ = crate::storage::offline_queue::mark_event_failed(event.id).await;
                }
            }
        }
    }
    
    // Process pending heartbeats
    if let Ok(heartbeats) = crate::storage::offline_queue::get_pending_heartbeats().await {
        for heartbeat in heartbeats {
            match crate::sampling::send_heartbeat_to_backend(&heartbeat.heartbeat_data).await {
                Ok(_) => {
                    let _ = crate::storage::offline_queue::mark_heartbeat_processed(heartbeat.id).await;
                    log::info!("Clock out: Processed queued heartbeat {}", heartbeat.id);
                }
                Err(e) => {
                    log::warn!("Clock out: Failed to send queued heartbeat {}: {}", heartbeat.id, e);
                    let _ = crate::storage::offline_queue::mark_heartbeat_failed(heartbeat.id).await;
                }
            }
        }
    }
    
    // ✅ 2. Stop background services after processing all queued events
    crate::sampling::stop_services().await;
    log::info!("Clock out: Background services stopped");
    
    // Stop license monitoring service
    crate::sampling::license_monitor::stop_license_monitor().await;
    log::info!("Clock out: License monitoring service stopped");

    // Reset idle state to prevent stale idle events
    crate::sampling::reset_idle_state();
    
    // ✅ 3. End LOCAL session
    crate::storage::work_session::end_session().await
        .map_err(|e| format!("Failed to end local session: {}", e))?;
    
    
    let (server_url, device_token) = {
        let app_state = state.lock().await;
        (app_state.server_url.clone(), app_state.device_token.clone())
    };

    if let (Some(_server_url), Some(_device_token)) = (server_url, device_token) {
        // ✅ 2. Send clock_out event to REMOTE backend
        let client = match crate::api::client::ApiClient::new().await {
            Ok(client) => client,
            Err(e) => return Err(format!("Failed to create API client: {}", e)),
        };
        
        let event_data = serde_json::json!({
            "events": [{
                "type": "clock_out",
                "timestamp": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
                "data": {
                    "source": "desktop_agent"
                }
            }]
        });

        let response = client
            .post_with_auth("/api/ingest/events", &event_data)
            .await
            .map_err(|e| format!("Network error: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("Clock out failed: {}", error_text));
        }
        

    } else {
        return Err("Not authenticated. Please login first.".to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn get_work_session(state: State<'_, Arc<Mutex<AppState>>>) -> Result<WorkSessionInfo, String> {
    let (server_url, device_token, employee_id) = {
        let app_state = state.lock().await;
        (app_state.server_url.clone(), app_state.device_token.clone(), app_state.employee_id.clone())
    };

    if let (Some(_server_url), Some(_device_token), Some(_employee_id)) = (server_url, device_token, employee_id) {
        // Fetch current work session from backend
        let client = match crate::api::client::ApiClient::new().await {
            Ok(client) => client,
            Err(_) => {
                // If API client creation fails, check local database
                log::warn!("Failed to create API client, using local state");
                if let Ok(Some(local_session)) = crate::storage::work_session::get_current_session().await {
                    let current_app = match get_current_app().await {
                        Ok(Some(app)) => Some(app.name),
                        _ => None
                    };
                    return Ok(WorkSessionInfo {
                        is_active: true,
                        started_at: Some(local_session.started_at.to_rfc3339()),
                        current_app,
                        idle_time_seconds: 0,
                        is_paused: false,
                    });
                }
                return Ok(WorkSessionInfo {
                    is_active: false,
                    started_at: None,
                    current_app: Some("TrackEx Agent".to_string()),
                    idle_time_seconds: 0,
                    is_paused: false,
                });
            }
        };
        
        // Get today's date range in Z format (easier to parse)
        let today = chrono::Utc::now().date_naive();
        let start_date = today.and_hms_opt(0, 0, 0).unwrap().and_utc().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
        let end_date = today.and_hms_opt(23, 59, 59).unwrap().and_utc().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
        
        let url_with_params = format!("/api/devices/sessions?startDate={}&endDate={}", start_date, end_date);
       
        match client.get_with_auth(&url_with_params).await {
            Ok(response) if response.status().is_success() => {
                if let Ok(sessions_data) = response.json::<serde_json::Value>().await {
                    if let Some(sessions) = sessions_data.get("sessions").and_then(|s| s.as_array()) {
                        // Find active session (no clock_out)
                        for session in sessions {
                            let clock_out = session.get("clockOut");
                            let is_active = clock_out.is_none() || clock_out.and_then(|v| v.as_str()).is_none() || clock_out == Some(&serde_json::Value::Null);
                            if is_active {
                                // Active session found
                                let started_at = session.get("clockIn")
                                    .and_then(|v| v.as_str())
                                    .map(|s| s.to_string());
                                
                                // Get current app for active session
                                let current_app = match get_current_app().await {
                                    Ok(Some(app)) => Some(app.name),
                                    _ => None
                                };
                                return Ok(WorkSessionInfo {
                                    is_active: true,
                                    started_at,
                                    current_app,
                                    idle_time_seconds: 0,
                                    is_paused: false,
                                });
                            }
                        }
                    }
                }
            }
            _ => {
                // If we can't fetch from backend, fall back to local state
                log::warn!("Failed to fetch work session from backend, using local state");
                
                // Check local SQLite database for active session
                if let Ok(Some(local_session)) = crate::storage::work_session::get_current_session().await {
                    
                    // Get current app for active session
                    let current_app = match get_current_app().await {
                        Ok(Some(app)) => Some(app.name),
                        _ => None
                    };
                    
                    return Ok(WorkSessionInfo {
                        is_active: true,
                        started_at: Some(local_session.started_at.to_rfc3339()),
                        current_app,
                        idle_time_seconds: 0,
                        is_paused: false,
                    });
                }
            }
        }
    }
    
    // No active session or failed to fetch
    Ok(WorkSessionInfo {
        is_active: false,
        started_at: None,
        current_app: Some("TrackEx Agent".to_string()),
        idle_time_seconds: 0,
        is_paused: false,
    })
}





#[tauri::command]
pub async fn get_tracking_status(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<TrackingStatus, String> {
    let app_state = state.lock().await;
    let is_authenticated = app_state.device_token.is_some();
    
    Ok(TrackingStatus {
        is_tracking: is_authenticated,
        is_paused: app_state.is_paused,
        current_app: Some("TrackEx Agent".to_string()),
        idle_time_seconds: 0,
    })
}

#[tauri::command]
pub async fn take_screenshot() -> Result<String, String> {
    // Use the cross-platform screen capture module
    match crate::screenshots::screen_capture::capture_screen().await {
        Ok(base64_data) => {
            // Add data URI prefix if not already present
            if base64_data.starts_with("data:image/") {
                Ok(base64_data)
            } else {
                Ok(format!("data:image/jpeg;base64,{}", base64_data))
            }
        }
        Err(e) => {
            log::error!("Failed to capture screenshot: {}", e);
            Err(format!("Failed to capture screenshot: {}", e))
        }
    }
}

// Helper function to check if an app is the TrackEx Agent itself
fn is_trackex_agent(app_name: &str, app_id: &str, window_title: Option<&str>) -> bool {
    let app_name_lower = app_name.to_lowercase();
    let app_id_lower = app_id.to_lowercase();
    
    // IMPORTANT: Be very specific to avoid false positives
    // (e.g., Cursor with "trackex-desktop-agent" folder open shouldn't match)
    
    // Check app name - must be specifically "TrackEx Agent" or similar (not just containing the words)
    if app_name_lower == "trackex agent" 
        || app_name_lower == "trackex-agent" 
        || app_name_lower == "trackex_agent" {
        return true;
    }
    
    // Check app ID / bundle ID / executable name - must be the exact TrackEx executable
    if app_id_lower == "trackex-agent.exe" 
        || app_id_lower == "trackex_agent.exe"
        || app_id_lower == "trackex-agent"
        || app_id_lower == "trackex_agent"
        || app_id_lower.starts_with("com.trackex.agent")
        || app_id_lower.starts_with("com.nextup.trackex") {
        return true;
    }
    
    // Check window title ONLY if it's exactly "TrackEx Agent" or "TrackEx"
    // Do NOT check if it contains these words (to avoid false positives from folder names)
    if let Some(title) = window_title {
        let title_lower = title.trim().to_lowercase();
        if title_lower == "trackex agent" || title_lower == "trackex" {
            return true;
        }
    }
    
    false
}

#[tauri::command]
pub async fn get_current_app() -> Result<Option<AppInfo>, String> {
    // Strategy: Return the focused app, but if TrackEx is focused, return the last non-TrackEx app.
    // This ensures the UI always shows what the user is actually working on, even when viewing TrackEx.
    
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        
        // Get the frontmost application using AppleScript
        let app_name_result = Command::new("osascript")
            .arg("-e")
            .arg("tell application \"System Events\" to get name of first application process whose frontmost is true")
            .output();
            
        let bundle_id_result = Command::new("osascript")
            .arg("-e")
            .arg("tell application \"System Events\" to get bundle identifier of first application process whose frontmost is true")
            .output();
        
        // Get window title of the frontmost window
        let window_title_result = Command::new("osascript")
            .arg("-e")
            .arg("tell application \"System Events\" to get name of first window of first application process whose frontmost is true")
            .output();
            
        match (app_name_result, bundle_id_result) {
            (Ok(name_output), Ok(bundle_output)) => {
                let name = String::from_utf8_lossy(&name_output.stdout).trim().to_string();
                let bundle_id = String::from_utf8_lossy(&bundle_output.stdout).trim().to_string();
                
                // Extract window title
                let window_title = match window_title_result {
                    Ok(output) => {
                        let title = String::from_utf8_lossy(&output.stdout).trim().to_string();
                        if title.is_empty() { None } else { Some(title) }
                    }
                    Err(_) => None,
                };
                
                if !name.is_empty() {
                    // Extract browser URL/domain if this is a browser
                    let (url, domain) = {
                        use crate::sampling::browser_url::extract_browser_url;
                        use crate::api::employee_settings;
                        use crate::utils::privacy::UrlSanitizer;
                        
                        let url_info = extract_browser_url(
                            &name,
                            &bundle_id,
                            window_title.as_deref(), // Pass window title for domain extraction
                            None, // No hwnd on macOS
                        );
                        
                        // Apply browser domain only policy
                        let browser_domain_only = employee_settings::is_browser_domain_only().await;
                        let sanitizer = UrlSanitizer::new(browser_domain_only);
                        
                        if let Some(raw_url) = url_info.url.as_ref() {
                            sanitizer.sanitize(Some(raw_url))
                        } else if let Some(dom) = url_info.domain.as_ref() {
                            (Some(dom.clone()), Some(dom.clone()))
                        } else {
                            (None, None)
                        }
                    };
                    
                    let app_info = AppInfo {
                        name: name.to_string(),
                        app_id: bundle_id.to_string(),
                        window_title: window_title.or_else(|| Some("Active Window".to_string())),
                        url,
                        domain,
                    };
                    
                    // Check if this is the TrackEx Agent itself
                    let is_trackex = is_trackex_agent(&name, &bundle_id, None);
                    
                    log::debug!("App detection (macOS): name='{}', id='{}', window_title={:?}, url={:?}, domain={:?}, is_trackex={}", 
                        name, bundle_id, app_info.window_title, app_info.url, app_info.domain, is_trackex);
                    
                    if is_trackex {
                        // Return the last non-TrackEx app instead
                        log::debug!("TrackEx detected as foreground, returning last non-TrackEx app");
                        return Ok(crate::sampling::app_focus::get_last_non_trackex_app().await);
                    }
                    
                    // Save this as the last non-TrackEx app
                    crate::sampling::app_focus::set_last_non_trackex_app(app_info.clone()).await;
                    return Ok(Some(app_info));
                }
            }
            _ => {}
        }
        
        // Fallback to last non-TrackEx app if detection failed
        return Ok(crate::sampling::app_focus::get_last_non_trackex_app().await);
    }
    
    #[cfg(target_os = "windows")]
    {
        use crate::utils::windows_imports::*;
        use windows::Win32::Foundation::HWND;

        use sysinfo::{System};

        use crate::sampling::app_focus::get_windows_process_name;
        // Note: Shell API imports may not be available in this version
        // We'll use a simpler approach without UWP app detection

        unsafe {
            // Get handle to the foreground window
            let hwnd: HWND = GetForegroundWindow();
            if hwnd.0 == std::ptr::null_mut() {
                return Err("No active window".into());
            }
    
            // Get window title
            let mut title_buf = [0u16; 512];
            let len = GetWindowTextW(hwnd, &mut title_buf);
            let window_title = String::from_utf16_lossy(&title_buf[..len as usize]);
            let window_title = trim_nulls(&window_title);
    
            // Get process ID for identification
            let mut pid = 0u32;
            GetWindowThreadProcessId(hwnd, Some(&mut pid));

            if pid == 0 {
                return Err("Failed to get process ID".into()); // Could not get process ID
            }

            // First, try to detect if this is a UWP app by checking the window
            let mut app_name = None;
            let mut app_id = None;

            if let Some(uwp_package) = crate::sampling::app_focus::get_uwp_app_from_window(hwnd) {
                app_id = Some(uwp_package.clone());
                
                // Map package family name to friendly name
                app_name = match uwp_package.as_str() {
                    "Microsoft.WindowsCalculator_8wekyb3d8bbwe" => Some("Calculator".to_string()),
                    "Microsoft.XboxGamingOverlay_8wekyb3d8bbwe" => Some("Xbox Game Bar".to_string()),
                    "Microsoft.XboxApp_8wekyb3d8bbwe" => Some("Xbox".to_string()),
                    "Microsoft.WindowsStore_8wekyb3d8bbwe" => Some("Microsoft Store".to_string()),
                    "Microsoft.Windows.Settings_8wekyb3d8bbwe" => Some("Settings".to_string()),
                    "Microsoft.Windows.ShellExperienceHost_cw5n1h2txyewy" => Some("Start Menu".to_string()),
                    _ => Some(uwp_package), // Use package name as fallback
                };
            }

            // If not UWP, use classic Win32 detection
            if app_name.is_none() {
                let mut sys = System::new_all();
                sys.refresh_all(); // Refresh process information

                if let Some(process) = sys.process(sysinfo::Pid::from_u32(pid)) {
                    let pid = process.pid().as_u32();
                    
                    // Try to get friendly name via Windows API first
                    if let Some(name) = get_windows_process_name(pid) {
                        app_name = Some(trim_nulls(&name));
                        log::debug!("Got app name from get_windows_process_name: {}", name);
                    } else {
                        // Fallback: use sysinfo to get exe path and apply mapping
                        log::debug!("get_windows_process_name returned None, using sysinfo fallback");
                        
                        // Try to get exe path from sysinfo
                        if let Some(exe_path) = process.exe() {
                            let exe_path_str = exe_path.to_string_lossy().to_string();
                            log::debug!("Process exe path: {}", exe_path_str);
                            
                            // Apply the same mapping logic
                            let exe_lower = exe_path_str.to_lowercase();
                            
                            // Check known app mappings (same as in app_focus.rs)
                            if exe_lower.contains("cursor") {
                                app_name = Some("Cursor".to_string());
                            } else if exe_lower.contains("code.exe") || (exe_lower.contains("code") && exe_lower.contains("microsoft")) {
                                app_name = Some("Visual Studio Code".to_string());
                            } else if exe_lower.contains("chrome") && !exe_lower.contains("edge") {
                                app_name = Some("Google Chrome".to_string());
                            } else if exe_lower.contains("msedge") || (exe_lower.contains("edge") && !exe_lower.contains("edgeupdate")) {
                                app_name = Some("Microsoft Edge".to_string());
                            } else if exe_lower.contains("firefox") {
                                app_name = Some("Mozilla Firefox".to_string());
                            } else if exe_lower.contains("brave") {
                                app_name = Some("Brave Browser".to_string());
                            } else if exe_lower.contains("opera") {
                                app_name = Some("Opera".to_string());
                            } else if exe_lower.contains("explorer.exe") || exe_lower.ends_with("\\explorer.exe") {
                                app_name = Some("File Explorer".to_string());
                            } else if exe_lower.contains("notepad++") {
                                app_name = Some("Notepad++".to_string());
                            } else if exe_lower.contains("notepad.exe") && !exe_lower.contains("++") {
                                app_name = Some("Notepad".to_string());
                            } else if exe_lower.contains("devenv") {
                                app_name = Some("Visual Studio".to_string());
                            } else if exe_lower.contains("teams") {
                                app_name = Some("Microsoft Teams".to_string());
                            } else if exe_lower.contains("slack") {
                                app_name = Some("Slack".to_string());
                            } else if exe_lower.contains("discord") {
                                app_name = Some("Discord".to_string());
                            } else if exe_lower.contains("zoom") {
                                app_name = Some("Zoom".to_string());
                            } else if exe_lower.contains("spotify") {
                                app_name = Some("Spotify".to_string());
                            } else if exe_lower.contains("winword") {
                                app_name = Some("Microsoft Word".to_string());
                            } else if exe_lower.contains("excel") {
                                app_name = Some("Microsoft Excel".to_string());
                            } else if exe_lower.contains("powerpnt") {
                                app_name = Some("Microsoft PowerPoint".to_string());
                            } else if exe_lower.contains("outlook") {
                                app_name = Some("Microsoft Outlook".to_string());
                            } else {
                                // Final fallback: clean filename
                                if let Some(file_name) = exe_path.file_name() {
                                    let name = file_name.to_string_lossy().to_string();
                                    // Remove .exe extension
                                    app_name = Some(if name.to_lowercase().ends_with(".exe") {
                                        name[..name.len() - 4].to_string()
                                    } else {
                                        name
                                    });
                                }
                            }
                        }
                        
                        if app_name.is_none() {
                            let proc_name = trim_nulls(process.name());
                            log::debug!("Final fallback to process.name(): {}", proc_name);
                            // Remove .exe extension if present
                            app_name = Some(if proc_name.to_lowercase().ends_with(".exe") {
                                proc_name[..proc_name.len() - 4].to_string()
                            } else {
                                proc_name
                            });
                        }
                    }
                } else {
                    log::warn!("Could not find process with PID: {}", pid);
                }
                
                // Get app ID using Windows-specific logic
                app_id = crate::sampling::app_focus::get_windows_app_id(pid);
            }
            
            let final_app_name = app_name.unwrap_or_else(|| {
                log::warn!("No app name found, using Unknown");
                "Unknown".to_string()
            });
            let final_app_id = app_id.unwrap_or_else(|| format!("pid_{}", pid));
            
            // Extract browser URL if this is a browser app
            let (url, domain) = {
                use crate::sampling::browser_url::extract_browser_url;
                use crate::api::employee_settings;
                use crate::utils::privacy::UrlSanitizer;
                
                let url_info = extract_browser_url(
                    &final_app_name,
                    &final_app_id,
                    Some(&window_title),
                    Some(hwnd.0 as isize),
                );
                
                // Apply browser domain only policy
                let browser_domain_only = employee_settings::is_browser_domain_only().await;
                let sanitizer = UrlSanitizer::new(browser_domain_only);
                
                if let Some(raw_url) = url_info.url.as_ref() {
                    sanitizer.sanitize(Some(raw_url))
                } else if let Some(domain) = url_info.domain.as_ref() {
                    // Only have domain from title, use it as both
                    (Some(domain.clone()), Some(domain.clone()))
                } else {
                    (None, None)
                }
            };
            
            let app_info = AppInfo {
                name: final_app_name.clone(),
                app_id: final_app_id.clone(),
                window_title: Some(window_title.clone()),
                url,
                domain,
            };
            
            // Check if this is the TrackEx Agent itself
            let is_trackex = is_trackex_agent(&final_app_name, &final_app_id, Some(&window_title));
            
            log::debug!("App detection: name='{}', id='{}', title='{}', url={:?}, domain={:?}, is_trackex={}", 
                final_app_name, final_app_id, window_title, app_info.url, app_info.domain, is_trackex);
            
            if is_trackex {
                // Return the last non-TrackEx app instead
                log::debug!("TrackEx detected as foreground, returning last non-TrackEx app");
                return Ok(crate::sampling::app_focus::get_last_non_trackex_app().await);
            }
            
            // Save this as the last non-TrackEx app
            crate::sampling::app_focus::set_last_non_trackex_app(app_info.clone()).await;
            Ok(Some(app_info))
        }
    }
    
    
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        // Fallback for other systems
        return Ok(Some(AppInfo {
            name: "Unknown Application".to_string(),
            app_id: "unknown".to_string(),
            window_title: Some("Unknown Window".to_string()),
            url: None,
            domain: None,
        }));
    }
}

fn trim_nulls(s: &str) -> String {
    s.trim_end_matches('\u{0}').to_string()
}


#[tauri::command]
pub async fn send_diagnostics() -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub async fn get_permissions_status() -> Result<PermissionsStatus, String> {
    Ok(crate::permissions::get_permissions_status().await)
}

#[tauri::command]
pub async fn request_permissions() -> Result<(), String> {
    crate::permissions::request_permissions()
        .await
        .map_err(|e| e.to_string())
}

/// Trigger screen recording permission dialog by attempting actual screen capture
/// This is more reliable than the ScreenCaptureAccess.request() API on macOS
#[tauri::command]
pub async fn trigger_screen_permission_dialog() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        
        log::info!("Triggering screen permission dialog via test screencapture...");
        
        let temp_dir = std::env::temp_dir();
        let test_file = temp_dir.join("trackex_permission_test.jpg");
        
        // Run screencapture - this WILL trigger the permission dialog if not granted
        // The -x flag prevents the shutter sound
        let output = Command::new("screencapture")
            .arg("-x")  // No sound
            .arg(test_file.to_string_lossy().to_string())
            .output()
            .map_err(|e| format!("Failed to run screencapture: {}", e))?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            log::warn!("screencapture command failed (expected if permission not granted): {}", stderr);
        } else {
            log::info!("Test screenshot succeeded - permission likely granted");
        }
        
        // Clean up test file if it was created
        let _ = std::fs::remove_file(&test_file);
        
        Ok(())
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        // On other platforms, no special permission trigger needed
        Ok(())
    }
}

#[tauri::command]
pub async fn get_app_info() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "name": "TrackEx Agent",
        "version": env!("CARGO_PKG_VERSION"),
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
    }))
}

#[tauri::command]
pub async fn send_app_focus_event(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<String, String> {
    let (server_url, device_token) = {
        let app_state = state.lock().await;
        (app_state.server_url.clone(), app_state.device_token.clone())
    };

    if let (Some(server_url), Some(device_token)) = (server_url, device_token) {
        // Get current app
        if let Ok(Some(app_info)) = get_current_app().await {
            // Send app_focus event to backend
            let client = reqwest::Client::builder()
                .user_agent(format!("TrackEx-Agent/{}", env!("CARGO_PKG_VERSION")))
                .build()
                .map_err(|e| format!("Failed to build client: {}", e))?;
            let events_url = format!("{}/api/ingest/events", server_url.trim_end_matches('/'));
            
            let event_data = serde_json::json!({
                "events": [{
                    "type": "app_focus",
                    "timestamp": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
                    "data": {
                        "app_name": app_info.name,
                        "app_id": app_info.app_id,
                        "window_title": app_info.window_title.unwrap_or_default()
                    },
                    "from": "send_app_focus_event"
                }]
            });

            let response = client
                .post(&events_url)
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {}", device_token))
                .json(&event_data)
                .send()
                .await;

            match response {
                Ok(resp) if resp.status().is_success() => {
                    Ok(format!("App focus tracked: {}", app_info.name))
                }
                Ok(resp) => {
                    log::error!("Failed to send app focus event: {}", resp.status());
                    Err("Failed to send app focus event".to_string())
                }
                Err(e) => {
                    log::error!("Error sending app focus event: {}", e);
                    Err("Network error sending app focus event".to_string())
                }
            }
        } else {
            Err("Could not detect current app".to_string())
        }
    } else {
        Err("Not authenticated".to_string())
    }
}

#[tauri::command]
pub async fn send_heartbeat(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<String, String> {
    let (server_url, device_token) = {
        let app_state = state.lock().await;
        (app_state.server_url.clone(), app_state.device_token.clone())
    };

    if let (Some(server_url), Some(device_token)) = (server_url, device_token) {
        // Get current app for heartbeat
        let current_app = match get_current_app().await {
            Ok(Some(app)) => Some(serde_json::json!({
                "name": app.name,
                "app_id": app.app_id,
                "window_title": app.window_title.unwrap_or_default()
            })),
            _ => None
        };

        // Send heartbeat to backend
        let client = reqwest::Client::builder()
            .user_agent(format!("TrackEx-Agent/{}", env!("CARGO_PKG_VERSION")))
            .build()
            .map_err(|e| format!("Failed to build client: {}", e))?;
        let heartbeat_url = format!("{}/api/ingest/heartbeat", server_url.trim_end_matches('/'));
        
        // Get idle time and work session data for time calculations
        let idle_time = crate::sampling::idle_detector::get_idle_time().await.unwrap_or(0);
        let idle_threshold = crate::sampling::idle_detector::get_idle_threshold();
        let is_idle = idle_time >= idle_threshold;

        let now = chrono::Utc::now();

        // Check if there's an active work session for time calculations
        let session_active = crate::storage::work_session::is_session_active().await.unwrap_or(false);
        
        let (session_start, total_session_time, total_active_today, total_idle_today) = if session_active {
            // Get session start time for time calculations
            let session_start = crate::storage::work_session::get_session_start_time().await.unwrap_or_else(|_| now);
            let total_session_time = (now - session_start).num_seconds();
            
            // Calculate cumulative active and idle time for today
            let (cumulative_active_time, cumulative_idle_time) = crate::storage::work_session::get_today_time_totals().await.unwrap_or((0, 0));
            
            // Add current session time to totals
            let current_session_active = if is_idle { 0 } else { total_session_time };
            let current_session_idle = if is_idle { total_session_time } else { 0 };
            
            let total_active_today = cumulative_active_time + current_session_active;
            let total_idle_today = cumulative_idle_time + current_session_idle;


            (session_start, total_session_time, total_active_today, total_idle_today)
        } else {
            // No active session - use default values
            (now, 0, 0, 0)
        };

        let heartbeat_data = serde_json::json!({
            "timestamp": now.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
            "status": if is_idle { "idle" } else { "active" },
            "currentApp": current_app,
            "idle_time_seconds": idle_time,
            "session_start_time": session_start.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
            "total_session_time_seconds": total_session_time,
            "active_time_today_seconds": total_active_today,
            "idle_time_today_seconds": total_idle_today,
            "is_paused": crate::sampling::is_services_paused().await
        });

        let response = client
            .post(&heartbeat_url)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", device_token))
            .json(&heartbeat_data)
            .send()
            .await;

        match response {
            Ok(resp) if resp.status().is_success() => {
                Ok("Heartbeat sent".to_string())
            }
            Ok(resp) => {
                log::error!("Failed to send heartbeat2: {}", resp.status());
                Err("Failed to send heartbeat".to_string())
            }
            Err(e) => {
                log::error!("Error sending heartbeat: {}", e);
                Err("Network error sending heartbeat".to_string())
            }
        }
    } else {
        Err("Not authenticated".to_string())
    }
}

#[tauri::command]
pub async fn check_pending_jobs(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<String, String> {
    let (server_url, device_token) = {
        let app_state = state.lock().await;
        (app_state.server_url.clone(), app_state.device_token.clone())
    };

    if let (Some(server_url), Some(device_token)) = (server_url, device_token) {
        let client = reqwest::Client::builder()
            .user_agent(format!("TrackEx-Agent/{}", env!("CARGO_PKG_VERSION")))
            .build()
            .map_err(|e| format!("Failed to build client: {}", e))?;
        let jobs_url = format!("{}/api/ingest/jobs", server_url.trim_end_matches('/'));
        
        match client
            .get(&jobs_url)
            .header("Authorization", format!("Bearer {}", device_token))
            .send()
            .await
        {
            Ok(response) if response.status().is_success() => {
                if let Ok(jobs_data) = response.json::<serde_json::Value>().await {
                    if let Some(jobs) = jobs_data.get("jobs").and_then(|j| j.as_array()) {
                        for job in jobs {
                            if let Some(job_type) = job.get("type").and_then(|t| t.as_str()) {
                                if job_type == "screenshot" {
                                    if let Some(job_id) = job.get("id").and_then(|id| id.as_str()) {
                                        log::info!("Processing screenshot job: {}", job_id);
                                        
                                        let events_url = format!("{}/api/ingest/events", server_url.trim_end_matches('/'));
                                        
                                        // Helper macro for ISO 8601 timestamp with Z suffix (Zod datetime compatible)
                                        macro_rules! iso_timestamp {
                                            () => {
                                                chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()
                                            };
                                        }
                                        
                                        // Get device and employee info
                                        let device_id = match crate::storage::get_device_id().await {
                                            Ok(id) => id,
                                            Err(e) => {
                                                let error_msg = format!("Failed to get device ID: {}", e);
                                                log::error!("Failed to get device ID for job {}: {}", job_id, e);
                                                // Send failure event
                                                let fail_event = serde_json::json!({
                                                    "events": [{
                                                        "type": "screenshot_failed",
                                                        "timestamp": iso_timestamp!(),
                                                        "data": {
                                                            "jobId": job_id,
                                                            "job_id": job_id,
                                                            "error": error_msg,
                                                            "auto": false
                                                        }
                                                    }]
                                                });
                                                let _ = client.post(&events_url)
                                                    .header("Content-Type", "application/json")
                                                    .header("Authorization", format!("Bearer {}", device_token))
                                                    .json(&fail_event)
                                                    .send()
                                                    .await;
                                                continue;
                                            }
                                        };
                                        let employee_id = match crate::storage::get_employee_id().await {
                                            Ok(id) => id,
                                            Err(e) => {
                                                let error_msg = format!("Failed to get employee ID: {}", e);
                                                log::error!("Failed to get employee ID for job {}: {}", job_id, e);
                                                // Send failure event
                                                let fail_event = serde_json::json!({
                                                    "events": [{
                                                        "type": "screenshot_failed",
                                                        "timestamp": iso_timestamp!(),
                                                        "data": {
                                                            "jobId": job_id,
                                                            "job_id": job_id,
                                                            "error": error_msg,
                                                            "auto": false
                                                        }
                                                    }]
                                                });
                                                let _ = client.post(&events_url)
                                                    .header("Content-Type", "application/json")
                                                    .header("Authorization", format!("Bearer {}", device_token))
                                                    .json(&fail_event)
                                                    .send()
                                                    .await;
                                                continue;
                                            }
                                        };
                                        
                                        // Capture screenshot to file
                                        let screenshot_result = match crate::screenshots::screen_capture::capture_screen_to_file().await {
                                            Ok(result) => result,
                                            Err(e) => {
                                                let error_msg = format!("Failed to capture screenshot. Please grant screen recording permission in System Settings > Privacy & Security > Screen Recording");
                                                log::error!("Failed to capture screenshot for job {}: {}", job_id, e);
                                                // Send failure event
                                                let fail_event = serde_json::json!({
                                                    "events": [{
                                                        "type": "screenshot_failed",
                                                        "timestamp": iso_timestamp!(),
                                                        "data": {
                                                            "jobId": job_id,
                                                            "job_id": job_id,
                                                            "error": error_msg,
                                                            "auto": false
                                                        }
                                                    }]
                                                });
                                                let _ = client.post(&events_url)
                                                    .header("Content-Type", "application/json")
                                                    .header("Authorization", format!("Bearer {}", device_token))
                                                    .json(&fail_event)
                                                    .send()
                                                    .await;
                                                continue;
                                            }
                                        };
                                        
                                        log::info!(
                                            "Screenshot captured for job {}: {}x{} ({} bytes)",
                                            job_id,
                                            screenshot_result.width,
                                            screenshot_result.height,
                                            screenshot_result.bytes
                                        );
                                        
                                        // Upload to Cloudinary
                                        let cloudinary_result = match crate::api::cloudinary_upload::upload_screenshot_file(
                                            &screenshot_result.file_path,
                                            &employee_id,
                                            &device_id,
                                        ).await {
                                            Ok(result) => result,
                                            Err(e) => {
                                                let error_msg = format!("Failed to upload to Cloudinary: {}", e);
                                                log::error!("Failed to upload screenshot to Cloudinary for job {}: {}", job_id, e);
                                                // Clean up temp file on error
                                                let _ = std::fs::remove_file(&screenshot_result.file_path);
                                                // Send failure event
                                                let fail_event = serde_json::json!({
                                                    "events": [{
                                                        "type": "screenshot_failed",
                                                        "timestamp": iso_timestamp!(),
                                                        "data": {
                                                            "jobId": job_id,
                                                            "job_id": job_id,
                                                            "error": error_msg,
                                                            "auto": false
                                                        }
                                                    }]
                                                });
                                                let _ = client.post(&events_url)
                                                    .header("Content-Type", "application/json")
                                                    .header("Authorization", format!("Bearer {}", device_token))
                                                    .json(&fail_event)
                                                    .send()
                                                    .await;
                                                continue;
                                            }
                                        };
                                        
                                        log::info!("Screenshot uploaded for job {}: {}", job_id, cloudinary_result.secure_url);
                                        
                                        // Clean up temp file
                                        if let Err(e) = std::fs::remove_file(&screenshot_result.file_path) {
                                            log::warn!("Failed to delete temp screenshot file: {}", e);
                                        }
                                        
                                        // Send screenshot_taken event with Cloudinary data
                                        let event_data = serde_json::json!({
                                            "events": [{
                                                "type": "screenshot_taken",
                                                "timestamp": iso_timestamp!(),
                                                "data": {
                                                    "jobId": job_id,
                                                    "cloudinaryPublicId": cloudinary_result.public_id,
                                                    "cloudinaryUrl": cloudinary_result.secure_url,
                                                    "width": cloudinary_result.width,
                                                    "height": cloudinary_result.height,
                                                    "format": cloudinary_result.format,
                                                    "bytes": cloudinary_result.bytes,
                                                    "auto": false
                                                }
                                            }]
                                        });

                                        match client
                                            .post(&events_url)
                                            .header("Content-Type", "application/json")
                                            .header("Authorization", format!("Bearer {}", device_token))
                                            .json(&event_data)
                                            .send()
                                            .await
                                        {
                                            Ok(resp) if resp.status().is_success() => {
                                                log::info!("Screenshot job {} completed successfully", job_id);
                                            }
                                            Ok(resp) => {
                                                let status = resp.status();
                                                let body = resp.text().await.unwrap_or_default();
                                                log::error!("Failed to send screenshot event for job {}: {} - {}", job_id, status, body);
                                            }
                                            Err(e) => {
                                                log::error!("Network error sending screenshot event for job {}: {}", job_id, e);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                Ok("Jobs checked".to_string())
            }
            Ok(response) => {
                log::error!("Failed to check jobs: {}", response.status());
                Err("Failed to check jobs".to_string())
            }
            Err(e) => {
                log::error!("Error checking jobs: {}", e);
                Err("Network error checking jobs".to_string())
            }
        }
    } else {
        Err("Not authenticated".to_string())
    }
}

#[tauri::command]
pub async fn get_idle_time() -> Result<u64, String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        
        // Use ioreg to get idle time on macOS
        let output = Command::new("ioreg")
            .arg("-c")
            .arg("IOHIDSystem")
            .output();
            
        match output {
            Ok(result) => {
                if result.status.success() {
                    let output_str = String::from_utf8_lossy(&result.stdout);
                    
                    // Parse the idle time from ioreg output
                    for line in output_str.lines() {
                        if line.contains("HIDIdleTime") {
                            if let Some(start) = line.find('=') {
                                if let Some(end) = line[start..].find(' ') {
                                    let idle_str = &line[start+1..start+end].trim();
                                    if let Ok(idle_ns) = idle_str.parse::<u64>() {
                                        // Convert nanoseconds to seconds
                                        return Ok(idle_ns / 1_000_000_000);
                                    }
                                }
                            }
                        }
                    }
                }
                Ok(0)
            }
            Err(e) => {
                log::error!("Failed to get idle time: {}", e);
                Ok(0)
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        use std::mem;
        use winapi::um::winuser::GetLastInputInfo;
        use winapi::um::winuser::LASTINPUTINFO;
        use winapi::um::sysinfoapi::GetTickCount;
    
        unsafe {
            let mut last_input_info = LASTINPUTINFO {
                cbSize: mem::size_of::<LASTINPUTINFO>() as u32,
                dwTime: 0,
            };
            
            if GetLastInputInfo(&mut last_input_info) != 0 {
                let current_time = GetTickCount();
                let idle_time_ms = current_time - last_input_info.dwTime;
                Ok(idle_time_ms as u64 / 1000) // Convert to seconds
            } else {
                Ok(0)
            }
        }
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        // For other platforms, return 0 for now
        Ok(0)
    }
}

// Removed send_idle_event command - idle detection is now handled solely by backend services
// This prevents duplicate idle events and ensures proper work session checks

#[tauri::command]
pub async fn start_background_services(app_handle: tauri::AppHandle) -> Result<(), String> {
    crate::sampling::start_all_background_services(app_handle).await;
    Ok(())
}

#[tauri::command]
pub async fn stop_background_services() -> Result<(), String> {
    crate::sampling::stop_services().await;
    Ok(())
}

#[tauri::command]
pub async fn pause_background_services() -> Result<(), String> {
    crate::sampling::pause_services().await;
    Ok(())
}

#[tauri::command]
pub async fn resume_background_services() -> Result<(), String> {
    crate::sampling::resume_services().await;
    Ok(())
}

#[tauri::command]
pub async fn get_background_service_state() -> Result<crate::sampling::BackgroundServiceState, String> {
    Ok(crate::sampling::get_service_state().await)
}

#[tauri::command]
pub async fn get_app_usage_summary() -> Result<std::collections::HashMap<String, app_usage::AppUsageSummary>, String> {
    Ok(app_usage::get_app_usage_summary().await)
}

#[tauri::command]
pub async fn get_usage_totals() -> Result<(i64, i64, i64, i64), String> {
    Ok(app_usage::get_usage_totals().await)
}

#[tauri::command]
pub async fn get_current_app_session() -> Result<Option<app_usage::AppUsageSession>, String> {
    Ok(app_usage::get_current_session().await)
}

#[tauri::command]
pub async fn get_detailed_idle_info() -> Result<crate::sampling::idle_detector::IdleInfo, String> {
    crate::sampling::idle_detector::get_detailed_idle_info().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn generate_today_report(employee_id: String, device_id: String) -> Result<crate::api::reporting::DailyReport, String> {
    crate::api::reporting::generate_today_report(employee_id, device_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn generate_weekly_report(employee_id: String, device_id: String) -> Result<Vec<crate::api::reporting::DailyReport>, String> {
    crate::api::reporting::generate_weekly_report(employee_id, device_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn generate_monthly_summary(employee_id: String, device_id: String) -> Result<crate::api::reporting::MonthlySummary, String> {
    crate::api::reporting::generate_monthly_summary(employee_id, device_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_app_rules() -> Result<(), String> {
    crate::api::app_rules::sync_app_rules().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_app_rules() -> Result<Vec<crate::utils::productivity::AppRule>, String> {
    Ok(crate::api::app_rules::get_app_rules().await)
}

#[tauri::command]
pub async fn get_rule_statistics() -> Result<crate::api::app_rules::RuleStatistics, String> {
    crate::api::app_rules::get_rule_statistics().await.map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseCheckResult {
    pub valid: bool,
    pub status: Option<String>,
    pub message: String,
}

/// Check license status from the backend API
/// This should be called periodically and after authentication
#[tauri::command]
pub async fn check_license_status(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<LicenseCheckResult, String> {
    let (server_url, device_token) = {
        let app_state = state.lock().await;
        (app_state.server_url.clone(), app_state.device_token.clone())
    };

    if server_url.is_none() || device_token.is_none() {
        return Err("Not authenticated. Please login first.".to_string());
    }

    // Create API client
    let client = crate::api::client::ApiClient::new().await
        .map_err(|e| format!("Failed to create API client: {}", e))?;

    let license_url = "/api/agent/license-status";
    
    // Make license check request using the get_with_auth method
    let response = client
        .get_with_auth(license_url)
        .await
        .map_err(|e| {
            let err_str = e.to_string();
            if err_str.contains("connect") {
                "Cannot connect to server. Please check your network connection.".to_string()
            } else if err_str.contains("timeout") {
                "Connection timeout. Please check your network connection.".to_string()
            } else {
                format!("Network error: {}", e)
            }
        })?;

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
        
        let message = license_response.get("message")
            .and_then(|v| v.as_str())
            .unwrap_or("License check completed")
            .to_string();

        // Update state with license info and timestamp
        {
            let mut app_state = state.lock().await;
            app_state.license_valid = Some(valid);
            app_state.license_status = status.clone();
            app_state.last_license_check = Some(chrono::Utc::now().timestamp());
        }

        Ok(LicenseCheckResult {
            valid,
            status,
            message,
        })
    } else if status_code.as_u16() == 402 {
        // Payment Required - no valid license
        let error_response: serde_json::Value = response
            .json()
            .await
            .unwrap_or(serde_json::json!({"message": "No valid license found"}));
        
        let message = error_response.get("message")
            .and_then(|v| v.as_str())
            .unwrap_or("Your organization needs to activate a license to use TrackEx.")
            .to_string();
        
        let status = error_response.get("licenseStatus")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        // Update state with invalid license info
        {
            let mut app_state = state.lock().await;
            app_state.license_valid = Some(false);
            app_state.license_status = status.clone();
            app_state.last_license_check = Some(chrono::Utc::now().timestamp());
        }

        Ok(LicenseCheckResult {
            valid: false,
            status,
            message: format!("NO_VALID_LICENSE: {}", message),
        })
    } else {
        // For 404, 500, or other server errors, return error (not a license issue)
        // This allows the UI to show a generic error instead of "License Required"
        Err(format!("License check failed with status: {} - Server may be temporarily unavailable", status_code))
    }
}

/// Retry license check (used by "Try Again" button)
/// This is a wrapper around check_license_status for clarity
#[tauri::command]
pub async fn retry_license_check(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<LicenseCheckResult, String> {
    check_license_status(state).await
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}