//! Privacy utilities for URL and domain handling
//!
//! This module provides functions to extract domains from URLs,
//! detect browser applications, and apply privacy rules.

use lazy_static::lazy_static;
use regex::Regex;
use std::collections::HashMap;

lazy_static! {
    /// Known site names to domain mapping
    /// This maps common site names that appear in browser window titles to their actual domains
    static ref KNOWN_SITES: HashMap<&'static str, &'static str> = {
        let mut m = HashMap::new();
        // Developer tools & platforms
        m.insert("github", "github.com");
        m.insert("gitlab", "gitlab.com");
        m.insert("bitbucket", "bitbucket.org");
        m.insert("stack overflow", "stackoverflow.com");
        m.insert("stackoverflow", "stackoverflow.com");
        m.insert("codepen", "codepen.io");
        m.insert("codesandbox", "codesandbox.io");
        m.insert("replit", "replit.com");
        m.insert("jsfiddle", "jsfiddle.net");
        m.insert("npm", "npmjs.com");
        m.insert("crates.io", "crates.io");
        m.insert("pypi", "pypi.org");
        m.insert("docker hub", "hub.docker.com");
        m.insert("vercel", "vercel.com");
        m.insert("netlify", "netlify.com");
        m.insert("heroku", "heroku.com");
        m.insert("aws", "aws.amazon.com");
        m.insert("azure", "azure.microsoft.com");
        
        // Social & communication
        m.insert("youtube", "youtube.com");
        m.insert("twitter", "twitter.com");
        m.insert("x.com", "x.com");
        m.insert("linkedin", "linkedin.com");
        m.insert("facebook", "facebook.com");
        m.insert("instagram", "instagram.com");
        m.insert("reddit", "reddit.com");
        m.insert("discord", "discord.com");
        m.insert("slack", "slack.com");
        m.insert("whatsapp", "web.whatsapp.com");
        m.insert("telegram", "web.telegram.org");
        m.insert("messenger", "messenger.com");
        m.insert("tiktok", "tiktok.com");
        m.insert("twitch", "twitch.tv");
        
        // Productivity & work
        m.insert("notion", "notion.so");
        m.insert("figma", "figma.com");
        m.insert("miro", "miro.com");
        m.insert("trello", "trello.com");
        m.insert("asana", "asana.com");
        m.insert("jira", "atlassian.net");
        m.insert("confluence", "atlassian.net");
        m.insert("monday.com", "monday.com");
        m.insert("clickup", "clickup.com");
        m.insert("airtable", "airtable.com");
        m.insert("dropbox", "dropbox.com");
        m.insert("evernote", "evernote.com");
        m.insert("todoist", "todoist.com");
        m.insert("canva", "canva.com");
        m.insert("hubspot", "hubspot.com");
        m.insert("salesforce", "salesforce.com");
        m.insert("zendesk", "zendesk.com");
        m.insert("intercom", "intercom.com");
        
        // Google services
        m.insert("google docs", "docs.google.com");
        m.insert("google sheets", "sheets.google.com");
        m.insert("google slides", "slides.google.com");
        m.insert("google drive", "drive.google.com");
        m.insert("google calendar", "calendar.google.com");
        m.insert("google meet", "meet.google.com");
        m.insert("gmail", "mail.google.com");
        m.insert("google maps", "maps.google.com");
        m.insert("google search", "google.com");
        m.insert("google translate", "translate.google.com");
        
        // Microsoft services
        m.insert("outlook", "outlook.com");
        m.insert("microsoft teams", "teams.microsoft.com");
        m.insert("sharepoint", "sharepoint.com");
        m.insert("onedrive", "onedrive.live.com");
        m.insert("office", "office.com");
        
        // AI & tech
        m.insert("claude", "claude.ai");
        m.insert("chatgpt", "chat.openai.com");
        m.insert("openai", "openai.com");
        m.insert("bard", "bard.google.com");
        m.insert("midjourney", "midjourney.com");
        m.insert("perplexity", "perplexity.ai");
        m.insert("hugging face", "huggingface.co");
        
        // E-commerce & shopping
        m.insert("amazon", "amazon.com");
        m.insert("ebay", "ebay.com");
        m.insert("etsy", "etsy.com");
        m.insert("shopify", "shopify.com");
        m.insert("aliexpress", "aliexpress.com");
        
        // Entertainment & media
        m.insert("netflix", "netflix.com");
        m.insert("spotify", "open.spotify.com");
        m.insert("hulu", "hulu.com");
        m.insert("disney+", "disneyplus.com");
        m.insert("prime video", "primevideo.com");
        m.insert("hbo max", "max.com");
        m.insert("soundcloud", "soundcloud.com");
        m.insert("apple music", "music.apple.com");
        
        // News & information
        m.insert("wikipedia", "wikipedia.org");
        m.insert("medium", "medium.com");
        m.insert("dev.to", "dev.to");
        m.insert("hacker news", "news.ycombinator.com");
        m.insert("techcrunch", "techcrunch.com");
        m.insert("the verge", "theverge.com");
        m.insert("bbc", "bbc.com");
        m.insert("cnn", "cnn.com");
        m.insert("nytimes", "nytimes.com");
        m.insert("new york times", "nytimes.com");
        
        // Finance
        m.insert("paypal", "paypal.com");
        m.insert("stripe", "stripe.com");
        m.insert("coinbase", "coinbase.com");
        m.insert("robinhood", "robinhood.com");
        m.insert("yahoo finance", "finance.yahoo.com");
        
        // Cloudinary for media management
        m.insert("cloudinary", "cloudinary.com");
        
        // TrackEx itself
        m.insert("trackex", "trackex.live");
        
        // Streaming sites
        m.insert("watch series", "watchseries.bar");
        m.insert("watchseries", "watchseries.bar");
        m.insert("123movies", "123movies.to");
        m.insert("fmovies", "fmovies.to");
        m.insert("putlocker", "putlocker.vip");
        m.insert("soap2day", "soap2day.to");
        m.insert("solarmovie", "solarmovie.pe");
        m.insert("gomovies", "gomovies.sx");
        m.insert("yesmovies", "yesmovies.ag");
        m.insert("popcornflix", "popcornflix.com");
        m.insert("crunchyroll", "crunchyroll.com");
        m.insert("funimation", "funimation.com");
        m.insert("kissanime", "kissanime.ru");
        m.insert("9anime", "9anime.to");
        m.insert("gogoanime", "gogoanime.vc");
        m.insert("animixplay", "animixplay.to");
        m.insert("zoro", "zoro.to");
        m.insert("aniwatch", "aniwatch.to");
        m.insert("pluto tv", "pluto.tv");
        m.insert("tubi", "tubitv.com");
        m.insert("peacock", "peacocktv.com");
        m.insert("paramount+", "paramountplus.com");
        m.insert("paramount plus", "paramountplus.com");
        m.insert("apple tv+", "tv.apple.com");
        m.insert("apple tv", "tv.apple.com");
        m.insert("vimeo", "vimeo.com");
        m.insert("dailymotion", "dailymotion.com");
        m.insert("bilibili", "bilibili.com");
        
        // Gaming & game platforms
        m.insert("steam", "store.steampowered.com");
        m.insert("epic games", "epicgames.com");
        m.insert("gog", "gog.com");
        m.insert("itch.io", "itch.io");
        m.insert("roblox", "roblox.com");
        m.insert("minecraft", "minecraft.net");
        m.insert("battle.net", "battle.net");
        m.insert("blizzard", "blizzard.com");
        m.insert("origin", "origin.com");
        m.insert("ubisoft", "ubisoft.com");
        m.insert("xbox", "xbox.com");
        m.insert("playstation", "playstation.com");
        m.insert("nintendo", "nintendo.com");
        
        // Additional developer tools
        m.insert("rust playground", "play.rust-lang.org");
        m.insert("typescript playground", "typescriptlang.org");
        m.insert("go playground", "go.dev");
        m.insert("leetcode", "leetcode.com");
        m.insert("hackerrank", "hackerrank.com");
        m.insert("codewars", "codewars.com");
        m.insert("exercism", "exercism.org");
        m.insert("freecodecamp", "freecodecamp.org");
        m.insert("w3schools", "w3schools.com");
        m.insert("mdn web docs", "developer.mozilla.org");
        m.insert("mdn", "developer.mozilla.org");
        m.insert("can i use", "caniuse.com");
        m.insert("regex101", "regex101.com");
        m.insert("postman", "postman.com");
        m.insert("insomnia", "insomnia.rest");
        m.insert("swagger", "swagger.io");
        m.insert("graphql", "graphql.org");
        m.insert("prisma", "prisma.io");
        m.insert("supabase", "supabase.com");
        m.insert("firebase", "firebase.google.com");
        m.insert("mongodb", "mongodb.com");
        m.insert("planetscale", "planetscale.com");
        m.insert("railway", "railway.app");
        m.insert("render", "render.com");
        m.insert("fly.io", "fly.io");
        m.insert("deno deploy", "deno.com");
        m.insert("cloudflare", "cloudflare.com");
        m.insert("digitalocean", "digitalocean.com");
        m.insert("linode", "linode.com");
        m.insert("vultr", "vultr.com");
        m.insert("hetzner", "hetzner.com");
        
        // More social/community
        m.insert("pinterest", "pinterest.com");
        m.insert("tumblr", "tumblr.com");
        m.insert("quora", "quora.com");
        m.insert("threads", "threads.net");
        m.insert("mastodon", "mastodon.social");
        m.insert("bluesky", "bsky.app");
        m.insert("producthunt", "producthunt.com");
        m.insert("product hunt", "producthunt.com");
        m.insert("indie hackers", "indiehackers.com");
        m.insert("lobsters", "lobste.rs");
        m.insert("slashdot", "slashdot.org");
        
        // Education
        m.insert("coursera", "coursera.org");
        m.insert("udemy", "udemy.com");
        m.insert("udacity", "udacity.com");
        m.insert("edx", "edx.org");
        m.insert("khan academy", "khanacademy.org");
        m.insert("skillshare", "skillshare.com");
        m.insert("pluralsight", "pluralsight.com");
        m.insert("linkedin learning", "linkedin.com/learning");
        m.insert("brilliant", "brilliant.org");
        m.insert("duolingo", "duolingo.com");
        
        m
    };
}

