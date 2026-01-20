//! Automatic screenshot capture service
//!
//! Background service that captures screenshots at configured intervals
//! when auto_screenshots is enabled for the employee.

use tauri::AppHandle;
use tokio::time::Duration;
use chrono::Utc;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::sync::RwLock;
use std::sync::OnceLock;

use crate::api::{employee_settings, cloudinary_upload};
use crate::screenshots::screen_capture;
use crate::storage::screenshot_queue::{
    self, TempFolderStatus, get_pending_uploads, mark_uploaded, mark_upload_failed, queue_screenshot,
};

/// Minimum interval between screenshots (30 minutes, matches schema validation)
const MIN_SCREENSHOT_INTERVAL_SECS: u64 = 1800;

/// Tolerance window for interval checking (±5 seconds)
/// This accounts for minor timing variations in async operations
const INTERVAL_TOLERANCE_SECS: u64 = 5;

/// Check interval when screenshots are disabled (5 minutes)
const DISABLED_CHECK_INTERVAL_SECS: u64 = 300;

/// Batch size for retry uploads
const RETRY_BATCH_SIZE: i32 = 5;

/// Cleanup interval (1 hour)
const CLEANUP_INTERVAL_SECS: u64 = 3600;

/// Guard to ensure only one screenshot service instance runs at a time
static SCREENSHOT_SERVICE_GUARD: AtomicBool = AtomicBool::new(false);

/// Track if first screenshot has been taken in this session
static FIRST_SCREENSHOT_TAKEN: AtomicBool = AtomicBool::new(false);

/// Global last capture timestamp - shared across all potential instances
/// This ensures the interval is respected even if multiple service starts are attempted
static GLOBAL_LAST_CAPTURE: OnceLock<RwLock<Option<chrono::DateTime<chrono::Utc>>>> = OnceLock::new();

fn get_last_capture_lock() -> &'static RwLock<Option<chrono::DateTime<chrono::Utc>>> {
    GLOBAL_LAST_CAPTURE.get_or_init(|| RwLock::new(None))
}

