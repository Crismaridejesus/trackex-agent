use anyhow::Result;
use rusqlite::Connection;
use std::path::PathBuf;

fn get_db_path() -> Result<PathBuf> {
    let mut path = dirs::data_dir().ok_or_else(|| anyhow::anyhow!("Failed to get data directory"))?;
    path.push("TrackEx");
    
    // Create directory with better error handling
    if let Err(e) = std::fs::create_dir_all(&path) {
        log::error!("Failed to create TrackEx data directory at {:?}: {}", path, e);
        return Err(anyhow::anyhow!("Failed to create data directory: {}", e));
    }
    
    path.push("agent.db");
    log::info!("Database path: {:?}", path);
    Ok(path)
}

pub async fn init() -> Result<()> {
    log::info!("Initializing database...");
    let db_path = get_db_path()?;
    log::info!("Opening database connection at {:?}", db_path);
    let conn = Connection::open(&db_path)?;
    log::info!("Database connection opened successfully");
    
    // Create tables
    log::info!("Creating database tables...");
    conn.execute(
        "CREATE TABLE IF NOT EXISTS consent (
            id INTEGER PRIMARY KEY,
            accepted BOOLEAN NOT NULL DEFAULT 0,
            version TEXT NOT NULL,
            accepted_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS event_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            event_data TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            processed BOOLEAN NOT NULL DEFAULT 0,
            retry_count INTEGER NOT NULL DEFAULT 0,
            max_retries INTEGER NOT NULL DEFAULT 3,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

            conn.execute(
                "CREATE TABLE IF NOT EXISTS heartbeat_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    heartbeat_data TEXT NOT NULL,
                    timestamp DATETIME NOT NULL,
                    processed BOOLEAN NOT NULL DEFAULT 0,
                    retry_count INTEGER NOT NULL DEFAULT 0,
                    max_retries INTEGER NOT NULL DEFAULT 3,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )",
                [],
            )?;

            conn.execute(
                "CREATE TABLE IF NOT EXISTS app_usage_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    app_name TEXT NOT NULL,
                    app_id TEXT NOT NULL,
                    window_title TEXT,
                    category TEXT NOT NULL,
                    start_time DATETIME NOT NULL,
                    end_time DATETIME,
                    duration_seconds INTEGER NOT NULL DEFAULT 0,
                    is_idle BOOLEAN NOT NULL DEFAULT 0,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    synced BOOLEAN NOT NULL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )",
                [],
            )?;

            // Migration: Recreate app_usage_sessions table with correct schema
            // This ensures the table has the right structure for the app usage tracker
            let table_exists = conn.query_row(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='app_usage_sessions'",
                [],
                |row| Ok(row.get::<_, String>(0)?)
            ).is_ok();

            if table_exists {
                
                // Drop existing table (data will be lost, but this is for development)
                conn.execute("DROP TABLE app_usage_sessions", [])?;
                
                // Recreate with correct schema including synced column
                conn.execute(
                    "CREATE TABLE app_usage_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        app_name TEXT NOT NULL,
                        app_id TEXT NOT NULL,
                        window_title TEXT,
                        category TEXT NOT NULL,
                        start_time DATETIME NOT NULL,
                        end_time DATETIME,
                        duration_seconds INTEGER NOT NULL DEFAULT 0,
                        is_idle BOOLEAN NOT NULL DEFAULT 0,
                        is_active BOOLEAN NOT NULL DEFAULT 1,
                        synced BOOLEAN NOT NULL DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )",
                    [],
                )?;
                
            }

            conn.execute(
                "CREATE TABLE IF NOT EXISTS work_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    started_at DATETIME NOT NULL,
                    ended_at DATETIME,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )",
                [],
            )?;

            // Session cache table for backup session persistence
            // This stores session metadata (not tokens) as fallback when secure storage fails
            conn.execute(
                "CREATE TABLE IF NOT EXISTS session_cache (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    email TEXT NOT NULL,
                    device_id TEXT NOT NULL,
                    server_url TEXT NOT NULL,
                    employee_id TEXT,
                    last_validated_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )",
                [],
            )?;

    log::info!("Database initialized successfully");
    Ok(())
}

pub fn get_connection() -> Result<Connection> {
    let db_path = get_db_path()?;
    let conn = Connection::open(&db_path)?;
    Ok(conn)
}