/// List of known browser process names (Windows)
const BROWSER_PROCESSES_WINDOWS: &[&str] = &[
    "chrome.exe",
    "msedge.exe",
    "firefox.exe",
    "brave.exe",
    "opera.exe",
    "iexplore.exe",
    "vivaldi.exe",
    "chromium.exe",
    "arc.exe",
    "safari", // For potential cross-platform use
];

/// List of known browser bundle IDs (macOS)
const BROWSER_BUNDLES_MACOS: &[&str] = &[
    "com.google.chrome",
    "com.microsoft.edgemac",
    "org.mozilla.firefox",
    "com.brave.browser",
    "com.operasoftware.opera",
    "com.vivaldi.vivaldi",
    "company.thebrowser.browser", // Arc
    "com.apple.safari",
];

/// Check if the given app is a browser based on process name or bundle ID
pub fn is_browser_app(app_id: &str) -> bool {
    let app_id_lower = app_id.to_lowercase();
    
    // Check Windows process names
    for process in BROWSER_PROCESSES_WINDOWS {
        if app_id_lower.contains(process) || app_id_lower.ends_with(process) {
            return true;
        }
    }
    
    // Check macOS bundle IDs
    for bundle in BROWSER_BUNDLES_MACOS {
        if app_id_lower.contains(bundle) {
            return true;
        }
    }
    
    // Also check common browser names in the app_id
    let browser_keywords = ["chrome", "firefox", "edge", "safari", "brave", "opera", "vivaldi", "browser"];
    for keyword in browser_keywords {
        if app_id_lower.contains(keyword) {
            return true;
        }
    }
    
    false
}

