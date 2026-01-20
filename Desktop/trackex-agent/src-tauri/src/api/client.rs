use anyhow::Result;
use reqwest::{Client, Response};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration;

use crate::storage::secure_store;

use std::env;

/// Response from the active-session endpoint
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveSessionResponse {
    #[serde(rename = "hasActiveSession")]
    pub has_active_session: bool,
    pub session: Option<ActiveSession>,
    pub device: Option<DeviceInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveSession {
    pub id: String,
    #[serde(rename = "clockIn")]
    pub clock_in: String,
    #[serde(rename = "clockOut")]
    pub clock_out: Option<String>,
    #[serde(rename = "totalWork")]
    pub total_work: Option<i64>,
    #[serde(rename = "totalIdle")]
    pub total_idle: Option<i64>,
    #[serde(rename = "totalActive")]
    pub total_active: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub id: String,
    #[serde(rename = "deviceName")]
    pub device_name: String,
    pub platform: String,
}

pub struct ApiClient {
    client: Client,
    base_url: String,
}

impl ApiClient {
    pub async fn new() -> Result<Self> {
        

        let base_url = crate::storage::get_server_url().await?;

        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent(format!("TrackEx-Agent/{}", env!("CARGO_PKG_VERSION")))
            .build()?;

        Ok(Self { client, base_url })
    }

    pub async fn get_with_auth(&self, endpoint: &str) -> Result<Response> {
        let device_token = crate::storage::get_device_token().await
            .map_err(|_| anyhow::anyhow!("No device token available"))?;
        log::info!("Device token: {}", device_token);
        let url = format!("{}{}", self.base_url, endpoint);

        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", device_token))
            .header("Content-Type", "application/json")
            .send()
            .await?;

        Ok(response)
    }

    pub async fn post_with_auth(&self, endpoint: &str, body: &Value) -> Result<Response> {
        let device_token = crate::storage::get_device_token().await
            .map_err(|_| anyhow::anyhow!("No device token available"))?;
        let url = format!("{}{}", self.base_url, endpoint);

        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", device_token))
            .header("Content-Type", "application/json")
            .json(body)
            .send()
            .await?;

        Ok(response)
    }

    #[allow(dead_code)]
    pub async fn post(&self, endpoint: &str, body: &Value) -> Result<Response> {
        let url = format!("{}{}", self.base_url, endpoint);

        let response = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(body)
            .send()
            .await?;

        Ok(response)
    }

    #[allow(dead_code)]
    pub async fn put_with_auth(&self, endpoint: &str, body: &Value) -> Result<Response> {
        let device_token = secure_store::get_device_token().await?
            .ok_or_else(|| anyhow::anyhow!("No device token available"))?;
        let url = format!("{}{}", self.base_url, endpoint);

        let response = self.client
            .put(&url)
            .header("Authorization", format!("Bearer {}", device_token))
            .header("Content-Type", "application/json")
            .json(body)
            .send()
            .await?;

        Ok(response)
    }

    #[allow(dead_code)]
    pub async fn upload_file(&self, presigned_url: &str, file_data: &[u8], content_type: &str) -> Result<Response> {
        let response = self.client
            .put(presigned_url)
            .header("Content-Type", content_type)
            .body(file_data.to_vec())
            .send()
            .await?;

        Ok(response)
    }
    
    /// Check if there's an active work session on the backend for this device
    /// Used on app startup to sync local state with server state
    #[allow(dead_code)]
    pub async fn check_active_session(&self) -> Result<ActiveSessionResponse> {
        let response = self.get_with_auth("/api/devices/active-session").await?;
        
        if response.status().is_success() {
            let session_response: ActiveSessionResponse = response.json().await?;
            Ok(session_response)
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            Err(anyhow::anyhow!("Failed to check active session: {} - {}", status, error_text))
        }
    }
}

/// Standalone function to check for active session on the backend
/// This can be called before the full API client is set up
pub async fn check_backend_active_session(server_url: &str, device_token: &str) -> Result<ActiveSessionResponse> {
    let client = Client::builder()
        .timeout(Duration::from_secs(10))
        .connect_timeout(Duration::from_secs(5))
        .user_agent(format!("TrackEx-Agent/{}", env!("CARGO_PKG_VERSION")))
        .build()?;
    
    let url = format!("{}/api/devices/active-session", server_url.trim_end_matches('/'));
    
    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", device_token))
        .header("Content-Type", "application/json")
        .send()
        .await?;
    
    if response.status().is_success() {
        let session_response: ActiveSessionResponse = response.json().await?;
        Ok(session_response)
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        Err(anyhow::anyhow!("Failed to check active session: {} - {}", status, error_text))
    }
}