/// Start the automatic screenshot service
/// This service captures screenshots at the configured interval when auto_screenshots is enabled
pub async fn start_screenshot_service(_app_handle: AppHandle) {
    // Guard: Ensure only one instance runs at a time
    // Use compare_exchange for atomic check-and-set
    if SCREENSHOT_SERVICE_GUARD.compare_exchange(
        false,
        true,
        Ordering::SeqCst,
        Ordering::SeqCst
    ).is_err() {
        log::warn!("Screenshot service already running (guard check failed), skipping duplicate start");
        return;
    }
    
    log::info!("Screenshot service starting (single instance guaranteed)");
    
    // Reset first screenshot flag for this session
    FIRST_SCREENSHOT_TAKEN.store(false, Ordering::SeqCst);
    
    // Initialize screenshot queue table
    if let Err(e) = screenshot_queue::init_queue_table().await {
        log::error!("Failed to initialize screenshot queue table: {}", e);
        SCREENSHOT_SERVICE_GUARD.store(false, Ordering::SeqCst);
        return;
    }
    
    // Initialize last capture time
    {
        let mut last_capture_guard = get_last_capture_lock().write().await;
        let now = Utc::now();
        *last_capture_guard = Some(now);
        log::info!(
            "Screenshot service: Initialized - first screenshot will be taken immediately when auto_screenshots enabled"
        );
    }
    
    let mut last_cleanup = Utc::now();
    
    loop {
        // Check if services should continue running
        if !super::should_services_run().await {
            if !super::is_services_running().await {
                log::info!("Screenshot service stopping - user clocked out or logged out");
                break;
            }
            // Not running, wait and check again
            tokio::time::sleep(Duration::from_secs(10)).await;
            continue;
        }
        
        // Check if auto screenshots are enabled
        let settings = match employee_settings::get_employee_settings().await {
            Ok(s) => s,
            Err(e) => {
                log::warn!("Failed to fetch employee settings: {}", e);
                tokio::time::sleep(Duration::from_secs(30)).await;
                continue;
            }
        };
        
        if !settings.auto_screenshots {
            log::info!(
                "Auto screenshots DISABLED for employee (auto_screenshots=false, interval={}min) - checking again in {}s",
                settings.screenshot_interval,
                DISABLED_CHECK_INTERVAL_SECS
            );
            
            // Reset first screenshot flag when disabled
            FIRST_SCREENSHOT_TAKEN.store(false, Ordering::SeqCst);
            
            // Still process retry queue even if screenshots are disabled
            process_retry_queue().await;
            
            tokio::time::sleep(Duration::from_secs(DISABLED_CHECK_INTERVAL_SECS)).await;
            continue;
        }
        
        // Take FIRST screenshot IMMEDIATELY when auto_screenshots is enabled
        if !FIRST_SCREENSHOT_TAKEN.load(Ordering::SeqCst) {
            log::info!("=== TAKING FIRST AUTO SCREENSHOT IMMEDIATELY ===");
            
            // Check temp folder status before capturing
            match screenshot_queue::check_temp_folder_status() {
                Ok(TempFolderStatus::Critical) => {
                    log::error!("Temp folder critical - skipping first screenshot until queue clears");
                    process_retry_queue().await;
                    tokio::time::sleep(Duration::from_secs(10)).await;
                    continue;
                }
                Ok(TempFolderStatus::Error) | Ok(TempFolderStatus::Warning) => {
                    process_retry_queue().await;
                }
                _ => {}
            }
            
            match capture_and_upload_screenshot().await {
                Ok(_) => {
                    log::info!("=== FIRST AUTO SCREENSHOT COMPLETED SUCCESSFULLY ===");
                    FIRST_SCREENSHOT_TAKEN.store(true, Ordering::SeqCst);
                    
                    // Update last capture time
                    let mut last_capture_guard = get_last_capture_lock().write().await;
                    let now = Utc::now();
                    *last_capture_guard = Some(now);
                    log::info!(
                        "Updated last_capture_time to {} - next screenshot in {}min",
                        now.format("%Y-%m-%d %H:%M:%S UTC"),
                        settings.screenshot_interval
                    );
                }
                Err(e) => {
                    log::error!("=== FIRST AUTO SCREENSHOT FAILED: {} === Will retry on next interval", e);
                    FIRST_SCREENSHOT_TAKEN.store(true, Ordering::SeqCst);
                }
            }
            
            // Process retry queue after first screenshot
            process_retry_queue().await;
            
            // Sleep briefly before continuing to normal interval-based captures
            tokio::time::sleep(Duration::from_secs(5)).await;
            continue;
        }
        
        // Get screenshot interval from settings (convert minutes to seconds)
        // Ensure minimum of MIN_SCREENSHOT_INTERVAL_SECS (2 minutes = 120 seconds)
        let interval_secs = (settings.screenshot_interval as u64 * 60)
            .max(MIN_SCREENSHOT_INTERVAL_SECS);
        
        log::info!(
            "Auto screenshots ENABLED: interval={}min ({}s), minimum={}s",
            settings.screenshot_interval,
            interval_secs,
            MIN_SCREENSHOT_INTERVAL_SECS
        );
        
        // Check if enough time has passed since last capture using GLOBAL state
        // Use tolerance window to account for minor timing variations
        let (should_capture, actual_elapsed) = {
            let last_capture_guard = get_last_capture_lock().read().await;
            match *last_capture_guard {
                Some(last) => {
                    let now: chrono::DateTime<Utc> = Utc::now();
                    let elapsed = now.signed_duration_since(last).num_seconds() as u64;
                    // Apply tolerance: capture if elapsed >= (interval - tolerance)
                    // This ensures we don't miss captures due to minor timing variations
                    let threshold = interval_secs.saturating_sub(INTERVAL_TOLERANCE_SECS);
                    let should = elapsed >= threshold;
                    
                    // Log every 30 seconds for visibility, or always if should_capture is true
                    if should || elapsed % 30 < 10 {
                        log::info!(
                            "Screenshot interval check: elapsed={}s of {}s required (threshold={}s with {}s tolerance), should_capture={}",
                            elapsed,
                            interval_secs,
                            threshold,
                            INTERVAL_TOLERANCE_SECS,
                            should
                        );
                    }
                    (should, elapsed)
                }
                None => {
                    // Should never happen since we initialize on service start
                    log::warn!("No previous capture time found (unexpected) - waiting for full interval");
                    (false, 0) // Wait for interval even on first capture
                }
            }
        };
        
        if should_capture {
            // Check temp folder status before capturing
            match screenshot_queue::check_temp_folder_status() {
                Ok(TempFolderStatus::Critical) => {
                    log::error!("Temp folder critical - skipping capture until queue clears");
                    // Process retry queue aggressively
                    for _ in 0..3 {
                        process_retry_queue().await;
                        tokio::time::sleep(Duration::from_secs(10)).await;
                    }
                    continue;
                }
                Ok(TempFolderStatus::Error) | Ok(TempFolderStatus::Warning) => {
                    // Log already done in check_temp_folder_status
                    // Continue but process queue
                    process_retry_queue().await;
                }
                _ => {}
            }
            
            // Capture screenshot - this is where auto screenshots are actually taken
            log::info!(
                "=== TAKING AUTO SCREENSHOT === interval={}s ({}min), actual_elapsed={}s, auto_screenshots=true",
                interval_secs,
                settings.screenshot_interval,
                actual_elapsed
            );
            
            match capture_and_upload_screenshot().await {
                Ok(_) => {
                    log::info!("=== AUTO SCREENSHOT COMPLETED SUCCESSFULLY ===");
                }
                Err(e) => {
                    log::error!("=== AUTO SCREENSHOT FAILED: {} ===", e);
                }
            }
            
            // Update GLOBAL last capture time
            {
                let mut last_capture_guard = get_last_capture_lock().write().await;
                let now = Utc::now();
                *last_capture_guard = Some(now);
                log::info!(
                    "Updated last_capture_time to {} - next screenshot in {}s",
                    now.format("%Y-%m-%d %H:%M:%S UTC"),
                    interval_secs
                );
            }
        }
        
        // Process retry queue
        process_retry_queue().await;
        
        // Periodic cleanup
        let now: chrono::DateTime<Utc> = Utc::now();
        if now.signed_duration_since(last_cleanup).num_seconds() as u64 >= CLEANUP_INTERVAL_SECS {
            if let Err(e) = screenshot_queue::cleanup_stale_files().await {
                log::warn!("Failed to cleanup stale files: {}", e);
            }
            last_cleanup = Utc::now();
        }
        
        // Calculate sleep time based on when next screenshot should be taken
        // This ensures precise timing regardless of loop processing duration
        let sleep_duration = {
            let last_capture_guard = get_last_capture_lock().read().await;
            if let Some(last_capture) = *last_capture_guard {
                let next_capture_time = last_capture + chrono::Duration::seconds(interval_secs as i64);
                let now = Utc::now();
                let time_until_next = next_capture_time.signed_duration_since(now).num_seconds();
                
                if time_until_next > 0 {
                    // Sleep until next screenshot is due (minus tolerance for precision)
                    (time_until_next as u64).saturating_sub(INTERVAL_TOLERANCE_SECS / 2)
                } else {
                    // We're already past due (processing took too long), check immediately
                    1
                }
            } else {
                // No last capture time (shouldn't happen), use full interval
                interval_secs
            }
        };

        // Cap sleep at interval to ensure we check at least every interval, minimum 1 second
        let sleep_secs = sleep_duration.min(interval_secs).max(1);

        log::debug!(
            "Screenshot loop: next check in {}s (interval={}s, based on last_capture + interval)",
            sleep_secs,
            interval_secs
        );
        tokio::time::sleep(Duration::from_secs(sleep_secs)).await;
    }
    
    // Release the guard when service stops
    SCREENSHOT_SERVICE_GUARD.store(false, Ordering::SeqCst);
    log::info!("Screenshot service stopped (guard released)");
}

