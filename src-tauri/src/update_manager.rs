//! Auto-update manager for TrackEx Agent
//! 
//! This module handles checking for updates and installing them using the Tauri updater plugin.
//! It provides Tauri commands for the frontend to:
//! - Check if updates are available
//! - Download and install updates
//! - Get update progress events

use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::Emitter;
use tauri_plugin_updater::UpdaterExt;

/// Custom update response from our server that includes mandatory field
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct CustomUpdateResponse {
    version: String,
    #[serde(default)]
    mandatory: bool,
}

/// Information about an available update
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateInfo {
    /// Whether an update is available
    pub available: bool,
    /// The new version number (if available)
    pub version: Option<String>,
    /// Release notes for the update (if available)
    pub notes: Option<String>,
    /// Current running version
    pub current_version: String,
    /// Release date of the update
    pub release_date: Option<String>,
    /// Whether this update is mandatory (non-skippable)
    pub mandatory: bool,
    /// Error message if the check failed
    pub error: Option<String>,
    /// Additional diagnostic information
    pub diagnostic_info: Option<String>,
}

/// Progress information for update download
#[derive(Debug, Serialize, Clone)]
pub struct UpdateProgress {
    /// Bytes downloaded so far
    pub downloaded: u64,
    /// Total bytes to download
    pub total: u64,
    /// Progress percentage (0-100)
    pub percentage: u8,
}

/// Check if an update is available
/// 
/// This command contacts the update server to check if a newer version
/// of the agent is available for download.
#[tauri::command]
pub async fn check_for_updates(app: tauri::AppHandle) -> Result<UpdateInfo, String> {
    let current_version = env!("CARGO_PKG_VERSION").to_string();
    log::info!("Checking for updates... Current version: {}", current_version);
    
    // Get the updater from the app handle
    let updater = match app.updater() {
        Ok(u) => u,
        Err(e) => {
            log::error!("Failed to get updater: {}", e);
            return Ok(UpdateInfo {
                available: false,
                version: None,
                notes: None,
                current_version,
                release_date: None,
                mandatory: false,
                error: Some(format!("Failed to initialize updater: {}", e)),
                diagnostic_info: Some("The updater plugin may not be properly configured in tauri.conf.json".to_string()),
            });
        }
    };
    
    // Check for updates
    match updater.check().await {
        Ok(Some(update)) => {
            log::info!("Update available: {} -> {}", current_version, update.version);
            
            // Fetch the mandatory flag from our custom endpoint
            let mandatory = fetch_mandatory_flag(&current_version).await;
            log::info!("Update mandatory flag: {}", mandatory);
            
            Ok(UpdateInfo {
                available: true,
                version: Some(update.version.clone()),
                notes: update.body.clone(),
                current_version,
                release_date: update.date.map(|d| d.to_string()),
                mandatory,
                error: None,
                diagnostic_info: None,
            })
        }
        Ok(None) => {
            log::info!("No update available, already on latest version");
            Ok(UpdateInfo {
                available: false,
                version: None,
                notes: None,
                current_version,
                release_date: None,
                mandatory: false,
                error: None,
                diagnostic_info: Some("Already on the latest version".to_string()),
            })
        }
        Err(e) => {
            let error_msg = format!("{}", e);
            log::error!("Failed to check for updates: {}", error_msg);
            
            // Provide more detailed diagnostic information based on the error
            let diagnostic = if error_msg.contains("fetch") || error_msg.contains("release JSON") {
                format!(
                    "Unable to fetch update manifest from the server. This may indicate:\n\
                    1. No agent versions have been published in the database\n\
                    2. Network connectivity issues\n\
                    3. The update server is unavailable\n\
                    4. CORS or SSL certificate problems\n\
                    \nTechnical details: {}",
                    error_msg
                )
            } else if error_msg.contains("signature") {
                format!("Update signature verification failed. The update package may be corrupted or tampered with. Details: {}", error_msg)
            } else if error_msg.contains("network") || error_msg.contains("timeout") {
                format!("Network error while checking for updates. Please check your internet connection. Details: {}", error_msg)
            } else {
                format!("Update check failed: {}", error_msg)
            };
            
            // Return an UpdateInfo with error details instead of Err to allow UI to display gracefully
            Ok(UpdateInfo {
                available: false,
                version: None,
                notes: None,
                current_version,
                release_date: None,
                mandatory: false,
                error: Some(error_msg),
                diagnostic_info: Some(diagnostic),
            })
        }
    }
}

