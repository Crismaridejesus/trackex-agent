/**
 * Unit Tests for App/Domain Categorization Utilities
 *
 * Tests the productivity categorization logic for apps and domains.
 * This is critical for accurate time tracking and analytics.
 */

import {
  AppInfo,
  categorizeApp,
  categorizeDomain,
  classifyWithSource,
  testRule,
} from "@/lib/utils/categories"
import { describe, expect, it } from "vitest"
import { createMockAppRule, createMockDomainRule } from "../mocks/fixtures"

// ============================================================================
// categorizeApp Tests
// ============================================================================

describe("categorizeApp", () => {
  it("should return PRODUCTIVE for known productivity apps", () => {
    const appInfo: AppInfo = { name: "Visual Studio Code" }
    const result = categorizeApp(appInfo, [], [])
    expect(result).toBe("PRODUCTIVE")
  })

  it("should return UNPRODUCTIVE for entertainment apps", () => {
    const appInfo: AppInfo = { name: "Netflix" }
    const result = categorizeApp(appInfo, [], [])
    expect(result).toBe("UNPRODUCTIVE")
  })

  it("should return NEUTRAL for unknown apps", () => {
    const appInfo: AppInfo = { name: "RandomUnknownApp123" }
    const result = categorizeApp(appInfo, [], [])
    expect(result).toBe("NEUTRAL")
  })

  it("should prioritize custom app rules over defaults", () => {
    const appInfo: AppInfo = { name: "Netflix" }
    const customRule = createMockAppRule({
      matcherType: "EXACT",
      value: "Netflix",
      category: "PRODUCTIVE", // Override default UNPRODUCTIVE
    })

    const result = categorizeApp(appInfo, [customRule], [])
    expect(result).toBe("PRODUCTIVE")
  })

  it("should use domain rules for browser activity", () => {
    const appInfo: AppInfo = {
      name: "Google Chrome",
      domain: "github.com",
    }
    const domainRule = createMockDomainRule({
      domain: "github.com",
      category: "PRODUCTIVE",
    })

    const result = categorizeApp(appInfo, [], [domainRule])
    expect(result).toBe("PRODUCTIVE")
  })
})

// ============================================================================
// classifyWithSource Tests
// ============================================================================

describe("classifyWithSource", () => {
  it("should return source as domain_rule when domain rule matches", () => {
    const appInfo: AppInfo = {
      name: "Google Chrome",
      domain: "youtube.com",
    }
    const domainRule = createMockDomainRule({
      domain: "youtube.com",
      matcherType: "SUFFIX",
      category: "UNPRODUCTIVE",
    })

    const result = classifyWithSource(appInfo, [], [domainRule])

    expect(result.category).toBe("UNPRODUCTIVE")
    expect(result.source).toBe("domain_rule")
    expect(result.matchedRule).toBe("youtube.com")
  })

  it("should return source as app_rule when app rule matches", () => {
    const appInfo: AppInfo = { name: "Slack" }
    const appRule = createMockAppRule({
      matcherType: "EXACT",
      value: "Slack",
      category: "PRODUCTIVE",
    })

    const result = classifyWithSource(appInfo, [appRule], [])

    expect(result.category).toBe("PRODUCTIVE")
    expect(result.source).toBe("app_rule")
    expect(result.matchedRule).toBe("Slack")
  })

  it("should return source as default when no rules match", () => {
    const appInfo: AppInfo = { name: "Unknown App 12345" }

    const result = classifyWithSource(appInfo, [], [])

    expect(result.category).toBe("NEUTRAL")
    expect(result.source).toBe("default")
    expect(result.matchedRule).toBeUndefined()
  })

  it("should prioritize domain rules over app rules", () => {
    const appInfo: AppInfo = {
      name: "Google Chrome",
      domain: "facebook.com",
    }

    // App rule says Chrome is productive
    const appRule = createMockAppRule({
      matcherType: "GLOB",
      value: "*Chrome*",
      category: "PRODUCTIVE",
    })

    // Domain rule says facebook.com is unproductive
    const domainRule = createMockDomainRule({
      domain: "facebook.com",
      category: "UNPRODUCTIVE",
    })

    const result = classifyWithSource(appInfo, [appRule], [domainRule])

    // Domain rule should take priority
    expect(result.category).toBe("UNPRODUCTIVE")
    expect(result.source).toBe("domain_rule")
  })

  it("should respect rule priority ordering", () => {
    const appInfo: AppInfo = { name: "MyApp" }

    const lowPriorityRule = createMockAppRule({
      matcherType: "EXACT",
      value: "MyApp",
      category: "UNPRODUCTIVE",
      priority: 200,
    })

    const highPriorityRule = createMockAppRule({
      matcherType: "EXACT",
      value: "MyApp",
      category: "PRODUCTIVE",
      priority: 50,
    })

    const result = classifyWithSource(
      appInfo,
      [lowPriorityRule, highPriorityRule],
      []
    )

    expect(result.category).toBe("PRODUCTIVE")
  })

  it("should skip inactive rules", () => {
    const appInfo: AppInfo = { name: "TestApp" }

    const inactiveRule = createMockAppRule({
      matcherType: "EXACT",
      value: "TestApp",
      category: "PRODUCTIVE",
      isActive: false,
    })

    const result = classifyWithSource(appInfo, [inactiveRule], [])

    // Should fall back to default since rule is inactive
    expect(result.source).toBe("default")
  })
})

