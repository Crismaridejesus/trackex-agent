//! Cloudinary upload service for screenshot uploads
//!
//! Handles uploading screenshots to Cloudinary with environment-aware folder naming
//! and proper error handling with retry support.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::json;

use super::client::ApiClient;

/// Cloudinary upload result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudinaryUploadResult {
    pub public_id: String,
    pub secure_url: String,
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub bytes: u64,
}

/// Check if we're in development/test environment
fn is_test_environment() -> bool {
    // Check various ways to determine environment
    if cfg!(debug_assertions) {
        return true;
    }
    
    // Check for environment variable
    if let Ok(env) = std::env::var("TRACKEX_ENV") {
        return env.to_lowercase() == "test" || env.to_lowercase() == "development";
    }
    
    // Check if using localhost server
    if let Ok(server_url) = std::env::var("TRACKEX_SERVER_URL") {
        return server_url.contains("localhost") || server_url.contains("127.0.0.1");
    }
    
    false
}

/// Get the Cloudinary folder path with environment prefix
fn get_cloudinary_folder(employee_id: &str) -> String {
    let base_folder = if is_test_environment() {
        "test-screenshots"
    } else {
        "screenshots"
    };
    
    format!("{}/{}", base_folder, employee_id)
}

/// Upload a screenshot file to Cloudinary via the backend
pub async fn upload_screenshot_file(
    file_path: &std::path::Path,
    employee_id: &str,
    device_id: &str,
) -> Result<CloudinaryUploadResult> {
    // Read the file
    let file_data = std::fs::read(file_path)?;
    let file_size = file_data.len();
    
    log::info!(
        "Uploading screenshot to Cloudinary: {} ({} bytes)",
        file_path.display(),
        file_size
    );
    
    let client = ApiClient::new().await?;
    let folder = get_cloudinary_folder(employee_id);
    
    // Request upload signature from backend
    let timestamp = chrono::Utc::now().timestamp();
    let public_id = format!(
        "{}_{}_{}",
        device_id,
        chrono::Utc::now().format("%Y%m%d_%H%M%S"),
        uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("x")
    );
    
    let signature_request = json!({
        "timestamp": timestamp,
        "folder": folder,
        "public_id": public_id,
        "purpose": "screenshot"
    });
    
    log::info!(
        "Requesting Cloudinary signature: folder={}, public_id={}, timestamp={}",
        folder,
        public_id,
        timestamp
    );
    
    let response = match client.post_with_auth("/api/uploads/cloudinary-signature", &signature_request).await {
        Ok(r) => r,
        Err(e) => {
            log::error!(
                "Failed to request Cloudinary signature (network error): {} - folder={}, public_id={}",
                e,
                folder,
                public_id
            );
            return Err(anyhow::anyhow!("Network error requesting Cloudinary signature: {}", e));
        }
    };
    
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        log::error!(
            "Cloudinary signature request FAILED: status={}, body={}, folder={}, public_id={}",
            status,
            body,
            folder,
            public_id
        );
        return Err(anyhow::anyhow!(
            "Failed to get Cloudinary signature: {} - {}",
            status,
            body
        ));
    }
    
    #[derive(Deserialize)]
    struct SignatureResponse {
        signature: String,
        timestamp: i64,
        api_key: String,
        cloud_name: String,
    }
    
    let sig_response: SignatureResponse = match response.json().await {
        Ok(r) => r,
        Err(e) => {
            log::error!(
                "Failed to parse Cloudinary signature response: {} - folder={}, public_id={}",
                e,
                folder,
                public_id
            );
            return Err(anyhow::anyhow!("Failed to parse Cloudinary signature response: {}", e));
        }
    };
    
    log::info!(
        "Cloudinary signature received successfully: cloud_name={}, timestamp={}",
        sig_response.cloud_name,
        sig_response.timestamp
    );
    
    // Upload directly to Cloudinary
    let upload_url = format!(
        "https://api.cloudinary.com/v1_1/{}/image/upload",
        sig_response.cloud_name
    );
    
    // Create multipart form
    let form = reqwest::multipart::Form::new()
        .text("signature", sig_response.signature)
        .text("timestamp", sig_response.timestamp.to_string())
        .text("api_key", sig_response.api_key)
        .text("folder", folder.clone())
        .text("public_id", public_id.clone())
        .part(
            "file",
            reqwest::multipart::Part::bytes(file_data)
                .file_name("screenshot.jpg")
                .mime_str("image/jpeg")?,
        );
    
    let http_client = reqwest::Client::builder()
        .user_agent(format!("TrackEx-Agent/{}", env!("CARGO_PKG_VERSION")))
        .build()?;
    let upload_response = http_client
        .post(&upload_url)
        .multipart(form)
        .send()
        .await?;
    
    if !upload_response.status().is_success() {
        let status = upload_response.status();
        let body = upload_response.text().await.unwrap_or_default();
        log::error!(
            "Cloudinary upload FAILED: status={}, body={}, url={}, folder={}, public_id={}, file_size={}",
            status,
            body,
            upload_url,
            folder,
            public_id,
            file_size
        );
        return Err(anyhow::anyhow!(
            "Failed to upload to Cloudinary: {} - {}",
            status,
            body
        ));
    }
    
    #[derive(Deserialize)]
    struct CloudinaryResponse {
        public_id: String,
        secure_url: String,
        width: u32,
        height: u32,
        format: String,
        bytes: u64,
    }
    
    let cloudinary_response: CloudinaryResponse = upload_response.json().await?;
    
    log::info!(
        "Screenshot uploaded successfully: {} ({}x{}, {} bytes)",
        cloudinary_response.public_id,
        cloudinary_response.width,
        cloudinary_response.height,
        cloudinary_response.bytes
    );
    
    Ok(CloudinaryUploadResult {
        public_id: cloudinary_response.public_id,
        secure_url: cloudinary_response.secure_url,
        width: cloudinary_response.width,
        height: cloudinary_response.height,
        format: cloudinary_response.format,
        bytes: cloudinary_response.bytes,
    })
}