/// Capture a screenshot and upload it
async fn capture_and_upload_screenshot() -> anyhow::Result<()> {
    // Get device and employee info
    let device_id = crate::storage::get_device_id().await
        .map_err(|_| anyhow::anyhow!("No device ID available"))?;
    let employee_id = crate::storage::get_employee_id().await
        .map_err(|_| anyhow::anyhow!("No employee ID available"))?;
    
    let taken_at = Utc::now();
    
    // Capture screenshot to temp file
    let screenshot_result = screen_capture::capture_screen_to_file().await?;
    let file_path = screenshot_result.file_path.to_string_lossy().to_string();
    
    log::info!(
        "Screenshot captured: {}x{} ({} bytes) -> {}",
        screenshot_result.width,
        screenshot_result.height,
        screenshot_result.bytes,
        file_path
    );
    
    // Queue for upload
    let queue_id = queue_screenshot(&file_path, &employee_id, &device_id, taken_at).await?;
    
    // Try immediate upload
    match cloudinary_upload::upload_and_record_screenshot(
        &screenshot_result.file_path,
        &employee_id,
        &device_id,
        taken_at,
        true, // is_auto
    ).await {
        Ok(screenshot_id) => {
            log::info!("Screenshot uploaded and recorded: {}", screenshot_id);
            
            // Remove from queue and delete file
            mark_uploaded(queue_id).await?;
        }
        Err(e) => {
            log::warn!("Immediate upload failed (will retry): {}", e);
            mark_upload_failed(queue_id).await?;
        }
    }
    
    Ok(())
}