// ============================================================================
// categorizeDomain Tests
// ============================================================================

describe("categorizeDomain", () => {
  it("should match EXACT domain rule", () => {
    const rules = [
      createMockDomainRule({
        domain: "github.com",
        matcherType: "EXACT",
        category: "PRODUCTIVE",
      }),
    ]

    expect(categorizeDomain("github.com", rules)).toBe("PRODUCTIVE")
    expect(categorizeDomain("www.github.com", rules)).toBeNull() // No match
  })

  it("should match SUFFIX domain rule", () => {
    const rules = [
      createMockDomainRule({
        domain: "facebook.com",
        matcherType: "SUFFIX",
        category: "UNPRODUCTIVE",
      }),
    ]

    expect(categorizeDomain("facebook.com", rules)).toBe("UNPRODUCTIVE")
    expect(categorizeDomain("www.facebook.com", rules)).toBe("UNPRODUCTIVE")
    expect(categorizeDomain("m.facebook.com", rules)).toBe("UNPRODUCTIVE")
    expect(categorizeDomain("notfacebook.com", rules)).toBeNull()
  })

  it("should match CONTAINS domain rule", () => {
    const rules = [
      createMockDomainRule({
        domain: "google",
        matcherType: "CONTAINS",
        category: "NEUTRAL",
      }),
    ]

    expect(categorizeDomain("google.com", rules)).toBe("NEUTRAL")
    expect(categorizeDomain("docs.google.com", rules)).toBe("NEUTRAL")
    expect(categorizeDomain("google-analytics.com", rules)).toBe("NEUTRAL")
  })

  it("should return null when no rules match", () => {
    const rules = [
      createMockDomainRule({
        domain: "github.com",
        matcherType: "EXACT",
        category: "PRODUCTIVE",
      }),
    ]

    expect(categorizeDomain("stackoverflow.com", rules)).toBeNull()
  })

  it("should handle case-insensitive matching", () => {
    const rules = [
      createMockDomainRule({
        domain: "GitHub.com",
        matcherType: "SUFFIX",
        category: "PRODUCTIVE",
      }),
    ]

    expect(categorizeDomain("GITHUB.COM", rules)).toBe("PRODUCTIVE")
    expect(categorizeDomain("www.github.com", rules)).toBe("PRODUCTIVE")
  })

  it("should respect priority for multiple matching rules", () => {
    const rules = [
      createMockDomainRule({
        domain: "youtube.com",
        matcherType: "SUFFIX",
        category: "UNPRODUCTIVE",
        priority: 100,
      }),
      createMockDomainRule({
        domain: "youtube.com",
        matcherType: "SUFFIX",
        category: "PRODUCTIVE",
        priority: 50, // Higher priority (lower number)
      }),
    ]

    expect(categorizeDomain("youtube.com", rules)).toBe("PRODUCTIVE")
  })
})

