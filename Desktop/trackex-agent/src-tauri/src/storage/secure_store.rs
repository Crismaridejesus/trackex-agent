use anyhow::Result;
use serde::{Deserialize, Serialize};

#[allow(dead_code)]
const SERVICE_NAME: &str = "com.trackex.agent";
#[allow(dead_code)]
const DEVICE_TOKEN_KEY: &str = "device_token";
#[allow(dead_code)]
const SESSION_DATA_KEY: &str = "session_data";
#[allow(dead_code)]
const APP_VERSION_KEY: &str = "app_version";
#[allow(dead_code)]
const SERVER_URL_KEY: &str = "server_url";

#[derive(Serialize, Deserialize, Clone)]
pub struct SessionData {
    pub device_token: String,
    pub email: String,
    pub device_id: String,
    pub server_url: String,
    pub employee_id: Option<String>,
}

pub async fn store_device_token(token: &str) -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        use keyring::Entry;
        
        // Use a consistent service and account name 
        let entry = Entry::new(SERVICE_NAME, DEVICE_TOKEN_KEY)?;
        
        // Store directly without checking existing - this reduces keychain prompts
        entry.set_password(token)?;
        log::info!("Stored device token in macOS Keychain");
    }
    
    #[cfg(target_os = "windows")]
    {
        use winapi::um::wincred::*;
        use std::ptr;
        
        unsafe {
            // Create wide string for target name (Windows W functions expect UTF-16)
            let target_name_str = format!("{}:{}", SERVICE_NAME, DEVICE_TOKEN_KEY);
            let wide_target: Vec<u16> = target_name_str.encode_utf16().chain(std::iter::once(0)).collect();
            let credential_blob = token.as_bytes();
            
            let mut credential = CREDENTIALW {
                Flags: 0,
                Type: CRED_TYPE_GENERIC,
                TargetName: wide_target.as_ptr() as *mut u16,
                Comment: ptr::null_mut(),
                LastWritten: winapi::shared::minwindef::FILETIME { dwLowDateTime: 0, dwHighDateTime: 0 },
                CredentialBlobSize: credential_blob.len() as u32,
                CredentialBlob: credential_blob.as_ptr() as *mut u8,
                Persist: CRED_PERSIST_LOCAL_MACHINE,
                AttributeCount: 0,
                Attributes: ptr::null_mut(),
                TargetAlias: ptr::null_mut(),
                UserName: ptr::null_mut(),
            };
            
            if CredWriteW(&mut credential, 0) != 0 {
                log::info!("Stored device token in Windows Credential Manager");
            } else {
                let error = winapi::um::errhandlingapi::GetLastError();
                log::error!("Failed to store device token in Windows Credential Manager, error: {}", error);
                return Err(anyhow::anyhow!("Failed to store device token, error: {}", error));
            }
        }
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        log::warn!("Secure storage not implemented for this platform");
    }
    
    Ok(())
}

