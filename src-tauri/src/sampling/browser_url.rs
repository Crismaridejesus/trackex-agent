//! Browser URL extraction module
//!
//! Extracts the current URL/domain from browser windows.
//! Uses Windows UI Automation API for reliable URL extraction directly from the address bar.
//! Falls back to window title parsing on macOS or when UI Automation fails.

use crate::utils::privacy::{is_browser_app, is_browser_by_name, extract_domain_from_window_title};

/// Windows UI Automation module for reading browser address bar
#[cfg(target_os = "windows")]
mod uia {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::Com::{
        CoInitializeEx, CoCreateInstance, CLSCTX_INPROC_SERVER, COINIT_MULTITHREADED,
    };
    use windows::Win32::UI::Accessibility::{
        IUIAutomation, IUIAutomationElement,
        IValueProvider, CUIAutomation, TreeScope_Descendants, TreeScope_Children,
        UIA_EditControlTypeId, UIA_ControlTypePropertyId, UIA_ValuePatternId,
        UIA_ToolBarControlTypeId, UIA_ComboBoxControlTypeId, UIA_DocumentControlTypeId,
    };
    use windows::core::{Interface, BSTR};
    use windows::Win32::System::Variant::VARIANT;

    /// Extract URL from browser window using Windows UI Automation API.
    /// Uses multiple strategies to find the address bar URL reliably.
    pub fn get_browser_url(hwnd: isize) -> Option<String> {
        unsafe {
            // Initialize COM (may already be initialized, that's OK)
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
            
            // Create UI Automation instance
            let automation: IUIAutomation = match CoCreateInstance(
                &CUIAutomation,
                None,
                CLSCTX_INPROC_SERVER
            ) {
                Ok(a) => a,
                Err(e) => {
                    log::warn!("[UIA] Failed to create UIAutomation: {:?}", e);
                    return None;
                }
            };
            
            // Get element from HWND
            let hwnd = HWND(hwnd as *mut _);
            let element = match automation.ElementFromHandle(hwnd) {
                Ok(e) => e,
                Err(e) => {
                    log::warn!("[UIA] Failed to get element from HWND: {:?}", e);
                    return None;
                }
            };
            
            // Log window info for debugging
            if let Ok(name) = element.CurrentName() {
                log::info!("[UIA] Searching for URL in window: {}", name.to_string());
            }
            
            // Strategy 1: Search by known AutomationIds (fastest, most reliable)
            log::debug!("[UIA] Strategy 1: Searching by AutomationId...");
            if let Some(url) = find_by_automation_id(&automation, &element) {
                log::info!("[UIA] Found URL via AutomationId strategy: {}", url);
                return Some(url);
            }
            
            // Strategy 2: Search by Name containing "address"
            log::debug!("[UIA] Strategy 2: Searching by Name property...");
            if let Some(url) = find_by_name(&automation, &element) {
                log::info!("[UIA] Found URL via Name strategy: {}", url);
                return Some(url);
            }
            
            // Strategy 3: Find ToolBar then search Edit controls inside
            log::debug!("[UIA] Strategy 3: Searching inside ToolBar...");
            if let Some(url) = find_via_toolbar(&automation, &element) {
                log::info!("[UIA] Found URL via ToolBar strategy: {}", url);
                return Some(url);
            }
            
            // Strategy 4: Find ALL Edit controls and check for URL values
            log::debug!("[UIA] Strategy 4: Searching all Edit controls...");
            if let Some(url) = find_in_all_edit_controls(&automation, &element) {
                log::info!("[UIA] Found URL via Edit control scan: {}", url);
                return Some(url);
            }
            
            // Strategy 5: Search ComboBox controls (some browsers use ComboBox for address bar)
            log::debug!("[UIA] Strategy 5: Searching ComboBox controls...");
            if let Some(url) = find_in_combobox_controls(&automation, &element) {
                log::info!("[UIA] Found URL via ComboBox strategy: {}", url);
                return Some(url);
            }
            
            // Strategy 6: Search Document controls (for browser address displayed as document)
            log::debug!("[UIA] Strategy 6: Searching Document controls...");
            if let Some(url) = find_in_document_controls(&automation, &element) {
                log::info!("[UIA] Found URL via Document strategy: {}", url);
                return Some(url);
            }
            
            log::warn!("[UIA] All strategies failed to find URL");
            None
        }
    }

