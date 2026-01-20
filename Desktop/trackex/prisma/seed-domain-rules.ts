/**
 * Seed script to create default domain rules for productivity classification
 * Usage: npx tsx prisma/seed-domain-rules.ts
 *
 * These rules define common unproductive domains that should override
 * app-level classification (e.g., youtube.com in Chrome = unproductive)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()

// Use a system organization ID for global rules
// This can be any organization ID, as isGlobal: true makes them visible to all
const SYSTEM_ORG_ID = "cmk6zlz5700316u93pu0oetu7"

// Default unproductive domains - social media, entertainment, etc.
const DEFAULT_UNPRODUCTIVE_DOMAINS = [
  // Social Media
  {
    domain: "youtube.com",
    description: "Video streaming - Entertainment",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "facebook.com",
    description: "Social media",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "instagram.com",
    description: "Social media",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "twitter.com",
    description: "Social media",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "x.com",
    description: "Social media (Twitter/X)",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "tiktok.com",
    description: "Short-form video",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "snapchat.com",
    description: "Social media",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "pinterest.com",
    description: "Social media",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "tumblr.com",
    description: "Social media",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "reddit.com",
    description: "Social news/discussion",
    category: "UNPRODUCTIVE",
  },

  // Entertainment & Streaming
  {
    domain: "netflix.com",
    description: "Video streaming",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "hulu.com",
    description: "Video streaming",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "disneyplus.com",
    description: "Video streaming",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "primevideo.com",
    description: "Video streaming",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "max.com",
    description: "Video streaming (HBO)",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "twitch.tv",
    description: "Live streaming",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "crunchyroll.com",
    description: "Anime streaming",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "spotify.com",
    description: "Music streaming",
    category: "NEUTRAL",
  },

  // Gaming
  {
    domain: "store.steampowered.com",
    description: "Gaming platform",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "epicgames.com",
    description: "Gaming platform",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "roblox.com",
    description: "Gaming platform",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "twitch.tv",
    description: "Gaming streaming",
    category: "UNPRODUCTIVE",
  },

  // News & Casual browsing
  {
    domain: "buzzfeed.com",
    description: "Entertainment news",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "9gag.com",
    description: "Memes/Entertainment",
    category: "UNPRODUCTIVE",
  },
  {
    domain: "imgur.com",
    description: "Image sharing",
    category: "UNPRODUCTIVE",
  },
]

// Default productive domains - work tools, documentation, etc.
const DEFAULT_PRODUCTIVE_DOMAINS = [
  // Developer tools
  {
    domain: "github.com",
    description: "Code hosting & collaboration",
    category: "PRODUCTIVE",
  },
  {
    domain: "gitlab.com",
    description: "Code hosting & collaboration",
    category: "PRODUCTIVE",
  },
  {
    domain: "bitbucket.org",
    description: "Code hosting",
    category: "PRODUCTIVE",
  },
  {
    domain: "stackoverflow.com",
    description: "Developer Q&A",
    category: "PRODUCTIVE",
  },
  {
    domain: "developer.mozilla.org",
    description: "Web documentation",
    category: "PRODUCTIVE",
  },
  {
    domain: "docs.microsoft.com",
    description: "Microsoft documentation",
    category: "PRODUCTIVE",
  },
  {
    domain: "cloud.google.com",
    description: "Cloud platform",
    category: "PRODUCTIVE",
  },
  {
    domain: "aws.amazon.com",
    description: "Cloud platform",
    category: "PRODUCTIVE",
  },
  {
    domain: "vercel.com",
    description: "Deployment platform",
    category: "PRODUCTIVE",
  },
  {
    domain: "netlify.com",
    description: "Deployment platform",
    category: "PRODUCTIVE",
  },

  // Productivity & Work
  {
    domain: "notion.so",
    description: "Notes & documentation",
    category: "PRODUCTIVE",
  },
  { domain: "figma.com", description: "Design tool", category: "PRODUCTIVE" },
  {
    domain: "linear.app",
    description: "Project management",
    category: "PRODUCTIVE",
  },
  {
    domain: "asana.com",
    description: "Project management",
    category: "PRODUCTIVE",
  },
  {
    domain: "trello.com",
    description: "Project management",
    category: "PRODUCTIVE",
  },
  {
    domain: "jira.atlassian.com",
    description: "Issue tracking",
    category: "PRODUCTIVE",
  },
  {
    domain: "confluence.atlassian.com",
    description: "Documentation",
    category: "PRODUCTIVE",
  },
  {
    domain: "slack.com",
    description: "Team communication",
    category: "PRODUCTIVE",
  },
  {
    domain: "zoom.us",
    description: "Video conferencing",
    category: "PRODUCTIVE",
  },
  {
    domain: "meet.google.com",
    description: "Video conferencing",
    category: "PRODUCTIVE",
  },
  {
    domain: "teams.microsoft.com",
    description: "Team communication",
    category: "PRODUCTIVE",
  },

  // Google Workspace
  {
    domain: "docs.google.com",
    description: "Google Docs",
    category: "PRODUCTIVE",
  },
  {
    domain: "sheets.google.com",
    description: "Google Sheets",
    category: "PRODUCTIVE",
  },
  {
    domain: "slides.google.com",
    description: "Google Slides",
    category: "PRODUCTIVE",
  },
  {
    domain: "drive.google.com",
    description: "Google Drive",
    category: "PRODUCTIVE",
  },
  {
    domain: "calendar.google.com",
    description: "Google Calendar",
    category: "PRODUCTIVE",
  },
  { domain: "mail.google.com", description: "Gmail", category: "PRODUCTIVE" },

  // AI Tools (work-related)
  {
    domain: "chat.openai.com",
    description: "AI assistant",
    category: "PRODUCTIVE",
  },
  { domain: "claude.ai", description: "AI assistant", category: "PRODUCTIVE" },

  // Learning (can be work-related)
  {
    domain: "udemy.com",
    description: "Online courses",
    category: "PRODUCTIVE",
  },
  {
    domain: "coursera.org",
    description: "Online courses",
    category: "PRODUCTIVE",
  },
  {
    domain: "linkedin.com/learning",
    description: "LinkedIn Learning",
    category: "PRODUCTIVE",
  },
]

async function main() {
  console.log("\n🌐 Seeding Domain Rules...\n")

  const allRules = [
    ...DEFAULT_UNPRODUCTIVE_DOMAINS,
    ...DEFAULT_PRODUCTIVE_DOMAINS,
  ]

  let created = 0
  let skipped = 0

  for (const rule of allRules) {
    try {
      // Use upsert to avoid duplicates
      await prisma.domainRule.upsert({
        where: {
          organizationId_domain_matcherType: {
            organizationId: SYSTEM_ORG_ID, // Use system org for global rules
            domain: rule.domain,
            matcherType: "SUFFIX",
          },
        },
        update: {
          category: rule.category,
          description: rule.description,
        },
        create: {
          organizationId: SYSTEM_ORG_ID,
          domain: rule.domain,
          matcherType: "SUFFIX",
          category: rule.category,
          description: rule.description,
          priority: 100,
          isActive: true,
          isGlobal: true,
        },
      })
      created++
      console.log(`  ✅ ${rule.domain} → ${rule.category}`)
    } catch (error) {
      skipped++
      console.log(`  ⚠️  ${rule.domain} (skipped - may already exist)`)
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Created/Updated: ${created}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Total rules: ${allRules.length}`)

  // Show current counts
  const counts = await prisma.domainRule.groupBy({
    by: ["category"],
    _count: true,
  })

  console.log("\n📈 Rules by Category:")
  for (const c of counts) {
    console.log(`   ${c.category}: ${c._count}`)
  }

  console.log("\n✅ Domain rules seeding complete!\n")
}

main()
  .catch((e) => {
    console.error("❌ Error seeding domain rules:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
