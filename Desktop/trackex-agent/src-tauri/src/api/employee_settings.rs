//! Employee settings API client with caching
//!
//! Fetches employee settings from the backend and caches them locally
//! with automatic refresh. Used for screenshot settings and other preferences.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use std::sync::OnceLock;
use chrono::{DateTime, Utc};

use super::client::ApiClient;

/// Default screenshot interval in minutes if not set
pub const DEFAULT_SCREENSHOT_INTERVAL_MINUTES: i32 = 30;

/// Default idle threshold in seconds
pub const DEFAULT_IDLE_THRESHOLD_SECONDS: i32 = 120;

/// Cache refresh interval in seconds
const CACHE_REFRESH_INTERVAL_SECS: i64 = 300; // 5 minutes

/// Policy settings from the backend
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PolicySettings {
    /// Idle threshold in seconds
    pub idle_threshold_s: i32,
    /// Whether to count idle time as work
    pub count_idle_as_work: bool,
    /// Whether to redact window titles
    pub redact_titles: bool,
    /// Whether to store only domain for browser URLs (privacy mode)
    pub browser_domain_only: bool,
}

/// Employee screenshot settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmployeeSettings {
    pub auto_screenshots: bool,
    pub screenshot_interval: i32, // minutes
    pub timezone: Option<String>,
    pub policy: Option<PolicySettings>,
    pub fetched_at: DateTime<Utc>,
}

impl Default for EmployeeSettings {
    fn default() -> Self {
        Self {
            auto_screenshots: false,
            screenshot_interval: DEFAULT_SCREENSHOT_INTERVAL_MINUTES,
            timezone: None,
            policy: Some(PolicySettings {
                idle_threshold_s: DEFAULT_IDLE_THRESHOLD_SECONDS,
                count_idle_as_work: false,
                redact_titles: false,
                browser_domain_only: true, // Default to privacy-friendly mode
            }),
            fetched_at: Utc::now(),
        }
    }
}

/// Cached employee settings with thread-safe access
struct SettingsCache {
    settings: Option<EmployeeSettings>,
    last_fetch: Option<DateTime<Utc>>,
}

impl SettingsCache {
    fn new() -> Self {
        Self {
            settings: None,
            last_fetch: None,
        }
    }
    
    fn is_stale(&self) -> bool {
        match self.last_fetch {
            Some(last) => {
                let now: DateTime<Utc> = Utc::now();
                let duration = now.signed_duration_since(last);
                duration.num_seconds() > CACHE_REFRESH_INTERVAL_SECS
            }
            None => true,
        }
    }
}

// Global settings cache
static SETTINGS_CACHE: OnceLock<Arc<RwLock<SettingsCache>>> = OnceLock::new();

fn get_cache() -> &'static Arc<RwLock<SettingsCache>> {
    SETTINGS_CACHE.get_or_init(|| Arc::new(RwLock::new(SettingsCache::new())))
}

/// Fetch employee settings from the backend API
async fn fetch_from_api() -> Result<EmployeeSettings> {
    let client = ApiClient::new().await?;
    
    let response = client.get_with_auth("/api/agent/settings").await?;
    
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(anyhow::anyhow!(
            "Failed to fetch employee settings: {} - {}",
            status,
            body
        ));
    }
    
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct ApiPolicyResponse {
        #[serde(default = "default_idle_threshold")]
        idle_threshold_s: i32,
        #[serde(default)]
        count_idle_as_work: bool,
        #[serde(default)]
        redact_titles: bool,
        #[serde(default = "default_browser_domain_only")]
        browser_domain_only: bool,
    }
    
    fn default_idle_threshold() -> i32 { DEFAULT_IDLE_THRESHOLD_SECONDS }
    fn default_browser_domain_only() -> bool { true }
    
    #[derive(Deserialize)]
    struct ApiResponse {
        #[serde(rename = "autoScreenshots", default)]
        auto_screenshots: bool,
        #[serde(rename = "screenshotInterval")]
        screenshot_interval: Option<i32>,
        timezone: Option<String>,
        policy: Option<ApiPolicyResponse>,
    }
    
    let api_response: ApiResponse = response.json().await?;
    
    let policy = api_response.policy.map(|p| PolicySettings {
        idle_threshold_s: p.idle_threshold_s,
        count_idle_as_work: p.count_idle_as_work,
        redact_titles: p.redact_titles,
        browser_domain_only: p.browser_domain_only,
    });
    
    let settings = EmployeeSettings {
        auto_screenshots: api_response.auto_screenshots,
        screenshot_interval: api_response.screenshot_interval
            .unwrap_or(DEFAULT_SCREENSHOT_INTERVAL_MINUTES),
        timezone: api_response.timezone,
        policy,
        fetched_at: Utc::now(),
    };
    
    log::info!(
        "Fetched employee settings: auto_screenshots={}, interval={}min, browser_domain_only={}",
        settings.auto_screenshots,
        settings.screenshot_interval,
        settings.policy.as_ref().map(|p| p.browser_domain_only).unwrap_or(true)
    );
    
    Ok(settings)
}

