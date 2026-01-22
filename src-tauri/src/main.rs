// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod consent;
mod sampling;
mod screenshots;
mod storage;
mod api;
mod policy;
mod utils;
mod permissions;
mod update_manager;

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Manager, WindowEvent, RunEvent};
use tauri::menu::{MenuBuilder, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton};
use tokio::sync::Mutex;
use utils::logging;

use crate::commands::*;
use crate::storage::AppState;

/// Global flag to track if we're in the middle of a graceful shutdown
/// Prevents infinite loop when exit() triggers ExitRequested again
static SHUTDOWN_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

/// Force clock-out function that sends clock_out event to backend
/// Called on app shutdown to ensure employee is properly clocked out
async fn force_clock_out() {
    log::info!("Force clock-out: Checking if user is clocked in...");
    
    // Check if user is authenticated and clocked in
    if !crate::sampling::is_authenticated().await {
        log::info!("Force clock-out: User not authenticated, skipping");
        return;
    }
    
    if !crate::sampling::is_clocked_in().await {
        log::info!("Force clock-out: User not clocked in, skipping");
        return;
    }
    
    log::info!("Force clock-out: User is clocked in, sending clock_out event to backend...");
    
    // End local app usage session
    if let Err(e) = crate::storage::app_usage::end_current_session().await {
        log::warn!("Force clock-out: Failed to end current app session: {}", e);
    }
    
    // Stop background services
    crate::sampling::stop_services().await;
    crate::sampling::reset_idle_state();
    
    // End local work session
    if let Err(e) = crate::storage::work_session::end_session().await {
        log::warn!("Force clock-out: Failed to end local session: {}", e);
    }
    
    // Send clock_out event to backend
    match crate::api::client::ApiClient::new().await {
        Ok(client) => {
            let event_data = serde_json::json!({
                "events": [{
                    "type": "clock_out",
                    "timestamp": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
                    "data": {
                        "source": "desktop_agent_shutdown",
                        "reason": "app_quit"
                    }
                }]
            });
            
            match client.post_with_auth("/api/ingest/events", &event_data).await {
                Ok(response) => {
                    if response.status().is_success() {
                        log::info!("Force clock-out: Successfully sent clock_out event to backend");
                    } else {
                        log::warn!("Force clock-out: Backend returned error status: {}", response.status());
                    }
                }
                Err(e) => {
                    log::warn!("Force clock-out: Failed to send clock_out event: {}", e);
                    // Queue the event for later sync if network is unavailable
                    let _ = crate::storage::offline_queue::queue_event("clock_out", &event_data).await;
                }
            }
        }
        Err(e) => {
            log::warn!("Force clock-out: Failed to create API client: {}", e);
        }
    }
}

