use anyhow::Result;
use tauri::AppHandle;
use tokio::time::{sleep, Duration};
use serde_json::Value;

use crate::api::client::ApiClient;
use crate::api::cloudinary_upload;
use crate::screenshots::screen_capture;

pub async fn start_job_polling(_app_handle: AppHandle) {
    let interval_seconds = crate::sampling::get_job_polling_interval();

    let mut interval = tokio::time::interval(Duration::from_secs(interval_seconds));
    let mut last_cursor: Option<String> = None;
    
    loop {
        // Check if services should continue running (authenticated AND clocked in)
        if !crate::sampling::should_services_run().await {
            // Stop if user is not authenticated or not clocked in
            if !crate::sampling::is_services_running().await {
                break; // Service stopped completely
            }
            // Otherwise, just wait before checking again
            interval.tick().await;
            continue;
        }

        // Poll for jobs (only when authenticated and clocked in)
        if let Err(e) = poll_jobs(&mut last_cursor).await {
            log::error!("Failed to poll jobs: {}", e);
            // Wait a bit before retrying on error
            sleep(Duration::from_secs(10)).await;
        }

        interval.tick().await;
    }

}

async fn poll_jobs(last_cursor: &mut Option<String>) -> Result<()> {
    let client = ApiClient::new().await?;
    
    let endpoint = if let Some(cursor) = last_cursor {
        format!("/api/ingest/jobs?since={}", cursor)
    } else {
        "/api/ingest/jobs".to_string()
    };

    let response = client.get_with_auth(&endpoint).await?;
    if !response.status().is_success() {
        return Err(anyhow::anyhow!("Job polling failed: {}", response.status()));
    }

    let jobs_data: Value = response.json().await?;
    if let Some(jobs) = jobs_data["jobs"].as_array() {
        if !jobs.is_empty() {
            log::info!("Job polling: found {} pending job(s)", jobs.len());
        }
        for job in jobs {
            log::info!("Processing job: {:?}", job);
            if let Err(e) = process_job(job).await {
                log::error!("Failed to process job: {}", e);
            }
        }
    } else {
        log::debug!("Job polling: no jobs found");
    }

    // Update cursor for next poll
    if let Some(new_cursor) = jobs_data["cursor"].as_str() {
        *last_cursor = Some(new_cursor.to_string());
    }

    Ok(())
}

async fn process_job(job: &Value) -> Result<()> {
    let job_type = job["type"].as_str()
        .ok_or_else(|| anyhow::anyhow!("Job missing type"))?;

    match job_type {
        "screenshot" => {
            process_screenshot_job(job).await?;
        }
        "diagnostics" => {
            process_diagnostics_job(job).await?;
        }
        _ => {
            log::warn!("Unknown job type: {}", job_type);
        }
    }

    Ok(())
}

async fn process_screenshot_job(job: &Value) -> Result<()> {
    let job_id = job["id"].as_str()
        .ok_or_else(|| anyhow::anyhow!("Job missing id"))?;
    
    log::info!("Processing screenshot job: {}", job_id);
    
    // Try to process the screenshot, sending failure event if anything goes wrong
    match process_screenshot_job_inner(job_id).await {
        Ok(()) => Ok(()),
        Err(e) => {
            log::error!("Screenshot job {} failed: {}", job_id, e);
            // Send screenshot_failed event to update job status
            if let Err(send_err) = send_screenshot_failed_event(job_id, &e.to_string()).await {
                log::error!("Failed to send screenshot_failed event for job {}: {}", job_id, send_err);
            }
            Err(e)
        }
    }
}

async fn process_screenshot_job_inner(job_id: &str) -> Result<()> {
    // Get device and employee info
    let device_id = crate::storage::get_device_id().await
        .map_err(|_| anyhow::anyhow!("No device ID available"))?;
    let employee_id = crate::storage::get_employee_id().await
        .map_err(|_| anyhow::anyhow!("No employee ID available"))?;
    
    // Capture screenshot to file
    let screenshot_result = screen_capture::capture_screen_to_file().await?;
    
    log::info!(
        "Screenshot captured for job {}: {}x{} ({} bytes)",
        job_id,
        screenshot_result.width,
        screenshot_result.height,
        screenshot_result.bytes
    );
    
    // Upload to Cloudinary
    let cloudinary_result = cloudinary_upload::upload_screenshot_file(
        &screenshot_result.file_path,
        &employee_id,
        &device_id,
    ).await?;
    
    log::info!("Screenshot uploaded for job {}: {}", job_id, cloudinary_result.secure_url);
    
    // Clean up temp file
    if let Err(e) = std::fs::remove_file(&screenshot_result.file_path) {
        log::warn!("Failed to delete temp screenshot file: {}", e);
    }
    
    // Send screenshot_taken event with Cloudinary data
    let client = ApiClient::new().await?;
    // Use format with Z suffix for Zod datetime validation compatibility
    let timestamp = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    let event_data = serde_json::json!({
        "events": [{
            "type": "screenshot_taken",
            "timestamp": timestamp,
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
    
    let response = client.post_with_auth("/api/ingest/events", &event_data).await?;
    
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(anyhow::anyhow!(
            "Failed to send screenshot event: {} - {}",
            status,
            body
        ));
    }
    
    log::info!("Screenshot job {} completed successfully", job_id);
    
    Ok(())
}

async fn send_screenshot_failed_event(job_id: &str, error_message: &str) -> Result<()> {
    let client = ApiClient::new().await?;
    // Use format with Z suffix for Zod datetime validation compatibility
    let timestamp = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    let event_data = serde_json::json!({
        "events": [{
            "type": "screenshot_failed",
            "timestamp": timestamp,
            "data": {
                "jobId": job_id,
                "job_id": job_id,
                "error": error_message,
                "auto": false
            }
        }]
    });
    
    let response = client.post_with_auth("/api/ingest/events", &event_data).await?;
    
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(anyhow::anyhow!(
            "Failed to send screenshot_failed event: {} - {}",
            status,
            body
        ));
    }
    
    log::info!("Screenshot job {} marked as failed", job_id);
    Ok(())
}

async fn process_diagnostics_job(_job: &Value) -> Result<()> {
    // TODO: Implement diagnostics collection
    Ok(())
}

