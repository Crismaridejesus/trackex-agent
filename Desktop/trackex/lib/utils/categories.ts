import { AppRule, DomainRule } from '@prisma/client'

export type AppCategory = 'PRODUCTIVE' | 'NEUTRAL' | 'UNPRODUCTIVE'

export interface AppInfo {
  name: string
  windowTitle?: string
  process?: string
  domain?: string
}

export interface ClassificationResult {
  category: AppCategory
  source: 'domain_rule' | 'app_rule' | 'default'
  matchedRule?: string // The rule value that matched
}

type MatchRuleResponse = boolean | undefined | string;

/**
 * Built-in default rules for common productivity apps
 * These are used as fallback when no database rules match
 * Categories: PRODUCTIVE (work apps), NEUTRAL (general), UNPRODUCTIVE (entertainment)
 */
const DEFAULT_PRODUCTIVE_PATTERNS = [
  // IDEs and code editors
  /code|visual studio|vscode|intellij|pycharm|webstorm|phpstorm|rider|goland|android studio|xcode|eclipse|netbeans|sublime|atom|vim|nvim|neovim|emacs/i,
  // Office and productivity apps
  /microsoft word|word|excel|powerpoint|onenote|outlook|teams|notion|obsidian|evernote|todoist|asana|trello|jira|confluence|linear|clickup|monday/i,
  // Design and creative tools
  /figma|sketch|adobe|photoshop|illustrator|indesign|premiere|after effects|lightroom|canva|invision|zeplin/i,
  // Development tools
  /terminal|iterm|hyper|warp|git|github|gitlab|bitbucket|docker|postman|insomnia|dbeaver|datagrip|sequel|mongodb compass|redis|tableplus/i,
  // Communication (work-related)
  /slack|zoom|google meet|webex|discord|skype for business|microsoft teams/i,
  // Browsers (when on work-related domains)
  // Note: Browser categorization should ideally be domain-based
  // Documentation and writing
  /google docs|google sheets|google slides|overleaf|latex|typora|markdown|bear|ulysses|scrivener/i,
]

const DEFAULT_UNPRODUCTIVE_PATTERNS = [
  // Social media
  /facebook|instagram|twitter|tiktok|snapchat|whatsapp|telegram|reddit|tumblr|pinterest|linkedin/i,
  // Entertainment and streaming
  /netflix|youtube|spotify|apple music|amazon prime|disney|hulu|twitch|vlc|mpv|quicktime|movies|tv/i,
  // Gaming
  /steam|epic games|origin|battle\.net|riot|league of legends|valorant|minecraft|roblox|fortnite/i,
  // News and browsing (general)
  /news|buzzfeed|huffpost|cnn|bbc|fox news/i,
]

/**
 * Check if app matches any of the default productivity patterns
 */
function matchesDefaultPatterns(appInfo: AppInfo, patterns: RegExp[]): boolean {
  const textToMatch = [
    appInfo.name,
    appInfo.windowTitle,
    appInfo.process,
    appInfo.domain,
  ].filter(Boolean).join(' ').toLowerCase()

  return patterns.some(pattern => pattern.test(textToMatch))
}

/**
 * Categorize app using default built-in rules (fallback when no DB rules match)
 */
function categorizeByDefault(appInfo: AppInfo): AppCategory {
  // Check productive patterns first
  if (matchesDefaultPatterns(appInfo, DEFAULT_PRODUCTIVE_PATTERNS)) {
    return 'PRODUCTIVE'
  }
  
  // Check unproductive patterns
  if (matchesDefaultPatterns(appInfo, DEFAULT_UNPRODUCTIVE_PATTERNS)) {
    return 'UNPRODUCTIVE'
  }
  
  // Default to NEUTRAL for unknown apps
  return 'NEUTRAL'
}

/**
 * Check if a domain matches a domain rule
 */
function matchesDomainRule(domain: string, rule: DomainRule): boolean {
  const domainLower = domain.toLowerCase().trim()
  const patternLower = rule.domain.toLowerCase().trim()

  switch (rule.matcherType) {
    case 'EXACT':
      // Exact match: domain must equal pattern exactly
      return domainLower === patternLower

    case 'SUFFIX':
      // Suffix match: domain ends with pattern (handles subdomains)
      // e.g., "facebook.com" matches "www.facebook.com", "m.facebook.com"
      return domainLower === patternLower || domainLower.endsWith('.' + patternLower)

    case 'CONTAINS':
      // Contains match: domain contains pattern anywhere
      return domainLower.includes(patternLower)

    default:
      return false
  }
}