fn main() {
    // Initialize logging
    logging::init();
    
    // Setup Unix signal handlers for graceful shutdown on macOS/Linux
    // This catches Cmd+Q, Dock quit, and system shutdown signals
    #[cfg(unix)]
    {
        use signal_hook::consts::signal::*;
        use signal_hook::iterator::Signals;
        
        let signals = match Signals::new(&[SIGTERM, SIGINT, SIGHUP]) {
            Ok(s) => s,
            Err(e) => {
                log::error!("Failed to setup signal handlers: {}", e);
                // Continue without signal handlers - ExitRequested will still work
                return;
            }
        };
        
        std::thread::spawn(move || {
            for sig in signals.forever() {
                match sig {
                    SIGTERM | SIGINT | SIGHUP => {
                        log::info!("Received signal {} - initiating graceful shutdown", sig);
                        
                        // Prevent duplicate shutdowns
                        if SHUTDOWN_IN_PROGRESS.load(Ordering::SeqCst) {
                            log::info!("Shutdown already in progress, ignoring signal");
                            continue;
                        }
                        
                        SHUTDOWN_IN_PROGRESS.store(true, Ordering::SeqCst);
                        
                        // Force clock-out before exit
                        tauri::async_runtime::spawn(async move {
                            force_clock_out().await;
                            log::info!("Force clock-out complete from signal handler, exiting");
                            std::process::exit(0);
                        });
                        
                        // Give async task time to complete (max 5 seconds)
                        std::thread::sleep(std::time::Duration::from_secs(5));
                        log::warn!("Force clock-out timed out, exiting anyway");
                        std::process::exit(1);
                    }
                    _ => {}
                }
            }
        });
        
        log::info!("Unix signal handlers initialized (SIGTERM, SIGINT, SIGHUP)");
    }
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Arc::new(Mutex::new(AppState::new())))
        .invoke_handler(tauri::generate_handler![
            login,
            logout,
            get_auth_status,
            get_device_token,
            accept_consent,
            get_consent_status,
            clock_in,
            clock_out,
            get_work_session,
            get_recent_sessions,
            clear_local_database,
            trigger_sync,

            get_tracking_status,
            take_screenshot,
            get_current_app,
            send_diagnostics,
            get_permissions_status,
            request_permissions,
            trigger_screen_permission_dialog,
            get_app_info,
            send_app_focus_event,
            send_heartbeat,
            check_pending_jobs,
            get_idle_time,
            start_background_services,
            stop_background_services,
            pause_background_services,
            resume_background_services,
            get_background_service_state,
            get_app_usage_summary,
            get_usage_totals,
            get_current_app_session,
            get_detailed_idle_info,
            generate_today_report,
            generate_weekly_report,
            generate_monthly_summary,
            sync_app_rules,
            get_app_rules,
            get_rule_statistics,
            check_license_status,
            retry_license_check,
            get_app_version,
            // Auto-update commands
            update_manager::check_for_updates,
            update_manager::install_update,
            update_manager::get_current_version,
            update_manager::test_update_endpoint,
        ])
        .setup(|app| {
            // Set the global app state
            let app_state = app.state::<Arc<Mutex<AppState>>>();
            crate::storage::set_global_app_state(app_state.inner().clone());
            
            // Initialize the database directly
            let app_handle_for_bg = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Check for version migration BEFORE initializing database
                // This clears stale data if the app was updated
                match crate::storage::check_version_and_migrate().await {
                    Ok(true) => {
                        log::info!("Version migration completed - user will need to re-authenticate");
                    }
                    Ok(false) => {
                        log::info!("No version migration needed");
                    }
                    Err(e) => {
                        log::warn!("Version check failed (continuing anyway): {}", e);
                    }
                }
                
                if let Err(e) = crate::storage::database::init().await {
                    log::error!("Failed to initialize database: {}", e);
                } else {
                }
                
                if let Err(e) = crate::storage::app_usage::init_database().await {
                    log::error!("Failed to initialize app usage database: {}", e);
                } else {
                }
                
                if let Err(e) = crate::api::app_rules::initialize_app_rules().await {
                    log::error!("Failed to initialize app rules: {}", e);
                } else {
                }
                
                // Initialize power state monitoring
                crate::sampling::power_state::init();
                
                // Start background services
                crate::sampling::start_services().await;
                tokio::spawn(crate::sampling::start_queue_processing_service());
                
                // Start sync service for offline/online data synchronization
                tokio::spawn(crate::sampling::start_sync_service());
                
                // Start all sampling services - but only if user is authenticated AND clocked in
                // This prevents race conditions where services try to access empty global state
                tokio::spawn(async move {
                    // Wait for initial authentication check before starting services
                    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                    
                    // Check if user is already authenticated AND has an active work session
                    if crate::sampling::is_authenticated().await && crate::sampling::is_clocked_in().await {
                        log::info!("User is authenticated and clocked in, starting background services");
                        crate::sampling::start_all_background_services(app_handle_for_bg).await;
                    } else {
                        log::info!("User is not authenticated or not clocked in, services will start after clock-in");
                    }
                    // If not authenticated or not clocked in, services will be started after clock-in
                });
            });
            
            // Create system tray
            let quit_i = MenuItem::with_id(app, "quit", "Quit TrackEx", true, None::<&str>)?;
            let pause_i = MenuItem::with_id(app, "pause", "Pause Tracking", true, None::<&str>)?;
            let resume_i = MenuItem::with_id(app, "resume", "Resume Tracking", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show TrackEx", true, None::<&str>)?;
            let diagnostics_i = MenuItem::with_id(app, "diagnostics", "Send Diagnostics", true, None::<&str>)?;
            
            let menu = MenuBuilder::new(app)
                .item(&show_i)
                .separator()
                .item(&pause_i)
                .item(&resume_i)
                .separator()
                .item(&diagnostics_i)
                .separator()
                .item(&quit_i)
                .build()?;

            // Get tray icon from bundle icons or use embedded fallback
            let tray_icon = app.default_window_icon()
                .cloned()
                .or_else(|| {
                    log::warn!("Default window icon not available, using embedded icon");
                    // Load icon from embedded bytes as fallback
                    let icon_bytes = include_bytes!("../icons/icon.png");
                    image::load_from_memory(icon_bytes)
                        .ok()
                        .and_then(|img| {
                            let rgba = img.to_rgba8();
                            let (width, height) = rgba.dimensions();
                            Some(tauri::image::Image::new_owned(rgba.into_raw(), width, height))
                        })
                });

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("TrackEx Agent");

            if let Some(icon) = tray_icon {
                tray_builder = tray_builder.icon(icon);
            } else {
                log::error!("Failed to load tray icon");
            }

            let _tray = tray_builder
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "quit" => {
                        log::info!("Quit requested from tray menu");
                        
                        // Mark shutdown in progress to prevent ExitRequested handler from blocking
                        SHUTDOWN_IN_PROGRESS.store(true, Ordering::SeqCst);
                        
                        // Force clock-out before exiting
                        let _app_handle = app.clone();
                        tauri::async_runtime::spawn(async move {
                            force_clock_out().await;
                            log::info!("Force clock-out complete, exiting app");
                            // Use std::process::exit for immediate termination
                            std::process::exit(0);
                        });
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "pause" => {
                        println!("Pause tracking requested from tray");
                        // TODO: Implement pause logic
                    }
                    "resume" => {
                        println!("Resume tracking requested from tray");
                        // TODO: Implement resume logic
                    }
                    "diagnostics" => {
                        println!("Diagnostics requested from tray");
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, .. } = event {
                        if let Some(app) = tray.app_handle().get_webview_window("main") {
                            let _ = app.show();
                            let _ = app.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Show main window on startup
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.center();
                let _ = window.set_focus();
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Hide window instead of closing
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |_app_handle, event| {
            match event {
                RunEvent::ExitRequested { api, code, .. } => {
                    // If shutdown is already in progress, let the app exit immediately
                    if SHUTDOWN_IN_PROGRESS.load(Ordering::SeqCst) {
                        log::info!("Shutdown already in progress, allowing exit");
                        return; // Don't prevent exit
                    }
                    
                    #[cfg(target_os = "macos")]
                    log::info!("Exit requested on macOS (likely Cmd+Q, Dock quit, or system shutdown) with code: {:?}", code);
                    
                    #[cfg(not(target_os = "macos"))]
                    log::info!("Exit requested with code: {:?}", code);
                    
                    // Mark shutdown in progress
                    SHUTDOWN_IN_PROGRESS.store(true, Ordering::SeqCst);
                    // Prevent immediate exit to allow force clock-out
                    api.prevent_exit();
                    
                    tauri::async_runtime::spawn(async move {
                        force_clock_out().await;
                        log::info!("Force clock-out complete on exit request, now exiting");
                        std::process::exit(code.unwrap_or(0));
                    });
                }
                RunEvent::Exit => {
                    log::info!("App exiting - performing final cleanup");
                    // Synchronous cleanup - force clock-out should already be done
                    // This is a last resort for edge cases
                }
                _ => {}
            }
        });
}