/// Check if the given app name indicates a browser
pub fn is_browser_by_name(app_name: &str) -> bool {
    let name_lower = app_name.to_lowercase();
    let browser_names = [
        "google chrome",
        "chrome",
        "microsoft edge",
        "edge",
        "mozilla firefox",
        "firefox",
        "safari",
        "brave",
        "opera",
        "vivaldi",
        "arc",
    ];
    
    browser_names.iter().any(|&name| name_lower.contains(name))
}

/// Extract domain from a full URL
/// 
/// Examples:
/// - "https://github.com/user/repo/issues/123" -> "github.com"
/// - "http://www.google.com/search?q=test" -> "google.com"
/// - "github.com" -> "github.com"
pub fn extract_domain_from_url(url: &str) -> Option<String> {
    lazy_static! {
        // Match URLs with protocol
        static ref URL_REGEX: Regex = Regex::new(
            r"^(?:https?://)?(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+)"
        ).unwrap();
    }
    
    // Try to match URL pattern
    if let Some(captures) = URL_REGEX.captures(url) {
        if let Some(domain_match) = captures.get(1) {
            let domain = domain_match.as_str().to_lowercase();
            // Remove www. prefix if present
            let cleaned = domain.strip_prefix("www.").unwrap_or(&domain);
            return Some(cleaned.to_string());
        }
    }
    
    // If no match, try to extract domain from simple format
    let trimmed = url.trim();
    if !trimmed.contains('/') && trimmed.contains('.') && !trimmed.contains(' ') {
        let cleaned = trimmed.to_lowercase();
        let cleaned = cleaned.strip_prefix("www.").unwrap_or(&cleaned);
        return Some(cleaned.to_string());
    }
    
    None
}