// ============================================================================
// testRule Tests
// ============================================================================

describe("testRule", () => {
  describe("EXACT matcher", () => {
    it("should match exact app name", () => {
      const rule = {
        matcherType: "EXACT" as const,
        value: "Visual Studio Code",
      }
      const appInfo: AppInfo = { name: "Visual Studio Code" }

      expect(testRule(rule, appInfo)).toBe(true)
    })

    it("should be case-insensitive", () => {
      const rule = {
        matcherType: "EXACT" as const,
        value: "visual studio code",
      }
      const appInfo: AppInfo = { name: "Visual Studio Code" }

      expect(testRule(rule, appInfo)).toBe(true)
    })

    it("should not match partial names", () => {
      const rule = { matcherType: "EXACT" as const, value: "Visual Studio" }
      const appInfo: AppInfo = { name: "Visual Studio Code" }

      expect(testRule(rule, appInfo)).toBe(false)
    })
  })

  describe("GLOB matcher", () => {
    it("should match with * wildcard", () => {
      const rule = { matcherType: "GLOB" as const, value: "*Studio*" }
      const appInfo: AppInfo = { name: "Visual Studio Code" }

      expect(testRule(rule, appInfo)).toBe(true)
    })

    it("should match prefix glob", () => {
      const rule = { matcherType: "GLOB" as const, value: "Visual*" }
      const appInfo: AppInfo = { name: "Visual Studio Code" }

      expect(testRule(rule, appInfo)).toBe(true)
    })

    it("should match suffix glob", () => {
      const rule = { matcherType: "GLOB" as const, value: "*Code" }
      const appInfo: AppInfo = { name: "Visual Studio Code" }

      expect(testRule(rule, appInfo)).toBe(true)
    })

    it("should match with ? wildcard", () => {
      const rule = { matcherType: "GLOB" as const, value: "Cod?" }
      const appInfo: AppInfo = { name: "Code" }

      expect(testRule(rule, appInfo)).toBe(true)
    })
  })

  describe("REGEX matcher", () => {
    it("should match regex patterns", () => {
      const rule = { matcherType: "REGEX" as const, value: "^Visual.*Code$" }
      const appInfo: AppInfo = { name: "Visual Studio Code" }

      expect(testRule(rule, appInfo)).toBe(true)
    })

    it("should match window title with regex", () => {
      const rule = { matcherType: "REGEX" as const, value: "Dashboard" }
      const appInfo: AppInfo = {
        name: "Chrome",
        windowTitle: "TrackEx Dashboard",
      }

      expect(testRule(rule, appInfo)).toBe(true)
    })

    it("should handle invalid regex gracefully", () => {
      const rule = { matcherType: "REGEX" as const, value: "[invalid(" }
      const appInfo: AppInfo = { name: "Test App" }

      // Should return false, not throw
      expect(testRule(rule, appInfo)).toBe(false)
    })
  })

  describe("DOMAIN matcher", () => {
    it("should match domain", () => {
      const rule = { matcherType: "DOMAIN" as const, value: "github.com" }
      const appInfo: AppInfo = { name: "Chrome", domain: "github.com" }

      expect(testRule(rule, appInfo)).toBe(true)
    })

    it("should match subdomain", () => {
      const rule = { matcherType: "DOMAIN" as const, value: "github.com" }
      const appInfo: AppInfo = { name: "Chrome", domain: "gist.github.com" }

      expect(testRule(rule, appInfo)).toBe(true)
    })

    it("should return false when no domain present", () => {
      const rule = { matcherType: "DOMAIN" as const, value: "github.com" }
      const appInfo: AppInfo = { name: "Chrome" }

      expect(testRule(rule, appInfo)).toBe(false)
    })
  })
})