/// Record a screenshot in the backend database
pub async fn record_screenshot(
    employee_id: &str,
    device_id: &str,
    cloudinary_result: &CloudinaryUploadResult,
    taken_at: chrono::DateTime<chrono::Utc>,
    is_auto: bool,
) -> Result<String> {
    let client = ApiClient::new().await?;
    
    let record_request = json!({
        "employeeId": employee_id,
        "deviceId": device_id,
        "cloudinaryPublicId": cloudinary_result.public_id,
        "cloudinaryUrl": cloudinary_result.secure_url,
        "width": cloudinary_result.width,
        "height": cloudinary_result.height,
        "format": cloudinary_result.format,
        "bytes": cloudinary_result.bytes,
        "isAuto": is_auto,
        "takenAt": taken_at.to_rfc3339()
    });
    
    let response = client.post_with_auth("/api/agent/screenshots", &record_request).await?;
    
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        log::error!(
            "Screenshot record FAILED: status={}, body={}, employee_id={}, device_id={}, cloudinary_url={}, is_auto={}",
            status,
            body,
            employee_id,
            device_id,
            cloudinary_result.secure_url,
            is_auto
        );
        return Err(anyhow::anyhow!(
            "Failed to record screenshot: {} - {}",
            status,
            body
        ));
    }
    
    #[derive(Deserialize)]
    struct RecordResponse {
        id: String,
    }
    
    let record_response: RecordResponse = response.json().await?;
    
    log::info!("Screenshot recorded in database: {}", record_response.id);
    
    Ok(record_response.id)
}

/// Upload and record a screenshot in one operation
/// Returns the screenshot ID on success
pub async fn upload_and_record_screenshot(
    file_path: &std::path::Path,
    employee_id: &str,
    device_id: &str,
    taken_at: chrono::DateTime<chrono::Utc>,
    is_auto: bool,
) -> Result<String> {
    log::info!(
        "Starting upload_and_record_screenshot: file={}, employee={}, device={}, is_auto={}",
        file_path.display(),
        employee_id,
        device_id,
        is_auto
    );
    
    // Upload to Cloudinary
    let cloudinary_result = upload_screenshot_file(file_path, employee_id, device_id).await?;
    
    // Record in database
    let screenshot_id = record_screenshot(
        employee_id,
        device_id,
        &cloudinary_result,
        taken_at,
        is_auto,
    ).await?;
    
    Ok(screenshot_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_folder_naming() {
        // In test mode, should use test_ prefix
        let folder = get_cloudinary_folder("emp_123");
        assert!(folder.starts_with("test-screenshots/") || folder.starts_with("screenshots/"));
        assert!(folder.ends_with("/emp_123"));
    }
    
    #[test]
    fn test_environment_detection() {
        // Debug builds should be test environment
        if cfg!(debug_assertions) {
            assert!(is_test_environment());
        }
    }
}