/// Get employee settings, using cache if available and not stale
pub async fn get_employee_settings() -> Result<EmployeeSettings> {
    let cache = get_cache();
    
    // Check if we have valid cached settings
    {
        let cache_read = cache.read().await;
        if let Some(ref settings) = cache_read.settings {
            if !cache_read.is_stale() {
                return Ok(settings.clone());
            }
        }
    }
    
    // Fetch fresh settings
    match fetch_from_api().await {
        Ok(settings) => {
            // Update cache
            let mut cache_write = cache.write().await;
            cache_write.settings = Some(settings.clone());
            cache_write.last_fetch = Some(Utc::now());
            Ok(settings)
        }
        Err(e) => {
            // If fetch fails but we have cached settings, use them
            let cache_read = cache.read().await;
            if let Some(ref settings) = cache_read.settings {
                log::warn!(
                    "Failed to refresh settings, using cached values: {}",
                    e
                );
                return Ok(settings.clone());
            }
            
            // No cache available, return error
            Err(e)
        }
    }
}

/// Force refresh of employee settings
#[allow(dead_code)]
pub async fn refresh_settings() -> Result<EmployeeSettings> {
    let settings = fetch_from_api().await?;
    
    let cache = get_cache();
    let mut cache_write = cache.write().await;
    cache_write.settings = Some(settings.clone());
    cache_write.last_fetch = Some(Utc::now());
    
    Ok(settings)
}

/// Clear the settings cache (e.g., on logout)
#[allow(dead_code)]
pub async fn clear_cache() {
    let cache = get_cache();
    let mut cache_write = cache.write().await;
    cache_write.settings = None;
    cache_write.last_fetch = None;
    log::debug!("Employee settings cache cleared");
}

/// Check if auto screenshots are enabled for the current employee
#[allow(dead_code)]
pub async fn is_auto_screenshots_enabled() -> bool {
    match get_employee_settings().await {
        Ok(settings) => settings.auto_screenshots,
        Err(e) => {
            log::warn!("Failed to check auto screenshots setting: {}", e);
            false // Default to disabled on error
        }
    }
}

/// Get the screenshot interval in seconds
#[allow(dead_code)]
pub async fn get_screenshot_interval_secs() -> u64 {
    match get_employee_settings().await {
        Ok(settings) => {
            // Convert minutes to seconds, ensure minimum of 1 minute
            let minutes = settings.screenshot_interval.max(1);
            (minutes as u64) * 60
        }
        Err(e) => {
            log::warn!("Failed to get screenshot interval: {}", e);
            (DEFAULT_SCREENSHOT_INTERVAL_MINUTES as u64) * 60
        }
    }
}

/// Check if browser domain only mode is enabled (privacy mode for URLs)
/// When enabled, only domain names are stored instead of full URLs
#[allow(dead_code)]
pub async fn is_browser_domain_only() -> bool {
    match get_employee_settings().await {
        Ok(settings) => {
            settings.policy
                .map(|p| p.browser_domain_only)
                .unwrap_or(true) // Default to privacy-friendly mode
        }
        Err(e) => {
            log::warn!("Failed to check browser_domain_only setting: {}", e);
            true // Default to privacy-friendly mode on error
        }
    }
}

/// Get the policy settings, with defaults if not available
#[allow(dead_code)]
pub async fn get_policy_settings() -> PolicySettings {
    match get_employee_settings().await {
        Ok(settings) => {
            settings.policy.unwrap_or_default()
        }
        Err(e) => {
            log::warn!("Failed to get policy settings: {}", e);
            PolicySettings::default()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_default_settings() {
        let settings = EmployeeSettings::default();
        assert!(!settings.auto_screenshots);
        assert_eq!(settings.screenshot_interval, DEFAULT_SCREENSHOT_INTERVAL_MINUTES);
    }
}