/// Process the retry queue for failed uploads
async fn process_retry_queue() {
    let pending = match get_pending_uploads(RETRY_BATCH_SIZE).await {
        Ok(p) => p,
        Err(e) => {
            log::warn!("Failed to get pending uploads: {}", e);
            return;
        }
    };
    
    if pending.is_empty() {
        return;
    }
    
    log::info!("Processing {} pending screenshot uploads", pending.len());
    
    for queued in pending {
        let file_path = std::path::Path::new(&queued.file_path);
        
        if !file_path.exists() {
            log::warn!("Queued file no longer exists: {}", queued.file_path);
            let _ = screenshot_queue::remove_from_queue(queued.id).await;
            continue;
        }
        
        match cloudinary_upload::upload_and_record_screenshot(
            file_path,
            &queued.employee_id,
            &queued.device_id,
            queued.taken_at,
            true, // is_auto
        ).await {
            Ok(screenshot_id) => {
                log::info!(
                    "Retry upload successful: {} -> {}",
                    queued.file_path,
                    screenshot_id
                );
                let _ = mark_uploaded(queued.id).await;
            }
            Err(e) => {
                log::warn!(
                    "Retry upload failed (attempt {}): {} - {}",
                    queued.retry_count + 1,
                    queued.file_path,
                    e
                );
                let _ = mark_upload_failed(queued.id).await;
            }
        }
        
        // Small delay between retries
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
}

/// Manually trigger a screenshot capture (for on-demand screenshots)
#[allow(dead_code)]
pub async fn take_manual_screenshot() -> anyhow::Result<String> {
    let device_id = crate::storage::get_device_id().await
        .map_err(|_| anyhow::anyhow!("No device ID available"))?;
    let employee_id = crate::storage::get_employee_id().await
        .map_err(|_| anyhow::anyhow!("No employee ID available"))?;
    
    let taken_at = Utc::now();
    
    // Capture screenshot
    let screenshot_result = screen_capture::capture_screen_to_file().await?;
    
    // Upload directly (no queue for manual screenshots)
    let screenshot_id = cloudinary_upload::upload_and_record_screenshot(
        &screenshot_result.file_path,
        &employee_id,
        &device_id,
        taken_at,
        false, // not auto
    ).await?;
    
    // Delete temp file
    let _ = std::fs::remove_file(&screenshot_result.file_path);
    
    Ok(screenshot_id)
}

/// Get current screenshot service status
#[allow(dead_code)]
pub async fn get_screenshot_status() -> ScreenshotServiceStatus {
    let settings = employee_settings::get_employee_settings().await.ok();
    let queue_count = screenshot_queue::get_queue_count().await.unwrap_or(0);
    let temp_folder_status = screenshot_queue::check_temp_folder_status().ok();
    
    ScreenshotServiceStatus {
        auto_screenshots_enabled: settings.as_ref().map(|s| s.auto_screenshots).unwrap_or(false),
        screenshot_interval_minutes: settings.as_ref().map(|s| s.screenshot_interval).unwrap_or(10),
        pending_uploads: queue_count,
        temp_folder_status: temp_folder_status.map(|s| format!("{:?}", s)),
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ScreenshotServiceStatus {
    pub auto_screenshots_enabled: bool,
    pub screenshot_interval_minutes: i32,
    pub pending_uploads: i32,
    pub temp_folder_status: Option<String>,
}