#[allow(dead_code)]
pub async fn get_device_token() -> Result<Option<String>> {
    #[cfg(target_os = "macos")]
    {
        use keyring::Entry;
        let entry = Entry::new(SERVICE_NAME, DEVICE_TOKEN_KEY)?;
        match entry.get_password() {
            Ok(token) => {
                log::info!("Retrieved device token from macOS Keychain");
                return Ok(Some(token));
            }
            Err(keyring::Error::NoEntry) => {
                log::info!("No device token found in macOS Keychain");
                return Ok(None);
            }
            Err(e) => {
                log::error!("Failed to retrieve device token: {}", e);
                return Err(e.into());
            }
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        log::info!("Attempting to retrieve device token from Windows Credential Manager...");
        
        unsafe {
            use winapi::um::wincred::*;
            use std::slice;
            
            let target_name_str = format!("{}:{}", SERVICE_NAME, DEVICE_TOKEN_KEY);
            let wide_target: Vec<u16> = target_name_str.encode_utf16().chain(std::iter::once(0)).collect();
            
            let mut credential: *mut CREDENTIALW = std::ptr::null_mut();
            
            if CredReadW(wide_target.as_ptr(), CRED_TYPE_GENERIC, 0, &mut credential) != 0 {
                if !credential.is_null() {
                    let cred = &*credential;
                    
                    if cred.CredentialBlobSize > 0 && !cred.CredentialBlob.is_null() {
                        let blob = slice::from_raw_parts(
                            cred.CredentialBlob,
                            cred.CredentialBlobSize as usize
                        );
                        
                        if let Ok(token) = String::from_utf8(blob.to_vec()) {
                            log::info!("Retrieved device token from Windows Credential Manager");
                            CredFree(credential as *mut _);
                            return Ok(Some(token));
                        } else {
                            log::error!("Failed to decode device token as UTF-8");
                            CredFree(credential as *mut _);
                            return Err(anyhow::anyhow!("Invalid device token encoding"));
                        }
                    } else {
                        log::info!("Credential blob is empty");
                        CredFree(credential as *mut _);
                        return Ok(None);
                    }
                } else {
                    log::info!("No device token found in Windows Credential Manager");
                    return Ok(None);
                }
            } else {
                let error = winapi::um::errhandlingapi::GetLastError();
                // ERROR_NOT_FOUND = 1168
                if error == 1168 {
                    log::info!("No device token found in Windows Credential Manager");
                    return Ok(None);
                } else {
                    log::error!("Failed to read device token from Windows Credential Manager, error: {}", error);
                    return Err(anyhow::anyhow!("Failed to read device token, error: {}", error));
                }
            }
        }
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        log::warn!("Secure storage not implemented for this platform");
        Ok(None)
    }
}

pub async fn delete_device_token() -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        use keyring::Entry;
        let entry = Entry::new(SERVICE_NAME, DEVICE_TOKEN_KEY)?;
        match entry.delete_password() {
            Ok(_) => {
            }
            Err(keyring::Error::NoEntry) => {
            }
            Err(e) => {
                log::error!("Failed to delete device token: {}", e);
                return Err(e.into());
            }
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        log::warn!("Secure storage not implemented for this platform");
    }
    
    Ok(())
}

pub async fn store_session_data(_session: &SessionData) -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        use keyring::Entry;
        
        let entry = Entry::new(SERVICE_NAME, SESSION_DATA_KEY)?;
        let session_json = serde_json::to_string(_session)?;
        entry.set_password(&session_json)?;
        log::info!("Stored session data in macOS Keychain");
    }
    
    #[cfg(target_os = "windows")]
    {
        use std::ptr;
        
        let session_json = serde_json::to_string(_session)?;
        let credential_blob = session_json.as_bytes();
        
        // Windows Credential Manager has a size limit (~2560 bytes for CredentialBlob)
        // SessionData JSON should be well under this limit
        if credential_blob.len() > 2500 {
            log::warn!("Session data too large for Windows Credential Manager: {} bytes", credential_blob.len());
            return Err(anyhow::anyhow!("Session data too large for credential storage"));
        }
        
        unsafe {
            use winapi::um::wincred::*;
            
            // Create wide string for target name
            let target_name_str = format!("{}:{}", SERVICE_NAME, SESSION_DATA_KEY);
            let wide_target: Vec<u16> = target_name_str.encode_utf16().chain(std::iter::once(0)).collect();
            
            let mut credential = CREDENTIALW {
                Flags: 0,
                Type: CRED_TYPE_GENERIC,
                TargetName: wide_target.as_ptr() as *mut u16,
                Comment: ptr::null_mut(),
                LastWritten: winapi::shared::minwindef::FILETIME { dwLowDateTime: 0, dwHighDateTime: 0 },
                CredentialBlobSize: credential_blob.len() as u32,
                CredentialBlob: credential_blob.as_ptr() as *mut u8,
                Persist: CRED_PERSIST_LOCAL_MACHINE,
                AttributeCount: 0,
                Attributes: ptr::null_mut(),
                TargetAlias: ptr::null_mut(),
                UserName: ptr::null_mut(),
            };
            
            if CredWriteW(&mut credential, 0) != 0 {
                log::info!("Stored session data in Windows Credential Manager");
            } else {
                let error = winapi::um::errhandlingapi::GetLastError();
                log::error!("Failed to store session data in Windows Credential Manager, error code: {}", error);
                return Err(anyhow::anyhow!("Failed to store session data, error code: {}", error));
            }
        }
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        log::warn!("Secure storage not implemented for this platform");
    }
    
    Ok(())
}

