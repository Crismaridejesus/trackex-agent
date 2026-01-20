//! Screenshot upload queue for handling failed uploads with retry logic
//! 
//! This module manages a local SQLite queue of pending screenshot uploads.
//! Screenshots are saved to a temp folder and queued for upload to Cloudinary.
//! Failed uploads are retried with exponential backoff.
//!
//! Note: All SQLite operations use spawn_blocking to avoid Send/Sync issues.

use anyhow::Result;
use chrono::{DateTime, Duration, Utc};
use rusqlite::params;
use std::path::PathBuf;

use super::database;

/// Maximum number of retry attempts before giving up
pub const MAX_RETRIES: i32 = 5;

/// Base retry delay in seconds (doubles with each retry)
pub const BASE_RETRY_DELAY_SECS: i64 = 60;

/// Maximum age for stale files before cleanup (24 hours)
pub const STALE_FILE_THRESHOLD_HOURS: i64 = 24;

/// Warning threshold for temp folder size (100 MB)
pub const TEMP_FOLDER_WARNING_BYTES: u64 = 100 * 1024 * 1024;

/// Error threshold for temp folder size (500 MB)
pub const TEMP_FOLDER_ERROR_BYTES: u64 = 500 * 1024 * 1024;

/// Critical threshold - pause captures (1 GB)
pub const TEMP_FOLDER_CRITICAL_BYTES: u64 = 1024 * 1024 * 1024;

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct QueuedScreenshot {
    pub id: i64,
    pub file_path: String,
    pub employee_id: String,
    pub device_id: String,
    pub taken_at: DateTime<Utc>,
    pub retry_count: i32,
    pub last_attempt: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// Initialize the screenshot queue table
pub async fn init_queue_table() -> Result<()> {
    tokio::task::spawn_blocking(|| {
        let conn = database::get_connection()?;
        
        conn.execute(
            "CREATE TABLE IF NOT EXISTS screenshot_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT NOT NULL,
                employee_id TEXT NOT NULL,
                device_id TEXT NOT NULL,
                taken_at DATETIME NOT NULL,
                retry_count INTEGER NOT NULL DEFAULT 0,
                last_attempt DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;
        
        // Create index for efficient queries
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_screenshot_queue_retry 
             ON screenshot_queue (retry_count, last_attempt)",
            [],
        )?;
        
        log::info!("Screenshot queue table initialized");
        Ok(())
    }).await?
}

/// Add a screenshot to the upload queue
pub async fn queue_screenshot(
    file_path: &str,
    employee_id: &str,
    device_id: &str,
    taken_at: DateTime<Utc>,
) -> Result<i64> {
    let file_path = file_path.to_string();
    let employee_id = employee_id.to_string();
    let device_id = device_id.to_string();
    
    tokio::task::spawn_blocking(move || {
        let conn = database::get_connection()?;
        
        conn.execute(
            "INSERT INTO screenshot_queue (file_path, employee_id, device_id, taken_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![file_path, employee_id, device_id, taken_at],
        )?;
        
        let id = conn.last_insert_rowid();
        log::debug!("Queued screenshot {} for upload: {}", id, file_path);
        
        Ok(id)
    }).await?
}

/// Get pending screenshots ready for upload
/// Returns screenshots that haven't exceeded max retries and are past their retry delay
pub async fn get_pending_uploads(limit: i32) -> Result<Vec<QueuedScreenshot>> {
    let now = Utc::now();
    
    // First get all candidates from the database
    let candidates: Vec<QueuedScreenshot> = tokio::task::spawn_blocking(move || {
        let conn = database::get_connection()?;
        
        let mut stmt = conn.prepare(
            "SELECT id, file_path, employee_id, device_id, taken_at, retry_count, last_attempt, created_at
             FROM screenshot_queue 
             WHERE retry_count < ?1
             ORDER BY created_at ASC
             LIMIT ?2"
        )?;
        
        let screenshot_iter = stmt.query_map(params![MAX_RETRIES, limit], |row| {
            Ok(QueuedScreenshot {
                id: row.get(0)?,
                file_path: row.get(1)?,
                employee_id: row.get(2)?,
                device_id: row.get(3)?,
                taken_at: row.get(4)?,
                retry_count: row.get(5)?,
                last_attempt: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?;
        
        let mut screenshots = Vec::new();
        for screenshot_result in screenshot_iter {
            screenshots.push(screenshot_result?);
        }
        
        Ok::<_, anyhow::Error>(screenshots)
    }).await??;
    
    // Filter based on retry delay and file existence
    let mut result = Vec::new();
    for screenshot in candidates {
        // Check if enough time has passed since last attempt (exponential backoff)
        if let Some(last_attempt) = screenshot.last_attempt {
            let retry_delay = Duration::seconds(
                BASE_RETRY_DELAY_SECS * (1 << screenshot.retry_count.min(6)) // Cap at ~1 hour
            );
            
            if now < last_attempt + retry_delay {
                continue; // Skip - not ready for retry yet
            }
        }
        
        // Verify file still exists
        if std::path::Path::new(&screenshot.file_path).exists() {
            result.push(screenshot);
        } else {
            // File was deleted - remove from queue
            log::warn!("Screenshot file no longer exists, removing from queue: {}", screenshot.file_path);
            let screenshot_id = screenshot.id;
            let _ = tokio::task::spawn_blocking(move || remove_from_queue_sync(screenshot_id));
        }
    }
    
    Ok(result)
}

/// Mark a screenshot upload as successful and remove from queue
pub async fn mark_uploaded(id: i64) -> Result<()> {
    tokio::task::spawn_blocking(move || {
        let conn = database::get_connection()?;
        
        // Get file path before deleting
        let file_path: Option<String> = conn.query_row(
            "SELECT file_path FROM screenshot_queue WHERE id = ?1",
            params![id],
            |row| row.get(0),
        ).ok();
        
        // Delete from queue
        conn.execute(
            "DELETE FROM screenshot_queue WHERE id = ?1",
            params![id],
        )?;
        
        // Delete local file
        if let Some(path) = file_path {
            if let Err(e) = std::fs::remove_file(&path) {
                log::warn!("Failed to delete uploaded screenshot file {}: {}", path, e);
            } else {
                log::debug!("Deleted uploaded screenshot file: {}", path);
            }
        }
        
        log::info!("Screenshot {} uploaded successfully and removed from queue", id);
        Ok(())
    }).await?
}

/// Mark a screenshot upload as failed (increment retry count)
pub async fn mark_upload_failed(id: i64) -> Result<()> {
    tokio::task::spawn_blocking(move || {
        let conn = database::get_connection()?;
        let now = Utc::now();
        
        conn.execute(
            "UPDATE screenshot_queue 
             SET retry_count = retry_count + 1, last_attempt = ?1
             WHERE id = ?2",
            params![now, id],
        )?;
        
        // Check if max retries exceeded
        let result: Result<(i32, String), _> = conn.query_row(
            "SELECT retry_count, file_path FROM screenshot_queue WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        );
        
        if let Ok((retry_count, file_path)) = result {
            if retry_count >= MAX_RETRIES {
                log::error!("Screenshot {} exceeded max retries, removing from queue: {}", id, file_path);
                
                // Delete file and remove from queue
                let _ = std::fs::remove_file(&file_path);
                conn.execute("DELETE FROM screenshot_queue WHERE id = ?1", params![id])?;
            } else {
                let next_retry_delay = BASE_RETRY_DELAY_SECS * (1 << retry_count.min(6));
                log::warn!(
                    "Screenshot {} upload failed (attempt {}/{}), will retry in {}s",
                    id, retry_count, MAX_RETRIES, next_retry_delay
                );
            }
        }
        
        Ok(())
    }).await?
}

/// Remove a screenshot from the queue (without deleting file) - sync version
fn remove_from_queue_sync(id: i64) -> Result<()> {
    let conn = database::get_connection()?;
    
    conn.execute(
        "DELETE FROM screenshot_queue WHERE id = ?1",
        params![id],
    )?;
    
    Ok(())
}

/// Remove a screenshot from the queue (without deleting file)
pub async fn remove_from_queue(id: i64) -> Result<()> {
    tokio::task::spawn_blocking(move || {
        remove_from_queue_sync(id)
    }).await?
}

/// Get the screenshot temp folder path
pub fn get_temp_folder() -> Result<PathBuf> {
    let mut path = dirs::data_dir()
        .ok_or_else(|| anyhow::anyhow!("Failed to get data directory"))?;
    path.push("TrackEx");
    path.push("screenshots_temp");
    
    // Create directory if it doesn't exist
    std::fs::create_dir_all(&path)?;
    
    Ok(path)
}

/// Calculate total size of temp folder in bytes
pub fn get_temp_folder_size() -> Result<u64> {
    let temp_folder = get_temp_folder()?;
    
    let mut total_size: u64 = 0;
    
    if temp_folder.exists() {
        for entry in std::fs::read_dir(&temp_folder)? {
            if let Ok(entry) = entry {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_file() {
                        total_size += metadata.len();
                    }
                }
            }
        }
    }
    
    Ok(total_size)
}

/// Check temp folder size and log warnings
pub fn check_temp_folder_status() -> Result<TempFolderStatus> {
    let size = get_temp_folder_size()?;
    
    let status = if size >= TEMP_FOLDER_CRITICAL_BYTES {
        log::error!(
            "⚠️ CRITICAL: Screenshot temp folder size ({:.2} MB) exceeds critical threshold! Pausing captures.",
            size as f64 / (1024.0 * 1024.0)
        );
        TempFolderStatus::Critical
    } else if size >= TEMP_FOLDER_ERROR_BYTES {
        log::error!(
            "Screenshot temp folder size ({:.2} MB) exceeds error threshold",
            size as f64 / (1024.0 * 1024.0)
        );
        TempFolderStatus::Error
    } else if size >= TEMP_FOLDER_WARNING_BYTES {
        log::warn!(
            "Screenshot temp folder size ({:.2} MB) exceeds warning threshold",
            size as f64 / (1024.0 * 1024.0)
        );
        TempFolderStatus::Warning
    } else {
        TempFolderStatus::Ok
    };
    
    Ok(status)
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum TempFolderStatus {
    Ok,
    Warning,
    Error,
    Critical,
}

/// Clean up stale screenshot files older than the threshold
pub async fn cleanup_stale_files() -> Result<u32> {
    // Run entire cleanup in spawn_blocking since it involves both file I/O and database
    tokio::task::spawn_blocking(|| {
        let temp_folder = get_temp_folder()?;
        let threshold = Utc::now() - Duration::hours(STALE_FILE_THRESHOLD_HOURS);
        let mut deleted_count = 0;
        
        if !temp_folder.exists() {
            return Ok(0);
        }
        
        for entry in std::fs::read_dir(&temp_folder)? {
            if let Ok(entry) = entry {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_file() {
                        // Check file modification time
                        if let Ok(modified) = metadata.modified() {
                            let modified_time: DateTime<Utc> = modified.into();
                            
                            if modified_time < threshold {
                                let path = entry.path();
                                
                                // Check if file is still in queue
                                let file_path_str = path.to_string_lossy().to_string();
                                let in_queue = is_file_in_queue_sync(&file_path_str)?;
                                
                                if !in_queue {
                                    if let Err(e) = std::fs::remove_file(&path) {
                                        log::warn!("Failed to delete stale file {:?}: {}", path, e);
                                    } else {
                                        log::info!("Deleted stale screenshot file: {:?}", path);
                                        deleted_count += 1;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Also clean up queue entries for files that no longer exist
        let orphaned_count = cleanup_orphaned_queue_entries_sync()?;
        
        if deleted_count > 0 || orphaned_count > 0 {
            log::info!(
                "Cleanup complete: {} stale files deleted, {} orphaned queue entries removed",
                deleted_count, orphaned_count
            );
        }
        
        Ok(deleted_count)
    }).await?
}

/// Check if a file path is in the queue - sync version
fn is_file_in_queue_sync(file_path: &str) -> Result<bool> {
    let conn = database::get_connection()?;
    
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM screenshot_queue WHERE file_path = ?1",
        params![file_path],
        |row| row.get(0),
    )?;
    
    Ok(count > 0)
}

/// Remove queue entries for files that no longer exist - sync version
fn cleanup_orphaned_queue_entries_sync() -> Result<u32> {
    let conn = database::get_connection()?;
    
    let mut stmt = conn.prepare(
        "SELECT id, file_path FROM screenshot_queue"
    )?;
    
    let entries: Vec<(i64, String)> = stmt.query_map([], |row| {
        Ok((row.get(0)?, row.get(1)?))
    })?.filter_map(|r| r.ok()).collect();
    
    let mut deleted_count = 0;
    
    for (id, file_path) in entries {
        if !std::path::Path::new(&file_path).exists() {
            conn.execute(
                "DELETE FROM screenshot_queue WHERE id = ?1",
                params![id],
            )?;
            deleted_count += 1;
        }
    }
    
    Ok(deleted_count)
}

/// Get count of pending screenshots in queue
pub async fn get_queue_count() -> Result<i32> {
    tokio::task::spawn_blocking(|| {
        let conn = database::get_connection()?;
        
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM screenshot_queue",
            [],
            |row| row.get(0),
        )?;
        
        Ok(count)
    }).await?
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_temp_folder_path() {
        let path = get_temp_folder();
        assert!(path.is_ok());
    }
}
