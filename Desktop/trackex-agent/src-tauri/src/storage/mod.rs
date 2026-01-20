pub mod consent;
pub mod database;
pub mod secure_store;
pub mod work_session;
pub mod offline_queue;
pub mod app_usage;
pub mod screenshot_queue;

use anyhow::Result;
use std::sync::Arc;
use tokio::sync::Mutex;
use std::sync::OnceLock;

#[derive(Debug, Clone)]
pub struct AppState {
    pub device_token: Option<String>,
    pub device_id: Option<String>,
    pub email: Option<String>,
    pub server_url: Option<String>,
    pub employee_id: Option<String>,
    pub is_paused: bool,
    pub license_valid: Option<bool>,
    pub license_status: Option<String>,
    pub last_license_check: Option<i64>, // Unix timestamp
}

impl AppState {
    pub fn new() -> Self {
        Self {
            device_token: None,
            device_id: None,
            email: None,
            server_url: None,
            employee_id: None,
            is_paused: false,
            license_valid: None,
            license_status: None,
            last_license_check: None,
        }
    }

    #[allow(dead_code)]
    pub async fn initialize(&mut self) -> Result<()> {
        // Initialize database
        database::init().await?;
        
        // Initialize app usage tracking
        app_usage::init_database().await?;
        
        // Load recent app usage sessions
        app_usage::load_recent_sessions(24).await?; // Load last 24 hours
        
        // Initialize app rules
        crate::api::app_rules::initialize_app_rules().await?;
        
        Ok(())
    }
}

// Global app state manager
static GLOBAL_APP_STATE: OnceLock<Arc<Mutex<AppState>>> = OnceLock::new();

pub fn set_global_app_state(state: Arc<Mutex<AppState>>) {
    GLOBAL_APP_STATE.set(state).expect("Failed to set global app state");
}

// Function to sync device token from Tauri-managed AppState to Global AppState
pub async fn sync_device_token_to_global(device_token: String, device_id: String, email: String, server_url: String, employee_id: String) -> Result<()> {
    match get_global_app_state() {
        Ok(global_state) => {
            let mut state = global_state.lock().await;
            state.device_token = Some(device_token);
            state.device_id = Some(device_id);
            state.email = Some(email);
            state.server_url = Some(server_url);
            state.employee_id = Some(employee_id);
            Ok(())
        }
        Err(e) => {
            // If global state is not initialized, log warning but don't fail
            log::warn!("Global app state not initialized yet, skipping device token sync: {}", e);
            Ok(())
        }
    }
}

pub fn get_global_app_state() -> Result<Arc<Mutex<AppState>>> {
    GLOBAL_APP_STATE.get()
        .cloned()
        .ok_or_else(|| anyhow::anyhow!("Global app state not initialized"))
}

// Global storage functions
pub async fn get_server_url() -> Result<String> {
    // Try to get the server URL from the global app state, fallback to default if not available
    match get_global_app_state() {
        Ok(app_state) => {
            let state = app_state.lock().await;
            if let Some(url) = &state.server_url {
                Ok(url.clone())
            } else {
                log::warn!("No server URL found in app state, using default");
                #[cfg(debug_assertions)]
                {
                    Ok("http://localhost:3000".to_string())
                }
                #[cfg(not(debug_assertions))]
                {
                    Ok("https://www.trackex.app".to_string())
                }
            }
        }
        Err(_) => {
            log::warn!("Global app state not available, using default server URL");
            #[cfg(debug_assertions)]
            {
                Ok("http://localhost:3000".to_string())
            }
            #[cfg(not(debug_assertions))]
            {
                Ok("https://www.trackex.app".to_string())
            }
        }
    }
}