/**
 * Categorize by domain rules first, then app rules
 * Domain rules take priority because they're more specific
 * (e.g., Chrome is productive, but youtube.com in Chrome should be unproductive)
 */
export function categorizeDomain(domain: string, domainRules: DomainRule[]): AppCategory | null {
  // Sort rules by priority (lower number = higher priority)
  const sortedRules = domainRules
    .filter(rule => rule.isActive)
    .sort((a, b) => a.priority - b.priority)

  for (const rule of sortedRules) {
    if (matchesDomainRule(domain, rule)) {
      return rule.category as AppCategory
    }
  }

  return null // No domain rule matched
}

/**
 * Full classification with source tracking
 * Returns both the category and which type of rule matched
 */
export function classifyWithSource(
  appInfo: AppInfo,
  appRules: AppRule[],
  domainRules: DomainRule[] = []
): ClassificationResult {
  // Step 1: If domain is present, check domain-based rules first
  // This includes both domain_rules table AND app_rules with DOMAIN matcher_type
  if (appInfo.domain) {
    // Check domain_rules table first (higher priority)
    if (domainRules.length > 0) {
      const sortedDomainRules = domainRules
        .filter(rule => rule.isActive)
        .sort((a, b) => a.priority - b.priority)

      for (const rule of sortedDomainRules) {
        if (matchesDomainRule(appInfo.domain, rule)) {
          return {
            category: rule.category as AppCategory,
            source: 'domain_rule',
            matchedRule: rule.domain,
          }
        }
      }
    }

    // Check app_rules with DOMAIN matcher_type (for backward compatibility)
    const domainAppRules = appRules
      .filter(rule => rule.isActive && rule.matcherType === 'DOMAIN')
      .sort((a, b) => a.priority - b.priority)

    for (const rule of domainAppRules) {
      const valueTrimmed = rule.value.toLowerCase().trim()
      const domainLower = appInfo.domain.toLowerCase().trim()
      if (domainLower.includes(valueTrimmed) || valueTrimmed.includes(domainLower)) {
        return {
          category: rule.category as AppCategory,
          source: 'domain_rule', // Treat as domain rule since it's domain-based
          matchedRule: rule.value,
        }
      }
    }
  }

  // Step 2: Check non-DOMAIN app rules
  const sortedAppRules = appRules
    .filter(rule => rule.isActive && rule.matcherType !== 'DOMAIN')
    .sort((a, b) => a.priority - b.priority)

  for (const rule of sortedAppRules) {
    if (matchesRule(appInfo, rule)) {
      return {
        category: rule.category as AppCategory,
        source: 'app_rule',
        matchedRule: rule.value,
      }
    }
  }

  // Step 3: Fall back to default patterns
  return {
    category: categorizeByDefault(appInfo),
    source: 'default',
  }
}

export function categorizeApp(appInfo: AppInfo, rules: AppRule[], domainRules: DomainRule[] = []): AppCategory {
  // Use the new classification function for consistency
  return classifyWithSource(appInfo, rules, domainRules).category
}

function matchesRule(appInfo: AppInfo, rule: AppRule): MatchRuleResponse {
  const { matcherType, value } = rule

  switch (matcherType) {
    case 'EXACT':
      return appInfo.name.toLowerCase() === value.toLowerCase()

    case 'GLOB':
      return matchGlob(appInfo.name.toLowerCase(), value.toLowerCase())

    case 'REGEX':
      try {
        const regex = new RegExp(value, 'i')
        return regex.test(appInfo.name) || 
               (appInfo.windowTitle && regex.test(appInfo.windowTitle))
      } catch {
        return false
      }

    case 'DOMAIN':
      // Trim whitespace from both sides for robust matching
      return appInfo.domain?.toLowerCase().trim().includes(value.toLowerCase().trim()) || false

    default:
      return false
  }
}

function matchGlob(text: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp('^' + escaped.replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i')
  return regex.test(text)
}

export function testRule(rule: Pick<AppRule, 'matcherType' | 'value'>, appInfo: AppInfo): boolean {
  return matchesRule(appInfo, { ...rule, category: 'NEUTRAL', priority: 100, isActive: true } as AppRule) as boolean
}