/// Fetch the mandatory flag from the update server
/// 
/// This makes a separate HTTP request to get the mandatory field since
/// the Tauri updater plugin doesn't pass through custom fields.
async fn fetch_mandatory_flag(current_version: &str) -> bool {
    // Determine platform and arch
    let target = if cfg!(target_os = "macos") {
        "darwin"
    } else if cfg!(target_os = "windows") {
        "windows"
    } else {
        "linux"
    };
    
    let arch = if cfg!(target_arch = "x86_64") {
        "x86_64"
    } else if cfg!(target_arch = "aarch64") {
        "aarch64"
    } else {
        "x86_64"
    };
    
    // Try production first, then localhost for development
    let endpoints = [
        format!("https://trackex.app/api/desktop/updates/{}-{}/{}", target, arch, current_version),
        format!("http://localhost:3000/api/desktop/updates/{}-{}/{}", target, arch, current_version),
    ];
    
    for endpoint in endpoints {
        match reqwest::get(&endpoint).await {
            Ok(response) if response.status().is_success() => {
                if let Ok(data) = response.json::<CustomUpdateResponse>().await {
                    log::info!("Fetched mandatory flag from {}: {}", endpoint, data.mandatory);
                    return data.mandatory;
                }
            }
            _ => continue,
        }
    }
    
    log::warn!("Could not fetch mandatory flag, defaulting to false");
    false
}