pub async fn get_session_data() -> Result<Option<SessionData>> {
    #[cfg(target_os = "macos")]
    {
        use keyring::Entry;
        log::info!("Attempting to retrieve session data from keychain...");
        
        match Entry::new(SERVICE_NAME, SESSION_DATA_KEY) {
            Ok(entry) => {
                match entry.get_password() {
                    Ok(session_json) => {
                        log::info!("Session data retrieved from keychain");
                        match serde_json::from_str::<SessionData>(&session_json) {
                            Ok(session) => {
                                return Ok(Some(session));
                            }
                            Err(e) => {
                                log::error!("Failed to parse session data: {}", e);
                                return Err(e.into());
                            }
                        }
                    }
                    Err(keyring::Error::NoEntry) => {
                        log::info!("No session data found in keychain");
                        return Ok(None);
                    }
                    Err(e) => {
                        log::error!("Failed to retrieve session data from keychain: {}", e);
                        return Err(e.into());
                    }
                }
            }
            Err(e) => {
                log::error!("Failed to create keychain entry: {}", e);
                return Err(e.into());
            }
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        log::info!("Attempting to retrieve session data from Windows Credential Manager...");
        
        unsafe {
            use winapi::um::wincred::*;
            use std::slice;
            
            let target_name_str = format!("{}:{}", SERVICE_NAME, SESSION_DATA_KEY);
            let wide_target: Vec<u16> = target_name_str.encode_utf16().chain(std::iter::once(0)).collect();
            
            let mut credential: *mut CREDENTIALW = std::ptr::null_mut();
            
            if CredReadW(wide_target.as_ptr(), CRED_TYPE_GENERIC, 0, &mut credential) != 0 {
                if !credential.is_null() {
                    let cred = &*credential;
                    
                    if cred.CredentialBlobSize > 0 && !cred.CredentialBlob.is_null() {
                        let blob = slice::from_raw_parts(
                            cred.CredentialBlob,
                            cred.CredentialBlobSize as usize
                        );
                        
                        if let Ok(session_json) = String::from_utf8(blob.to_vec()) {
                            log::info!("Session data retrieved from Windows Credential Manager");
                            CredFree(credential as *mut _);
                            
                            match serde_json::from_str::<SessionData>(&session_json) {
                                Ok(session) => {
                                    return Ok(Some(session));
                                }
                                Err(e) => {
                                    log::error!("Failed to parse session data: {}", e);
                                    return Err(e.into());
                                }
                            }
                        } else {
                            log::error!("Failed to decode session data as UTF-8");
                            CredFree(credential as *mut _);
                            return Err(anyhow::anyhow!("Invalid session data encoding"));
                        }
                    } else {
                        log::info!("Credential blob is empty");
                        CredFree(credential as *mut _);
                        return Ok(None);
                    }
                } else {
                    log::info!("No session data found in Windows Credential Manager");
                    return Ok(None);
                }
            } else {
                let error = winapi::um::errhandlingapi::GetLastError();
                // ERROR_NOT_FOUND = 1168
                if error == 1168 {
                    log::info!("No session data found in Windows Credential Manager");
                    return Ok(None);
                } else {
                    log::error!("Failed to read session data from Windows Credential Manager, error code: {}", error);
                    return Err(anyhow::anyhow!("Failed to read credential, error code: {}", error));
                }
            }
        }
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        log::warn!("Secure storage not implemented for this platform");
        Ok(None)
    }
}

pub async fn delete_session_data() -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        use keyring::Entry;
        let entry = Entry::new(SERVICE_NAME, SESSION_DATA_KEY)?;
        match entry.delete_password() {
            Ok(_) => {
                log::info!("Deleted session data from macOS Keychain");
            }
            Err(keyring::Error::NoEntry) => {
                log::info!("No session data to delete from macOS Keychain");
            }
            Err(e) => {
                log::error!("Failed to delete session data: {}", e);
                return Err(e.into());
            }
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        unsafe {
            use winapi::um::wincred::*;
            
            let target_name_str = format!("{}:{}", SERVICE_NAME, SESSION_DATA_KEY);
            let wide_target: Vec<u16> = target_name_str.encode_utf16().chain(std::iter::once(0)).collect();
            
            if CredDeleteW(wide_target.as_ptr(), CRED_TYPE_GENERIC, 0) != 0 {
                log::info!("Deleted session data from Windows Credential Manager");
            } else {
                let error = winapi::um::errhandlingapi::GetLastError();
                // ERROR_NOT_FOUND = 1168 - credential doesn't exist, which is fine
                if error == 1168 {
                    log::info!("No session data to delete from Windows Credential Manager");
                } else {
                    log::error!("Failed to delete session data from Windows Credential Manager, error code: {}", error);
                    return Err(anyhow::anyhow!("Failed to delete credential, error code: {}", error));
                }
            }
        }
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        log::warn!("Secure storage not implemented for this platform");
    }
    
    Ok(())
}