/// Session cache entry for backup persistence
#[derive(Debug, Clone)]
pub struct SessionCacheEntry {
    pub email: String,
    pub device_id: String,
    pub server_url: String,
    pub employee_id: Option<String>,
    pub last_validated_at: Option<String>,
}

/// Store session metadata in SQLite as backup
/// This does NOT store the device token - only non-sensitive metadata
pub fn store_session_cache(entry: &SessionCacheEntry) -> Result<()> {
    let conn = get_connection()?;
    
    // Use REPLACE to insert or update the single row (id=1)
    conn.execute(
        "INSERT OR REPLACE INTO session_cache (id, email, device_id, server_url, employee_id, last_validated_at, updated_at) 
         VALUES (1, ?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)",
        rusqlite::params![
            entry.email,
            entry.device_id,
            entry.server_url,
            entry.employee_id,
            entry.last_validated_at,
        ],
    )?;
    
    log::info!("Stored session cache in SQLite for {}", entry.email);
    Ok(())
}

/// Retrieve session metadata from SQLite backup
pub fn get_session_cache() -> Result<Option<SessionCacheEntry>> {
    let conn = get_connection()?;
    
    let mut stmt = conn.prepare(
        "SELECT email, device_id, server_url, employee_id, last_validated_at FROM session_cache WHERE id = 1"
    )?;
    
    let result = stmt.query_row([], |row| {
        Ok(SessionCacheEntry {
            email: row.get(0)?,
            device_id: row.get(1)?,
            server_url: row.get(2)?,
            employee_id: row.get(3)?,
            last_validated_at: row.get(4)?,
        })
    });
    
    match result {
        Ok(entry) => {
            log::info!("Retrieved session cache from SQLite for {}", entry.email);
            Ok(Some(entry))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            log::info!("No session cache found in SQLite");
            Ok(None)
        }
        Err(e) => {
            log::error!("Error retrieving session cache: {}", e);
            Err(e.into())
        }
    }
}

/// Clear session cache from SQLite
pub fn clear_session_cache() -> Result<()> {
    let conn = get_connection()?;
    conn.execute("DELETE FROM session_cache", [])?;
    log::info!("Cleared session cache from SQLite");
    Ok(())
}

/// Update the last validated timestamp for the session cache
pub fn update_session_cache_validation() -> Result<()> {
    let conn = get_connection()?;
    conn.execute(
        "UPDATE session_cache SET last_validated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
        [],
    )?;
    log::info!("Updated session cache validation timestamp");
    Ok(())
}

/// Get or create a stable device UUID
/// This UUID is generated once and persisted in SQLite to uniquely identify this device installation
/// Used to prevent duplicate device records on the backend when registering
pub fn get_or_create_device_uuid() -> Result<String> {
    let conn = get_connection()?;
    
    // Ensure the device_info table exists
    conn.execute(
        "CREATE TABLE IF NOT EXISTS device_info (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            device_uuid TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    
    // Try to get existing UUID
    let existing_uuid: Result<String, rusqlite::Error> = conn.query_row(
        "SELECT device_uuid FROM device_info WHERE id = 1",
        [],
        |row| row.get(0),
    );
    
    match existing_uuid {
        Ok(uuid) => {
            log::info!("Using existing device UUID: {}", uuid);
            Ok(uuid)
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            // Generate a new UUID
            let new_uuid = uuid::Uuid::new_v4().to_string();
            
            conn.execute(
                "INSERT INTO device_info (id, device_uuid) VALUES (1, ?1)",
                rusqlite::params![new_uuid],
            )?;
            
            log::info!("Generated new device UUID: {}", new_uuid);
            Ok(new_uuid)
        }
        Err(e) => {
            log::error!("Error retrieving device UUID: {}", e);
            Err(e.into())
        }
    }
}

/// Get the stored device UUID (returns None if not yet created)
#[allow(dead_code)]
pub fn get_device_uuid() -> Result<Option<String>> {
    let conn = get_connection()?;
    
    // Check if table exists first
    let table_exists: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='device_info'",
        [],
        |row| row.get(0),
    ).unwrap_or(false);
    
    if !table_exists {
        return Ok(None);
    }
    
    let result: Result<String, rusqlite::Error> = conn.query_row(
        "SELECT device_uuid FROM device_info WHERE id = 1",
        [],
        |row| row.get(0),
    );
    
    match result {
        Ok(uuid) => Ok(Some(uuid)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}