/// Download and install an available update
/// 
/// This command downloads the update package, verifies its signature,
/// installs it, and restarts the application.
/// 
/// Progress events are emitted to the frontend during download:
/// - Event name: "update-progress"
/// - Payload: UpdateProgress { downloaded, total, percentage }
#[tauri::command]
pub async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    log::info!("Starting update installation...");
    
    // Get the updater
    let updater = app.updater().map_err(|e| {
        log::error!("Failed to get updater: {}", e);
        format!("Failed to initialize updater: {}", e)
    })?;
    
    // Check for the update first
    let update = updater
        .check()
        .await
        .map_err(|e| {
            log::error!("Failed to check for update: {}", e);
            format!("Failed to check for update: {}", e)
        })?
        .ok_or_else(|| {
            log::warn!("No update available to install");
            "No update available".to_string()
        })?;
    
    log::info!("Downloading update version {}...", update.version);
    log::info!("Update download URL: {}", update.download_url);
    
    // Log the file format for debugging
    if update.download_url.ends_with(".tar.gz") {
        log::info!("Update format: .tar.gz (correct for macOS)");
    } else if update.download_url.ends_with(".dmg") {
        log::error!("Update format: .dmg (INCORRECT - must be .tar.gz for auto-updates on macOS!)");
        return Err(
            "Invalid update file format: .dmg files cannot be used for auto-updates on macOS. \
            The downloadUrl in the database must point to a .tar.gz file. \
            DMG files are for initial installation only.".to_string()
        );
    } else if update.download_url.ends_with(".msi") || update.download_url.ends_with(".exe") {
        log::info!("Update format: Windows installer (correct for Windows)");
    } else {
        log::warn!("Update format: Unknown format - {}", update.download_url);
    }
    
    // Clone app handle for the progress callback
    let app_for_progress = app.clone();
    
    // Track cumulative downloaded bytes (chunk_len is per chunk, not total!)
    let downloaded_bytes = Arc::new(Mutex::new(0u64));
    let downloaded_bytes_clone = downloaded_bytes.clone();
    let last_logged_percentage = Arc::new(Mutex::new(0u8));
    let last_logged_clone = last_logged_percentage.clone();
    
    log::info!("Starting download and installation with 5-minute timeout...");
    
    // Wrap in timeout to prevent infinite hangs during extraction
    let result = tokio::time::timeout(
        Duration::from_secs(300),  // 5 minutes max for download + extraction
        update.download_and_install(
            move |chunk_len, content_len| {
                // CRITICAL FIX: Accumulate downloaded bytes (chunk_len is THIS chunk only!)
                let mut total_downloaded = downloaded_bytes_clone.lock().unwrap();
                *total_downloaded += chunk_len as u64;
                let downloaded = *total_downloaded;
                drop(total_downloaded);
                
                let total = content_len.unwrap_or(0);
                
                // Calculate percentage
                let percentage = if total > 0 {
                    ((downloaded as f64 / total as f64) * 100.0).min(100.0) as u8
                } else {
                    0
                };
                
                // Emit progress event to frontend
                let update_progress = UpdateProgress {
                    downloaded,
                    total,
                    percentage,
                };
                
                if let Err(e) = app_for_progress.emit("update-progress", &update_progress) {
                    log::warn!("Failed to emit update progress event: {}", e);
                }
                
                // Log progress every 10% (avoid log spam)
                let mut last_pct = last_logged_clone.lock().unwrap();
                if percentage >= *last_pct + 10 && percentage > 0 {
                    log::info!("Download progress: {}% ({}/{} bytes)", percentage, downloaded, total);
                    *last_pct = percentage;
                }
                drop(last_pct);
                
                // Log when download phase completes
                if total > 0 && downloaded >= total {
                    log::info!("✓ Download complete ({} bytes)", total);
                    log::info!("→ Extracting .tar.gz archive... (this may take 30-60 seconds)");
                }
            },
            || {
                // Called after extraction, before restart
                log::info!("✓ Extraction and installation complete!");
                log::info!("→ Restarting application...");
            },
        )
    ).await;
    
    // Handle timeout
    match result {
        Err(_elapsed) => {
            log::error!("Update installation timed out after 5 minutes");
            return Err(
                "Update installation timed out after 5 minutes.\n\n\
                This could be caused by:\n\
                1. Very slow network connection\n\
                2. Corrupted .tar.gz file that can't be extracted\n\
                3. Insufficient disk space for extraction\n\
                4. Permission issues writing to application directory\n\n\
                Please check available disk space and try again.".to_string()
            );
        }
        Ok(Err(e)) => {
            // Extract the inner error from download_and_install
            let error_msg = format!("{}", e);
            log::error!("Update installation failed: {}", error_msg);
            
            Err(
                if error_msg.contains("403") || error_msg.contains("Forbidden") {
                    format!(
                        "Failed to install update: Download forbidden (403).\n\n\
                        The update file URL is not publicly accessible.\n\
                        This usually means:\n\
                        1. The file requires authentication\n\
                        2. The URL is incorrect or expired\n\
                        3. Using placeholder/test URLs in development\n\n\
                        Technical details: {}",
                        error_msg
                    )
                } else if error_msg.contains("404") || error_msg.contains("Not Found") {
                    format!(
                        "Failed to install update: File not found (404).\n\n\
                        The update file doesn't exist at the specified URL.\n\
                        Please check the downloadUrl in the database.\n\n\
                        Technical details: {}",
                        error_msg
                    )
                } else if error_msg.contains("extract") || error_msg.contains("archive") || error_msg.contains("tar") {
                    format!(
                        "Failed to extract update archive.\n\n\
                        The downloaded file could not be extracted.\n\
                        This usually means:\n\
                        1. On macOS: downloadUrl points to .dmg instead of .tar.gz\n\
                        2. Corrupted .tar.gz file during upload/download\n\
                        3. Insufficient disk space for extraction\n\
                        4. Permission denied writing to application directory\n\n\
                        IMPORTANT: macOS requires .tar.gz files for auto-updates, not .dmg!\n\n\
                        Technical details: {}",
                        error_msg
                    )
                } else if error_msg.contains("signature") || error_msg.contains("verify") {
                    format!(
                        "Failed to install update: Signature verification failed.\n\n\
                        The update signature doesn't match.\n\
                        This usually means:\n\
                        1. Wrong signature in the database (must match the .tar.gz.sig file)\n\
                        2. File was modified after signing\n\
                        3. Using wrong public key in tauri.conf.json\n\n\
                        Technical details: {}",
                        error_msg
                    )
                } else {
                    format!("Failed to install update: {}", error_msg)
                }
            )
        }
        Ok(Ok(())) => {
            log::info!("✓ Update installed successfully, application will restart");
            Ok(())
        }
    }?;
    
    Ok(())
            let error_msg = format!("{}", e);
            log::error!("Failed to download and install update: {}", error_msg);
            
            // Provide helpful error messages
            if error_msg.contains("403") || error_msg.contains("Forbidden") {
                format!(
                    "Failed to install update: Download forbidden (403).\n\n\
                    The update file URL is not publicly accessible.\n\
                    This usually means:\n\
                    1. The file requires authentication\n\
                    2. The URL is incorrect or expired\n\
                    3. Using placeholder/test URLs in development\n\n\
                    Technical details: {}",
                    error_msg
                )
            } else if error_msg.contains("404") || error_msg.contains("Not Found") {
                format!(
                    "Failed to install update: File not found (404).\n\n\
                    The update file doesn't exist at the specified URL.\n\
                    Please check the downloadUrl in the database.\n\n\
                    Technical details: {}",
                    error_msg
                )
            } else if error_msg.contains("extract") || error_msg.contains("archive") || error_msg.contains("tar") {
                format!(
                    "Failed to install update: Extraction error.\n\n\
                    The downloaded file could not be extracted.\n\
                    This usually means:\n\
                    1. On macOS: downloadUrl points to .dmg instead of .tar.gz\n\
                    2. The file is corrupted\n\
                    3. Signature verification failed\n\n\
                    IMPORTANT: macOS requires .tar.gz files for auto-updates, not .dmg!\n\n\
                    Technical details: {}",
                    error_msg
                )
            } else if error_msg.contains("signature") || error_msg.contains("verify") {
                format!(
                    "Failed to install update: Signature verification failed.\n\n\
                    The update signature doesn't match.\n\
                    This usually means:\n\
                    1. Wrong signature in the database\n\
                    2. File was modified after signing\n\
                    3. Using wrong public key in tauri.conf.json\n\n\
                    Technical details: {}",
                    error_msg
                )
            } else {
}