/// Extract domain from a browser window title
/// 
/// Browser titles typically follow patterns like:
/// - "Page Title - Google Chrome"
/// - "GitHub - Where software... - Mozilla Firefox"
/// - "google.com - Mozilla Firefox"
/// - "Trackex - Time & Productivity Tracking - Google Chrome"
pub fn extract_domain_from_window_title(title: &str) -> Option<String> {
    lazy_static! {
        // Match domain-like patterns in window titles
        // Comprehensive TLD list including ccTLDs and new gTLDs
        static ref DOMAIN_IN_TITLE: Regex = Regex::new(
            r"([a-zA-Z0-9][-a-zA-Z0-9]*\.(?:com|org|net|io|co|dev|app|ai|edu|gov|me|us|uk|de|fr|jp|cn|in|au|ca|br|ru|es|it|nl|se|no|fi|dk|pl|ch|at|be|nz|za|mx|ar|cl|kr|sg|hk|tw|my|th|ph|id|vn|pk|bd|lk|np|live|tv|gg|bar|xyz|club|online|site|tech|space|fun|store|shop|blog|info|biz|cc|ws|to|fm|am|so|vc|ly|gl|im|is|ms|sh|ac|la|pw|tf|tk|gq|cf|ga|ml|top|work|world|one|pro|media|news|social|network|agency|design|digital|video|watch|movie|stream|games|game|rocks|cool|ninja|life|today|zone|systems|solutions|services|group|cloud|download|email|link|click|website|web|page|host|domains|center|company|support|studio|tools|software|ventures|enterprises|international|global|team|partners|holdings|investments|capital|finance|consulting|management|marketing|technology|industries|productions|creative|academy|institute|university|education|school|training|learning|courses|health|healthcare|medical|dental|fitness|sports|travel|tours|holidays|vacation|hotel|hotels|restaurant|food|cafe|coffee|bar|pub|beer|wine|pizza|kitchen|recipes|cooking|fashion|style|beauty|salon|spa|jewelry|watches|shoes|clothing|boutique|wedding|events|party|gifts|flowers|cards|toys|baby|kids|family|pets|dating|singles|photos|photography|gallery|art|music|band|audio|video|radio|film|movies|theater|tickets|show|entertainment|casino|poker|bet|betting|lottery|games|toys|play|fun|discount|deals|coupons|sale|promo|cheap|express|direct|delivery|shipping|supply|parts|auto|car|cars|bike|motorcycle|taxi|rent|rental|realestate|property|properties|house|home|homes|apartment|land|construction|build|builders|plumber|electric|solar|energy|green|eco|organic|natural|garden|farm|agriculture|legal|law|lawyer|attorney|accountant|insurance|loans|mortgage|credit|bank|cash|money|pay|exchange|trade|forex|crypto|bitcoin|invest|gold|diamonds|security|safe|storage|cleaning|repair|maintenance|moving|movers|contractors|builders|roofing|painting|flooring|hvac|plumbing|electrical|landscaping|fencing|pool|pest|locksmith|glass|windows|doors|furniture|kitchen|bath|interior|exterior))"
        ).unwrap();
        
        // Alternative: match URLs directly in title
        static ref URL_IN_TITLE: Regex = Regex::new(
            r"https?://(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+)"
        ).unwrap();
    }
    
    // First try to find a URL in the title
    if let Some(captures) = URL_IN_TITLE.captures(title) {
        if let Some(domain_match) = captures.get(1) {
            return Some(domain_match.as_str().to_lowercase());
        }
    }
    
    // Then try to find domain pattern (like "github.com" directly in title)
    if let Some(captures) = DOMAIN_IN_TITLE.captures(title) {
        if let Some(domain_match) = captures.get(1) {
            let domain = domain_match.as_str().to_lowercase();
            // Remove www. prefix if somehow present
            let cleaned = domain.strip_prefix("www.").unwrap_or(&domain);
            return Some(cleaned.to_string());
        }
    }
    
    // Finally, try to match known site names in the window title
    // This handles cases like "GitHub - Where software is built - Google Chrome"
    // where "GitHub" should map to "github.com"
    let title_lower = title.to_lowercase();
    
    // Normalize separators: replace middle dot (·), em-dash (—), en-dash (–), and pipe (|) with standard hyphen
    let title_normalized = title_lower
        .replace('·', "-")
        .replace('—', "-")
        .replace('–', "-")
        .replace('|', "-");
    
    // Remove browser suffix for cleaner matching
    // Common patterns: "... - Google Chrome", "... - Mozilla Firefox", "... - Microsoft Edge"
    let title_without_browser = title_normalized
        .trim_end_matches(" - google chrome")
        .trim_end_matches(" - mozilla firefox")
        .trim_end_matches(" - microsoft edge")
        .trim_end_matches(" - edge")
        .trim_end_matches(" - safari")
        .trim_end_matches(" - brave")
        .trim_end_matches(" - brave browser")  // Brave uses "Brave Browser" in title
        .trim_end_matches(" - opera")
        .trim_end_matches(" - opera gx")
        .trim_end_matches(" - vivaldi")
        .trim_end_matches(" - arc")
        .trim_end_matches(" - chromium")
        .trim_end_matches(" - waterfox")
        .trim_end_matches(" - tor browser")
        .trim();
    
    // Check for known site names - longer matches first to avoid partial matches
    // Sort by key length descending for more specific matches
    let mut sorted_sites: Vec<_> = KNOWN_SITES.iter().collect();
    sorted_sites.sort_by(|a, b| b.0.len().cmp(&a.0.len()));
    
    for (name, domain) in sorted_sites {
        // Check if the site name appears at the start of the title (most common)
        // or as a word boundary (to avoid matching "github" in "notgithub")
        if title_without_browser.starts_with(name) 
            || title_without_browser.contains(&format!(" {} ", name))
            || title_without_browser.contains(&format!(" {} -", name))
            || title_without_browser.contains(&format!("{} -", name))
            || title_without_browser.ends_with(&format!(" {}", name))
        {
            log::debug!("Matched known site '{}' -> '{}' in title: {}", name, domain, title);
            return Some(domain.to_string());
        }
    }
    
    None
}