pub async fn get_device_token() -> Result<String> {
    // Try to get the device token from the global app state, fallback to empty if not available
    match get_global_app_state() {
        Ok(app_state) => {
            let state = app_state.lock().await;
            if let Some(token) = &state.device_token {
                if !token.is_empty() {
                    Ok(token.clone())
                } else {
                    Err(anyhow::anyhow!("Device token is empty - user not authenticated"))
                }
            } else {
                Err(anyhow::anyhow!("No device token found - user not authenticated"))
            }
        }
        Err(_) => {
            Err(anyhow::anyhow!("Global app state not available"))
        }
    }
}

pub async fn get_device_id() -> Result<String> {
    match get_global_app_state() {
        Ok(app_state) => {
            let state = app_state.lock().await;
            if let Some(device_id) = &state.device_id {
                if !device_id.is_empty() {
                    Ok(device_id.clone())
                } else {
                    Err(anyhow::anyhow!("Device ID is empty - user not authenticated"))
                }
            } else {
                Err(anyhow::anyhow!("No device ID found - user not authenticated"))
            }
        }
        Err(_) => {
            Err(anyhow::anyhow!("Global app state not available"))
        }
    }
}

pub async fn get_employee_id() -> Result<String> {
    match get_global_app_state() {
        Ok(app_state) => {
            let state = app_state.lock().await;
            if let Some(employee_id) = &state.employee_id {
                if !employee_id.is_empty() {
                    Ok(employee_id.clone())
                } else {
                    Err(anyhow::anyhow!("Employee ID is empty - user not authenticated"))
                }
            } else {
                Err(anyhow::anyhow!("No employee ID found - user not authenticated"))
            }
        }
        Err(_) => {
            Err(anyhow::anyhow!("Global app state not available"))
        }
    }
}

/// Parse semantic version string into (major, minor, patch) tuple
fn parse_semver(version: &str) -> Option<(u32, u32, u32)> {
    let parts: Vec<&str> = version.split('.').collect();
    if parts.len() >= 3 {
        let major = parts[0].parse::<u32>().ok()?;
        let minor = parts[1].parse::<u32>().ok()?;
        // Handle patch versions like "5-beta" by taking just the number
        let patch_str = parts[2].split('-').next().unwrap_or("0");
        let patch = patch_str.parse::<u32>().ok()?;
        Some((major, minor, patch))
    } else if parts.len() == 2 {
        let major = parts[0].parse::<u32>().ok()?;
        let minor = parts[1].parse::<u32>().ok()?;
        Some((major, minor, 0))
    } else {
        None
    }
}

/// Check if version change requires re-authentication.
/// Only major version changes require clearing credentials.
/// Minor and patch updates should preserve user sessions.
fn requires_reauth(old_version: &str, new_version: &str) -> bool {
    match (parse_semver(old_version), parse_semver(new_version)) {
        (Some((old_major, _, _)), Some((new_major, _, _))) => {
            // Only require re-auth if major version changed
            old_major != new_major
        }
        _ => {
            // If we can't parse versions, be safe and don't clear auth
            log::warn!("Could not parse version strings: {} -> {}", old_version, new_version);
            false
        }
    }
}