#[allow(dead_code)]
pub async fn get_server_url() -> Result<Option<String>> {
    #[cfg(target_os = "macos")]
    {
        use keyring::Entry;
        let entry = Entry::new(SERVICE_NAME, "server_url")?;
        match entry.get_password() {
            Ok(url) => {
                return Ok(Some(url));
            }
            Err(_) => {
                return Ok(None);
            }
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        log::warn!("Secure storage not implemented for this platform");
        Ok(None)
    }
}

/// Store the current app version in secure storage for version migration detection
pub async fn store_app_version(version: &str) -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        use keyring::Entry;
        let entry = Entry::new(SERVICE_NAME, APP_VERSION_KEY)?;
        entry.set_password(version)?;
        log::info!("Stored app version in macOS Keychain: {}", version);
    }
    
    #[cfg(target_os = "windows")]
    {
        use winapi::um::wincred::*;
        use std::ptr;
        
        unsafe {
            // Create wide string for target name (Windows W functions expect UTF-16)
            let target_name_str = format!("{}:{}", SERVICE_NAME, APP_VERSION_KEY);
            let wide_target: Vec<u16> = target_name_str.encode_utf16().chain(std::iter::once(0)).collect();
            let credential_blob = version.as_bytes();
            
            let mut credential = CREDENTIALW {
                Flags: 0,
                Type: CRED_TYPE_GENERIC,
                TargetName: wide_target.as_ptr() as *mut u16,
                Comment: ptr::null_mut(),
                LastWritten: winapi::shared::minwindef::FILETIME { dwLowDateTime: 0, dwHighDateTime: 0 },
                CredentialBlobSize: credential_blob.len() as u32,
                CredentialBlob: credential_blob.as_ptr() as *mut u8,
                Persist: CRED_PERSIST_LOCAL_MACHINE,
                AttributeCount: 0,
                Attributes: ptr::null_mut(),
                TargetAlias: ptr::null_mut(),
                UserName: ptr::null_mut(),
            };
            
            if CredWriteW(&mut credential, 0) != 0 {
                log::info!("Stored app version in Windows Credential Manager: {}", version);
            } else {
                let error = winapi::um::errhandlingapi::GetLastError();
                log::error!("Failed to store app version in Windows Credential Manager, error: {}", error);
                return Err(anyhow::anyhow!("Failed to store app version, error: {}", error));
            }
        }
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        log::warn!("Secure storage not implemented for this platform");
    }
    
    Ok(())
}