    /// Strategy 1: Search for elements with known AutomationIds
    unsafe fn find_by_automation_id(
        automation: &IUIAutomation,
        element: &IUIAutomationElement
    ) -> Option<String> {
        // Known AutomationIds for browser address bars
        let known_ids = [
            "addressEditBox",      // Microsoft Edge
            "urlbar-input",        // Firefox
            "view_id_omnibox_text", // Some Chrome versions
            "omnibox",             // Chrome/Chromium
            "address",             // Generic
            "AddressEdit",         // Old IE style
        ];
        
        // Get all elements using TrueCondition
        let true_condition = match automation.CreateTrueCondition() {
            Ok(c) => c,
            Err(_) => return None,
        };
        
        let all_elements = match element.FindAll(TreeScope_Descendants, &true_condition) {
            Ok(e) => e,
            Err(_) => return None,
        };
        
        let count = all_elements.Length().unwrap_or(0);
        log::debug!("[UIA] Scanning {} elements for known AutomationIds", count);
        
        for i in 0..count {
            if let Ok(elem) = all_elements.GetElement(i) {
                if let Ok(auto_id) = elem.CurrentAutomationId() {
                    let id_str = auto_id.to_string();
                    for known_id in &known_ids {
                        if id_str.eq_ignore_ascii_case(known_id) || id_str.to_lowercase().contains(&known_id.to_lowercase()) {
                            log::debug!("[UIA] Found element with AutomationId: {}", id_str);
                            if let Some(url) = get_element_value(&elem) {
                                if looks_like_url(&url) {
                                    return Some(url);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        None
    }

    /// Strategy 2: Search for elements with Name containing address-related keywords
    unsafe fn find_by_name(
        automation: &IUIAutomation,
        element: &IUIAutomationElement
    ) -> Option<String> {
        let name_keywords = [
            "address and search bar",
            "address bar",
            "search or enter address",
            "enter address",
            "type a url",
            "search bar",
        ];
        
        let true_condition = match automation.CreateTrueCondition() {
            Ok(c) => c,
            Err(_) => return None,
        };
        
        let all_elements = match element.FindAll(TreeScope_Descendants, &true_condition) {
            Ok(e) => e,
            Err(_) => return None,
        };
        
        let count = all_elements.Length().unwrap_or(0);
        
        for i in 0..count {
            if let Ok(elem) = all_elements.GetElement(i) {
                if let Ok(name) = elem.CurrentName() {
                    let name_str = name.to_string().to_lowercase();
                    for keyword in &name_keywords {
                        if name_str.contains(keyword) {
                            log::debug!("[UIA] Found element with Name: {}", name_str);
                            if let Some(url) = get_element_value(&elem) {
                                if looks_like_url(&url) {
                                    return Some(url);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        None
    }

    /// Strategy 3: Find ToolBar element, then search for Edit controls inside
    unsafe fn find_via_toolbar(
        automation: &IUIAutomation,
        element: &IUIAutomationElement
    ) -> Option<String> {
        // First find ToolBar controls
        let toolbar_type = VARIANT::from(UIA_ToolBarControlTypeId.0 as i32);
        let toolbar_condition = match automation.CreatePropertyCondition(
            UIA_ControlTypePropertyId,
            &toolbar_type
        ) {
            Ok(c) => c,
            Err(_) => return None,
        };
        
        let toolbars = match element.FindAll(TreeScope_Descendants, &toolbar_condition) {
            Ok(e) => e,
            Err(_) => return None,
        };
        
        let toolbar_count = toolbars.Length().unwrap_or(0);
        log::debug!("[UIA] Found {} ToolBar controls", toolbar_count);
        
        for i in 0..toolbar_count {
            if let Ok(toolbar) = toolbars.GetElement(i) {
                // Search for Edit controls inside this toolbar
                let edit_type = VARIANT::from(UIA_EditControlTypeId.0 as i32);
                let edit_condition = match automation.CreatePropertyCondition(
                    UIA_ControlTypePropertyId,
                    &edit_type
                ) {
                    Ok(c) => c,
                    Err(_) => continue,
                };
                
                if let Ok(edits) = toolbar.FindAll(TreeScope_Descendants, &edit_condition) {
                    let edit_count = edits.Length().unwrap_or(0);
                    for j in 0..edit_count {
                        if let Ok(edit) = edits.GetElement(j) {
                            if let Some(value) = get_element_value(&edit) {
                                if looks_like_url(&value) {
                                    log::debug!("[UIA] Found URL in ToolBar Edit control");
                                    return Some(value);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        None
    }

    /// Strategy 4: Find all Edit controls and return first URL-like value
    unsafe fn find_in_all_edit_controls(
        automation: &IUIAutomation,
        element: &IUIAutomationElement
    ) -> Option<String> {
        let edit_type = VARIANT::from(UIA_EditControlTypeId.0 as i32);
        let condition = match automation.CreatePropertyCondition(
            UIA_ControlTypePropertyId,
            &edit_type
        ) {
            Ok(c) => c,
            Err(_) => return None,
        };
        
        let edit_elements = match element.FindAll(TreeScope_Descendants, &condition) {
            Ok(e) => e,
            Err(_) => return None,
        };
        
        let count = edit_elements.Length().unwrap_or(0);
        log::debug!("[UIA] Found {} total Edit controls", count);
        
        // Log all Edit controls for debugging
        let mut found_urls: Vec<String> = Vec::new();
        for i in 0..count {
            if let Ok(edit) = edit_elements.GetElement(i) {
                let auto_id = edit.CurrentAutomationId().map(|s| s.to_string()).unwrap_or_default();
                let name = edit.CurrentName().map(|s| s.to_string()).unwrap_or_default();
                
                if let Some(value) = get_element_value(&edit) {
                    log::debug!("[UIA] Edit[{}] AutomationId='{}' Name='{}' Value='{}'", i, auto_id, name, &value[..value.len().min(80)]);
                    if looks_like_url(&value) {
                        found_urls.push(value);
                    }
                } else {
                    log::debug!("[UIA] Edit[{}] AutomationId='{}' Name='{}' (no value)", i, auto_id, name);
                }
            }
        }
        
        // Return the first URL found (typically the address bar is first)
        if !found_urls.is_empty() {
            log::debug!("[UIA] Found {} URL-like values in Edit controls", found_urls.len());
            return Some(found_urls.remove(0));
        }
        
        None
    }

    /// Strategy 5: Search ComboBox controls (some browsers use ComboBox for address bar)
    unsafe fn find_in_combobox_controls(
        automation: &IUIAutomation,
        element: &IUIAutomationElement
    ) -> Option<String> {
        let combobox_type = VARIANT::from(UIA_ComboBoxControlTypeId.0 as i32);
        let condition = match automation.CreatePropertyCondition(
            UIA_ControlTypePropertyId,
            &combobox_type
        ) {
            Ok(c) => c,
            Err(_) => return None,
        };
        
        let elements = match element.FindAll(TreeScope_Descendants, &condition) {
            Ok(e) => e,
            Err(_) => return None,
        };
        
        let count = elements.Length().unwrap_or(0);
        log::debug!("[UIA] Found {} ComboBox controls", count);
        
        for i in 0..count {
            if let Ok(elem) = elements.GetElement(i) {
                // Check the ComboBox value directly
                if let Some(value) = get_element_value(&elem) {
                    if looks_like_url(&value) {
                        return Some(value);
                    }
                }
                
                // Also check Edit children of ComboBox
                let edit_type = VARIANT::from(UIA_EditControlTypeId.0 as i32);
                if let Ok(edit_condition) = automation.CreatePropertyCondition(
                    UIA_ControlTypePropertyId,
                    &edit_type
                ) {
                    if let Ok(edits) = elem.FindAll(TreeScope_Children, &edit_condition) {
                        let edit_count = edits.Length().unwrap_or(0);
                        for j in 0..edit_count {
                            if let Ok(edit) = edits.GetElement(j) {
                                if let Some(value) = get_element_value(&edit) {
                                    if looks_like_url(&value) {
                                        return Some(value);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        None
    }

    /// Strategy 6: Search Document controls (some browsers expose URL in document control)
    unsafe fn find_in_document_controls(
        automation: &IUIAutomation,
        element: &IUIAutomationElement
    ) -> Option<String> {
        let doc_type = VARIANT::from(UIA_DocumentControlTypeId.0 as i32);
        let condition = match automation.CreatePropertyCondition(
            UIA_ControlTypePropertyId,
            &doc_type
        ) {
            Ok(c) => c,
            Err(_) => return None,
        };
        
        let elements = match element.FindAll(TreeScope_Descendants, &condition) {
            Ok(e) => e,
            Err(_) => return None,
        };
        
        let count = elements.Length().unwrap_or(0);
        log::debug!("[UIA] Found {} Document controls", count);
        
        for i in 0..count {
            if let Ok(elem) = elements.GetElement(i) {
                if let Some(value) = get_element_value(&elem) {
                    if looks_like_url(&value) {
                        return Some(value);
                    }
                }
            }
        }
        
        None
    }

    /// Get text value from an element using ValuePattern
    unsafe fn get_element_value(element: &IUIAutomationElement) -> Option<String> {
        // Try to get ValuePattern
        let pattern = match element.GetCurrentPattern(UIA_ValuePatternId) {
            Ok(p) => p,
            Err(_) => return None,
        };
        
        let value_provider: IValueProvider = match pattern.cast() {
            Ok(v) => v,
            Err(_) => return None,
        };
        
        let value: BSTR = match value_provider.Value() {
            Ok(v) => v,
            Err(_) => return None,
        };
        
        let result = value.to_string();
        if !result.is_empty() {
            Some(result)
        } else {
            None
        }
    }

    /// Check if text looks like a URL - comprehensive check
    fn looks_like_url(text: &str) -> bool {
        let trimmed = text.trim();
        
        // Must have reasonable length
        if trimmed.len() < 4 || trimmed.len() > 2048 {
            return false;
        }
        
        // Reject common non-URL patterns
        if trimmed.contains('@') && !trimmed.starts_with("http") {
            return false; // Likely an email
        }
        if trimmed.starts_with('/') || trimmed.starts_with('\\') {
            return false; // File path
        }
        
        // Check for URL schemes (explicit URLs)
        if trimmed.starts_with("http://") 
            || trimmed.starts_with("https://")
            || trimmed.starts_with("file://")
            || trimmed.starts_with("chrome://")
            || trimmed.starts_with("chrome-extension://")
            || trimmed.starts_with("edge://")
            || trimmed.starts_with("about:")
            || trimmed.starts_with("brave://")
            || trimmed.starts_with("firefox://")
            || trimmed.starts_with("opera://")
            || trimmed.starts_with("vivaldi://") {
            return true;
        }
        
        // Check for domain-like pattern (contains dot, no spaces, has TLD-like ending)
        if trimmed.contains('.') && !trimmed.contains(' ') {
            // Additional validation: should look like a domain
            let parts: Vec<&str> = trimmed.split('/').collect();
            if let Some(domain_part) = parts.first() {
                // Domain should have at least one dot and valid characters
                if domain_part.contains('.') 
                    && domain_part.chars().all(|c| c.is_alphanumeric() || c == '.' || c == '-' || c == ':') {
                    return true;
                }
            }
        }
        
        false
    }
}

/// Result of URL extraction from a browser
#[derive(Debug, Clone)]
pub struct BrowserUrlInfo {
    /// The full URL if available
    pub url: Option<String>,
    /// The domain extracted from the browser
    pub domain: Option<String>,
}

impl BrowserUrlInfo {
    pub fn empty() -> Self {
        Self {
            url: None,
            domain: None,
        }
    }
    
    pub fn from_domain(domain: String) -> Self {
        Self {
            url: None,
            domain: Some(domain),
        }
    }
    
    pub fn from_url(url: String) -> Self {
        let domain = extract_domain_from_url(&url);
        Self {
            url: Some(url),
            domain,
        }
    }
}

/// Extract domain from a full URL
/// e.g., "https://subdomain.example.com:8080/path?query" -> "subdomain.example.com"
fn extract_domain_from_url(url: &str) -> Option<String> {
    let url = url.trim();
    
    // Find the scheme separator
    let after_scheme = if let Some(idx) = url.find("://") {
        &url[idx + 3..]
    } else {
        url
    };
    
    // Find the end of the domain (before path, query, or port)
    let domain_end = after_scheme
        .find('/')
        .or_else(|| after_scheme.find('?'))
        .or_else(|| after_scheme.find('#'))
        .unwrap_or(after_scheme.len());
    
    let domain_with_port = &after_scheme[..domain_end];
    
    // Remove port if present
    let domain = domain_with_port
        .split(':')
        .next()
        .unwrap_or(domain_with_port);
    
    // Allow localhost and domains with dots
    if domain.is_empty() || (!domain.contains('.') && domain != "localhost") {
        return None;
    }
    
    Some(domain.to_lowercase())
}

/// Extract URL/domain from a browser window
/// 
/// On Windows: Uses UI Automation API to read the actual URL from the address bar
/// On macOS: Uses window title parsing as fallback
/// 
/// This is the MOST ROBUST solution because it reads the actual URL directly
/// from the browser's address bar, eliminating issues with:
/// - TLD lists (any domain works)
/// - Separator variations (·, —, |, -)
/// - Known site mappings (not needed)
/// - Browser title format differences
pub fn extract_browser_url(
    app_name: &str,
    app_id: &str,
    window_title: Option<&str>,
    hwnd: Option<isize>,
) -> BrowserUrlInfo {
    // First check if this is actually a browser
    if !is_browser_app(app_id) && !is_browser_by_name(app_name) {
        return BrowserUrlInfo::empty();
    }
    
    // On Windows, try UI Automation first for accurate URL extraction
    #[cfg(target_os = "windows")]
    if let Some(handle) = hwnd {
        if let Some(url) = uia::get_browser_url(handle) {
            log::info!("Got URL from UI Automation: {}", url);
            return BrowserUrlInfo::from_url(url);
        } else {
            log::debug!("UI Automation failed to get URL, falling back to window title");
        }
    }
    
    // Suppress unused variable warning on non-Windows
    #[cfg(not(target_os = "windows"))]
    let _ = hwnd;
    
    // Fallback: Extract domain from window title
    // This works on macOS and as fallback on Windows
    if let Some(title) = window_title {
        if let Some(domain) = extract_domain_from_window_title(title) {
            log::debug!("Extracted domain '{}' from browser title: {}", domain, title);
            return BrowserUrlInfo::from_domain(domain);
        }
    }
    
    BrowserUrlInfo::empty()
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_extract_domain_from_url() {
        assert_eq!(
            extract_domain_from_url("https://github.com/user/repo"),
            Some("github.com".to_string())
        );
        assert_eq!(
            extract_domain_from_url("https://www.youtube.com/watch?v=123"),
            Some("www.youtube.com".to_string())
        );
        assert_eq!(
            extract_domain_from_url("https://watchseries.bar/show/123"),
            Some("watchseries.bar".to_string())
        );
        assert_eq!(
            extract_domain_from_url("http://localhost:3000/app"),
            Some("localhost".to_string())
        );
        assert_eq!(
            extract_domain_from_url("https://sub.domain.example.co.uk:8080/path?query=1"),
            Some("sub.domain.example.co.uk".to_string())
        );
    }
    
    #[test]
    fn test_extract_browser_url_non_browser() {
        let result = extract_browser_url("Visual Studio Code", "code.exe", Some("main.rs - VSCode"), None);
        assert!(result.url.is_none());
        assert!(result.domain.is_none());
    }
    
    #[test]
    fn test_extract_browser_url_from_title_fallback() {
        // This test verifies the window title fallback works
        let result = extract_browser_url(
            "Mozilla Firefox",
            "firefox.exe",
            Some("stackoverflow.com - Mozilla Firefox"),
            None // No hwnd means UI Automation won't be attempted
        );
        assert!(result.domain.is_some());
        assert_eq!(result.domain, Some("stackoverflow.com".to_string()));
    }
    
    #[test]
    fn test_browser_url_info_from_url() {
        let info = BrowserUrlInfo::from_url("https://github.com/user/repo".to_string());
        assert_eq!(info.url, Some("https://github.com/user/repo".to_string()));
        assert_eq!(info.domain, Some("github.com".to_string()));
    }
}