/// Check if the app version has changed and handle migration appropriately.
/// 
/// IMPORTANT: Session data (authentication) is PRESERVED across updates.
/// Only major version changes will require re-authentication.
/// 
/// This allows users to:
/// - Stay logged in after app updates
/// - Stay logged in after app restarts
/// - Only re-authenticate when explicitly logging out or on major API changes
/// 
/// Returns Ok(true) if data was cleared (user needs to re-authenticate),
/// Returns Ok(false) if no migration was needed or session was preserved.
pub async fn check_version_and_migrate() -> Result<bool> {
    let current_version = env!("CARGO_PKG_VERSION");
    log::info!("Checking app version: current binary is v{}", current_version);
    
    // Get the stored version from secure storage
    match secure_store::get_stored_app_version().await {
        Ok(Some(stored_version)) => {
            if stored_version != current_version {
                log::info!(
                    "Version changed: {} -> {}",
                    stored_version, current_version
                );
                
                // Check if this version change requires re-authentication
                if requires_reauth(&stored_version, current_version) {
                    log::info!("Major version change detected - clearing credentials");
                    
                    // Clear all stored credentials from keychain
                    if let Err(e) = secure_store::clear_all_credentials().await {
                        log::warn!("Failed to clear credentials during version migration: {}", e);
                    }
                    
                    // Clear SQLite database tables that might contain stale session data
                    if let Ok(conn) = database::get_connection() {
                        // Clear work sessions
                        if let Err(e) = conn.execute("DELETE FROM work_sessions", []) {
                            log::warn!("Failed to clear work_sessions table: {}", e);
                        } else {
                            log::info!("Cleared work_sessions table");
                        }
                        
                        // Clear app usage sessions
                        if let Err(e) = conn.execute("DELETE FROM app_usage_sessions", []) {
                            log::warn!("Failed to clear app_usage_sessions table: {}", e);
                        } else {
                            log::info!("Cleared app_usage_sessions table");
                        }
                        
                        // Clear event queue
                        if let Err(e) = conn.execute("DELETE FROM event_queue", []) {
                            log::warn!("Failed to clear event_queue table: {}", e);
                        } else {
                            log::info!("Cleared event_queue table");
                        }
                        
                        // Clear heartbeat queue
                        if let Err(e) = conn.execute("DELETE FROM heartbeat_queue", []) {
                            log::warn!("Failed to clear heartbeat_queue table: {}", e);
                        } else {
                            log::info!("Cleared heartbeat_queue table");
                        }
                    }
                    
                    // Store the new version
                    if let Err(e) = secure_store::store_app_version(current_version).await {
                        log::warn!("Failed to store new app version: {}", e);
                    }
                    
                    log::info!("Major version migration complete: user will need to re-authenticate");
                    return Ok(true);
                } else {
                    // Minor/patch update - PRESERVE session, only clear stale work data
                    log::info!("Minor/patch update detected - preserving authentication session");
                    
                    // Clear only transient work session data, not authentication
                    if let Ok(conn) = database::get_connection() {
                        // Clear active work sessions (they should be properly ended anyway)
                        if let Err(e) = conn.execute("UPDATE work_sessions SET is_active = 0 WHERE is_active = 1", []) {
                            log::warn!("Failed to close active work_sessions: {}", e);
                        } else {
                            log::info!("Closed any active work sessions from previous app instance");
                        }
                        
                        // Clear pending event/heartbeat queues (they may have stale data)
                        if let Err(e) = conn.execute("DELETE FROM event_queue WHERE processed = 0", []) {
                            log::warn!("Failed to clear pending event_queue: {}", e);
                        }
                        if let Err(e) = conn.execute("DELETE FROM heartbeat_queue WHERE processed = 0", []) {
                            log::warn!("Failed to clear pending heartbeat_queue: {}", e);
                        }
                    }
                    
                    // Store the new version
                    if let Err(e) = secure_store::store_app_version(current_version).await {
                        log::warn!("Failed to store new app version: {}", e);
                    }
                    
                    log::info!("Version update complete - user session preserved");
                    return Ok(false);
                }
            } else {
                log::info!("App version unchanged (v{}), no migration needed", current_version);
            }
        }
        Ok(None) => {
            // First install or no version stored - store current version
            log::info!("No stored version found, this appears to be a fresh install");
            if let Err(e) = secure_store::store_app_version(current_version).await {
                log::warn!("Failed to store initial app version: {}", e);
            } else {
                log::info!("Stored initial app version: {}", current_version);
            }
        }
        Err(e) => {
            // Error reading version - log but don't fail startup
            log::warn!("Error checking stored app version: {}", e);
            // Try to store current version anyway
            if let Err(e) = secure_store::store_app_version(current_version).await {
                log::warn!("Failed to store app version after error: {}", e);
            }
        }
    }
    
    Ok(false)
}