/// Get the stored app version from secure storage
pub async fn get_stored_app_version() -> Result<Option<String>> {
    #[cfg(target_os = "macos")]
    {
        use keyring::Entry;
        match Entry::new(SERVICE_NAME, APP_VERSION_KEY) {
            Ok(entry) => {
                match entry.get_password() {
                    Ok(version) => {
                        log::info!("Retrieved stored app version from macOS Keychain: {}", version);
                        return Ok(Some(version));
                    }
                    Err(keyring::Error::NoEntry) => {
                        log::info!("No stored app version found in macOS Keychain");
                        return Ok(None);
                    }
                    Err(e) => {
                        log::error!("Failed to retrieve app version: {}", e);
                        return Err(e.into());
                    }
                }
            }
            Err(e) => {
                log::error!("Failed to create keychain entry for app version: {}", e);
                return Err(e.into());
            }
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        log::info!("Attempting to retrieve app version from Windows Credential Manager...");
        
        unsafe {
            use winapi::um::wincred::*;
            use std::slice;
            
            let target_name_str = format!("{}:{}", SERVICE_NAME, APP_VERSION_KEY);
            let wide_target: Vec<u16> = target_name_str.encode_utf16().chain(std::iter::once(0)).collect();
            
            let mut credential: *mut CREDENTIALW = std::ptr::null_mut();
            
            if CredReadW(wide_target.as_ptr(), CRED_TYPE_GENERIC, 0, &mut credential) != 0 {
                if !credential.is_null() {
                    let cred = &*credential;
                    
                    if cred.CredentialBlobSize > 0 && !cred.CredentialBlob.is_null() {
                        let blob = slice::from_raw_parts(
                            cred.CredentialBlob,
                            cred.CredentialBlobSize as usize
                        );
                        
                        if let Ok(version) = String::from_utf8(blob.to_vec()) {
                            log::info!("Retrieved stored app version from Windows Credential Manager: {}", version);
                            CredFree(credential as *mut _);
                            return Ok(Some(version));
                        } else {
                            log::error!("Failed to decode app version as UTF-8");
                            CredFree(credential as *mut _);
                            return Err(anyhow::anyhow!("Invalid app version encoding"));
                        }
                    } else {
                        log::info!("App version credential blob is empty");
                        CredFree(credential as *mut _);
                        return Ok(None);
                    }
                } else {
                    log::info!("No stored app version found in Windows Credential Manager");
                    return Ok(None);
                }
            } else {
                let error = winapi::um::errhandlingapi::GetLastError();
                // ERROR_NOT_FOUND = 1168
                if error == 1168 {
                    log::info!("No stored app version found in Windows Credential Manager");
                    return Ok(None);
                } else {
                    log::error!("Failed to read app version from Windows Credential Manager, error: {}", error);
                    return Err(anyhow::anyhow!("Failed to read app version, error: {}", error));
                }
            }
        }
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        log::warn!("Secure storage not implemented for this platform");
        Ok(None)
    }
}

/// Clear all stored credentials (device token, session data, server URL, app version)
/// Used when version migration requires a clean slate
pub async fn clear_all_credentials() -> Result<()> {
    log::info!("Clearing all stored credentials for version migration...");
    
    #[cfg(target_os = "macos")]
    {
        use keyring::Entry;
        
        // Delete device token
        if let Ok(entry) = Entry::new(SERVICE_NAME, DEVICE_TOKEN_KEY) {
            match entry.delete_password() {
                Ok(_) => log::info!("Deleted device_token from keychain"),
                Err(keyring::Error::NoEntry) => log::info!("No device_token to delete"),
                Err(e) => log::warn!("Failed to delete device_token: {}", e),
            }
        }
        
        // Delete session data
        if let Ok(entry) = Entry::new(SERVICE_NAME, SESSION_DATA_KEY) {
            match entry.delete_password() {
                Ok(_) => log::info!("Deleted session_data from keychain"),
                Err(keyring::Error::NoEntry) => log::info!("No session_data to delete"),
                Err(e) => log::warn!("Failed to delete session_data: {}", e),
            }
        }
        
        // Delete server URL
        if let Ok(entry) = Entry::new(SERVICE_NAME, SERVER_URL_KEY) {
            match entry.delete_password() {
                Ok(_) => log::info!("Deleted server_url from keychain"),
                Err(keyring::Error::NoEntry) => log::info!("No server_url to delete"),
                Err(e) => log::warn!("Failed to delete server_url: {}", e),
            }
        }
        
        // Delete app version (will be re-stored with new version)
        if let Ok(entry) = Entry::new(SERVICE_NAME, APP_VERSION_KEY) {
            match entry.delete_password() {
                Ok(_) => log::info!("Deleted app_version from keychain"),
                Err(keyring::Error::NoEntry) => log::info!("No app_version to delete"),
                Err(e) => log::warn!("Failed to delete app_version: {}", e),
            }
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        use winapi::um::wincred::*;
        use std::ffi::CString;
        
        let keys = [DEVICE_TOKEN_KEY, SESSION_DATA_KEY, SERVER_URL_KEY, APP_VERSION_KEY];
        
        for key in keys.iter() {
            unsafe {
                let target_name = match CString::new(format!("{}:{}", SERVICE_NAME, key)) {
                    Ok(name) => name,
                    Err(_) => continue,
                };
                
                // Convert to wide string for CredDeleteW
                let wide: Vec<u16> = target_name.to_string_lossy()
                    .encode_utf16()
                    .chain(std::iter::once(0))
                    .collect();
                
                if CredDeleteW(wide.as_ptr(), CRED_TYPE_GENERIC, 0) != 0 {
                    log::info!("Deleted {} from Windows Credential Manager", key);
                } else {
                    log::info!("No {} to delete or deletion failed", key);
                }
            }
        }
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        log::warn!("Secure storage not implemented for this platform");
    }
    
    log::info!("All credentials cleared");
    Ok(())
}