// ============================================================================
// Default Pattern Tests
// ============================================================================

describe("Default Pattern Matching", () => {
  describe("PRODUCTIVE patterns", () => {
    const productiveApps = [
      "Visual Studio Code",
      "WebStorm",
      "IntelliJ IDEA",
      "PyCharm",
      "Xcode",
      "Microsoft Word",
      "Excel",
      "PowerPoint",
      "Slack",
      "Zoom",
      "Figma",
      "Adobe Photoshop",
      "Terminal",
      "iTerm2",
      "Docker Desktop",
      "Postman",
      "Notion",
      "Obsidian",
      "Jira",
      "Confluence",
    ]

    productiveApps.forEach((appName) => {
      it(`should categorize "${appName}" as PRODUCTIVE`, () => {
        const appInfo: AppInfo = { name: appName }
        const result = categorizeApp(appInfo, [], [])
        expect(result).toBe("PRODUCTIVE")
      })
    })
  })

  describe("UNPRODUCTIVE patterns", () => {
    const unproductiveApps = [
      "Netflix",
      "YouTube",
      "Spotify",
      "Steam",
      "Facebook",
      "Instagram",
      "Twitter",
      "TikTok",
      "Twitch",
    ]

    unproductiveApps.forEach((appName) => {
      it(`should categorize "${appName}" as UNPRODUCTIVE`, () => {
        const appInfo: AppInfo = { name: appName }
        const result = categorizeApp(appInfo, [], [])
        expect(result).toBe("UNPRODUCTIVE")
      })
    })
  })

  describe("NEUTRAL (unknown) apps", () => {
    const neutralApps = [
      "RandomApp123",
      "CustomInternalTool",
      "MyCompanyApp",
      "UnknownSoftware",
    ]

    neutralApps.forEach((appName) => {
      it(`should categorize "${appName}" as NEUTRAL`, () => {
        const appInfo: AppInfo = { name: appName }
        const result = categorizeApp(appInfo, [], [])
        expect(result).toBe("NEUTRAL")
      })
    })
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  it("should handle empty app name", () => {
    const appInfo: AppInfo = { name: "" }
    const result = categorizeApp(appInfo, [], [])
    expect(result).toBe("NEUTRAL")
  })

  it("should handle app name with special characters", () => {
    const appInfo: AppInfo = { name: "App (v2.0) [Beta]" }
    const result = categorizeApp(appInfo, [], [])
    expect(result).toBe("NEUTRAL")
  })

  it("should handle very long app names", () => {
    const appInfo: AppInfo = { name: "A".repeat(1000) }
    const result = categorizeApp(appInfo, [], [])
    expect(result).toBe("NEUTRAL")
  })

  it("should handle domain with leading/trailing spaces", () => {
    const rules = [
      createMockDomainRule({
        domain: "  github.com  ",
        matcherType: "SUFFIX",
        category: "PRODUCTIVE",
      }),
    ]

    // The domain matching should handle trimming
    expect(categorizeDomain("github.com", rules)).toBe("PRODUCTIVE")
  })

  it("should handle mixed case in window title matching", () => {
    const appInfo: AppInfo = {
      name: "Chrome",
      windowTitle: "VISUAL STUDIO CODE - main.ts",
    }

    // Default patterns should be case-insensitive
    const result = categorizeApp(appInfo, [], [])
    expect(result).toBe("PRODUCTIVE")
  })

  it("should use window title for classification when app name is generic", () => {
    const appInfo: AppInfo = {
      name: "electron",
      windowTitle: "Slack | #general",
    }

    const result = categorizeApp(appInfo, [], [])
    expect(result).toBe("PRODUCTIVE")
  })
})
