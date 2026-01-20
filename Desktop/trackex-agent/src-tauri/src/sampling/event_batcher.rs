//! Event Batcher for Scalability
//!
//! Collects events locally and sends them in batches to reduce server load.
//! Instead of sending each app_focus event immediately (which could be every 2s),
//! we batch them and send every 10 seconds.
//!
//! SCALABILITY IMPACT:
//! - Without batching: 1000 agents × 30 events/min = 30,000 requests/min
//! - With batching: 1000 agents × 6 batches/min = 6,000 requests/min (5x reduction)
//!
//! The batch interval is 10 seconds to balance real-time updates with server efficiency.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{Duration, interval};

/// Maximum events to hold in memory before forcing a send
const MAX_BATCH_SIZE: usize = 50;

/// How often to send batched events (in seconds)
const BATCH_INTERVAL_SECONDS: u64 = 10;

/// A single event waiting to be batched
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchedEvent {
    pub event_type: String,
    pub timestamp: DateTime<Utc>,
    pub data: Value,
}

/// Global event batcher state
struct EventBatcherState {
    events: Vec<BatchedEvent>,
    last_flush: DateTime<Utc>,
}

impl EventBatcherState {
    fn new() -> Self {
        Self {
            events: Vec::new(),
            last_flush: Utc::now(),
        }
    }
}

lazy_static::lazy_static! {
    static ref BATCHER_STATE: Arc<Mutex<EventBatcherState>> = 
        Arc::new(Mutex::new(EventBatcherState::new()));
}

/// Add an event to the batch queue
/// 
/// Events are held in memory until either:
/// 1. The batch interval (10s) expires
/// 2. The batch size exceeds MAX_BATCH_SIZE
/// 3. A high-priority event (clock_in, clock_out) triggers immediate flush
pub async fn queue_event(event_type: &str, data: &Value) {
    let event = BatchedEvent {
        event_type: event_type.to_string(),
        timestamp: Utc::now(),
        data: data.clone(),
    };

    let mut state = BATCHER_STATE.lock().await;
    
    // Check if this is a high-priority event that should be sent immediately
    let is_high_priority = matches!(
        event_type,
        "clock_in" | "clock_out" | "idle_start" | "idle_end" | 
        "screenshot_taken" | "screenshot_failed"
    );

    if is_high_priority {
        // Add to batch and flush immediately
        state.events.push(event);
        drop(state); // Release lock before flushing
        flush_events().await;
        return;
    }

    // Add to batch
    state.events.push(event);

    // Check if we should force a flush due to batch size
    if state.events.len() >= MAX_BATCH_SIZE {
        log::info!("Event batch size limit reached ({}), flushing", MAX_BATCH_SIZE);
        drop(state); // Release lock before flushing
        flush_events().await;
    }
}

/// Flush all pending events to the server
/// 
/// Called either by the batch timer or when batch size is exceeded
pub async fn flush_events() {
    let events_to_send = {
        let mut state = BATCHER_STATE.lock().await;
        if state.events.is_empty() {
            return;
        }
        
        // Take all events and reset state
        let events = std::mem::take(&mut state.events);
        state.last_flush = Utc::now();
        events
    };

    let event_count = events_to_send.len();
    log::debug!("Flushing {} batched events to server", event_count);

    // Build the batch payload
    let batch_payload = serde_json::json!({
        "events": events_to_send.iter().map(|e| {
            serde_json::json!({
                "type": e.event_type,
                "timestamp": e.timestamp.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
                "data": e.data,
                "from": "event_batcher"
            })
        }).collect::<Vec<_>>()
    });

    // Try to send the batch
    match send_batch_to_server(&batch_payload).await {
        Ok(_) => {
            log::info!("✓ Sent batch of {} events successfully", event_count);
        }
        Err(e) => {
            log::warn!("Failed to send event batch, queuing for offline retry: {}", e);
            // Queue each event individually for offline processing
            for event in events_to_send {
                if let Err(queue_err) = crate::storage::offline_queue::queue_event(
                    &event.event_type, 
                    &event.data
                ).await {
                    log::error!("Failed to queue event for offline: {}", queue_err);
                }
            }
        }
    }
}

/// Send a batch of events to the server
async fn send_batch_to_server(payload: &Value) -> anyhow::Result<()> {
    let server_url = crate::storage::get_server_url().await?;
    let device_token = crate::storage::get_device_token().await?;
    
    if server_url.is_empty() || device_token.is_empty() {
        return Err(anyhow::anyhow!("Server URL or device token is empty"));
    }
    
    let client = reqwest::Client::builder()
        .user_agent(format!("TrackEx-Agent/{}", env!("CARGO_PKG_VERSION")))
        .build()?;
    
    let events_url = format!("{}/api/ingest/events", server_url.trim_end_matches('/'));
    
    let response = client
        .post(&events_url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", device_token))
        .json(payload)
        .send()
        .await?;
    
    if response.status().is_success() {
        Ok(())
    } else {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        Err(anyhow::anyhow!("Batch send failed with status {}: {}", status, text))
    }
}

/// Start the background batch flushing service
/// 
/// This runs continuously and flushes events every BATCH_INTERVAL_SECONDS
pub async fn start_batch_service() {
    let mut timer = interval(Duration::from_secs(BATCH_INTERVAL_SECONDS));
    
    log::info!("Event batcher service started (interval: {}s)", BATCH_INTERVAL_SECONDS);
    
    loop {
        timer.tick().await;
        
        // Only flush if services are running
        if !crate::sampling::should_services_run().await {
            if !crate::sampling::is_services_running().await {
                log::info!("Event batcher service stopping");
                // Flush any remaining events before stopping
                flush_events().await;
                break;
            }
            continue;
        }
        
        // Flush any pending events
        flush_events().await;
    }
    
    log::info!("Event batcher service stopped");
}

/// Get the current number of pending events
pub async fn pending_count() -> usize {
    let state = BATCHER_STATE.lock().await;
    state.events.len()
}

/// Clear all pending events without sending them
/// Used when logging out or in error scenarios
pub async fn clear_pending() {
    let mut state = BATCHER_STATE.lock().await;
    let count = state.events.len();
    state.events.clear();
    if count > 0 {
        log::warn!("Cleared {} pending events without sending", count);
    }
}