/// Apply browser domain only policy to URL
/// 
/// If `domain_only` is true, returns only the domain part.
/// Otherwise, returns the full URL.
pub fn apply_domain_only_policy(url: Option<&str>, domain_only: bool) -> Option<String> {
    match url {
        Some(u) if domain_only => extract_domain_from_url(u),
        Some(u) => Some(u.to_string()),
        None => None,
    }
}

/// Sanitize URL/domain for storage based on policy
pub struct UrlSanitizer {
    pub browser_domain_only: bool,
}

impl UrlSanitizer {
    pub fn new(browser_domain_only: bool) -> Self {
        Self { browser_domain_only }
    }
    
    /// Sanitize the URL based on the policy
    /// Returns (url_to_store, domain)
    pub fn sanitize(&self, url: Option<&str>) -> (Option<String>, Option<String>) {
        let domain = url.and_then(extract_domain_from_url);
        
        let url_to_store = if self.browser_domain_only {
            // When domain-only mode is enabled, store domain as URL
            domain.clone()
        } else {
            // Store full URL
            url.map(|u| u.to_string())
        };
        
        (url_to_store, domain)
    }
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
            extract_domain_from_url("http://www.google.com/search?q=test"),
            Some("google.com".to_string())
        );
        assert_eq!(
            extract_domain_from_url("github.com"),
            Some("github.com".to_string())
        );
        assert_eq!(
            extract_domain_from_url("https://stackoverflow.com/questions/12345"),
            Some("stackoverflow.com".to_string())
        );
    }
    
    #[test]
    fn test_is_browser_app() {
        assert!(is_browser_app("chrome.exe"));
        assert!(is_browser_app("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"));
        assert!(is_browser_app("com.google.Chrome"));
        assert!(is_browser_app("msedge.exe"));
        assert!(!is_browser_app("code.exe"));
        assert!(!is_browser_app("notepad.exe"));
    }
    
    #[test]
    fn test_extract_domain_from_window_title() {
        // Test direct domain in title
        assert_eq!(
            extract_domain_from_window_title("stackoverflow.com - Mozilla Firefox"),
            Some("stackoverflow.com".to_string())
        );
        
        // Test known site name mapping
        assert_eq!(
            extract_domain_from_window_title("GitHub - Where software is built - Google Chrome"),
            Some("github.com".to_string())
        );
        
        // Test TrackEx
        assert_eq!(
            extract_domain_from_window_title("Trackex - Time & Productivity Tracking - Google Chrome"),
            Some("trackex.live".to_string())
        );
        
        // Test YouTube
        assert_eq!(
            extract_domain_from_window_title("How to Learn Rust - YouTube - Google Chrome"),
            Some("youtube.com".to_string())
        );
        
        // Test Cloudinary
        assert_eq!(
            extract_domain_from_window_title("macos | Folders | Assets (DAM) | Cloudinary - Google Chrome"),
            Some("cloudinary.com".to_string())
        );
        
        // Test Reddit
        assert_eq!(
            extract_domain_from_window_title("Reddit - Pair Programming Tips - Microsoft Edge"),
            Some("reddit.com".to_string())
        );
    }
    
    #[test]
    fn test_url_sanitizer() {
        let sanitizer = UrlSanitizer::new(true);
        let (url, domain) = sanitizer.sanitize(Some("https://github.com/user/repo"));
        assert_eq!(url, Some("github.com".to_string()));
        assert_eq!(domain, Some("github.com".to_string()));
        
        let sanitizer = UrlSanitizer::new(false);
        let (url, domain) = sanitizer.sanitize(Some("https://github.com/user/repo"));
        assert_eq!(url, Some("https://github.com/user/repo".to_string()));
        assert_eq!(domain, Some("github.com".to_string()));
    }
}