/// Get the current app version
#[tauri::command]
pub fn get_current_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Test the update endpoint connectivity and configuration
/// 
/// This diagnostic command checks if the update server is accessible
/// and properly configured without actually downloading an update.
#[tauri::command]
pub async fn test_update_endpoint(app: tauri::AppHandle) -> Result<String, String> {
    let current_version = env!("CARGO_PKG_VERSION").to_string();
    log::info!("Testing update endpoint connectivity...");
    
    // Try to get the updater configuration
    let updater = app.updater().map_err(|e| {
        format!("Failed to initialize updater: {}. Check tauri.conf.json configuration.", e)
    })?;
    
    // Attempt to check for updates
    match updater.check().await {
        Ok(Some(update)) => {
            Ok(format!(
                "✓ Update endpoint is working!\n\
                Current version: {}\n\
                Latest version: {}\n\
                Update available: Yes\n\
                Release date: {}\n\
                Download size: {} bytes",
                current_version,
                update.version,
                update.date.map(|d| d.to_string()).unwrap_or_else(|| "Unknown".to_string()),
                update.download_url
            ))
        }
        Ok(None) => {
            Ok(format!(
                "✓ Update endpoint is working!\n\
                Current version: {}\n\
                Status: Already on latest version\n\
                The server responded correctly but no newer version is available.",
                current_version
            ))
        }
        Err(e) => {
            let error_details = format!("{}", e);
            
            if error_details.contains("fetch") || error_details.contains("release JSON") {
                Err(format!(
                    "✗ Update endpoint check failed\n\
                    Error: Could not fetch update manifest\n\
                    \n\
                    Possible causes:\n\
                    1. No agent versions published in the database\n\
                    2. Update server is not accessible\n\
                    3. Network connectivity issues\n\
                    4. Incorrect endpoint URL in tauri.conf.json\n\
                    \n\
                    Technical details: {}",
                    error_details
                ))
            } else {
                Err(format!(
                    "✗ Update endpoint check failed\n\
                    Error: {}\n\
                    \n\
                    Please check:\n\
                    - Network connection\n\
                    - Update server availability\n\
                    - Tauri configuration in tauri.conf.json",
                    error_details
                ))
            }
        }
    }
}

