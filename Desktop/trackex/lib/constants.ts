export const APP_NAME = "TrackEx"
export const APP_TAGLINE = "See Everything. Build Trust. Boost Productivity."
export const APP_DESCRIPTION =
  "The intelligent remote workforce monitoring platform that helps managers understand exactly how remote teams spend their time. Track productivity, detect distractions, and build accountability—all while respecting employee privacy."

export const SEO = {
  title: "TrackEx - Remote Employee Monitoring & Productivity Tracking",
  description:
    "Monitor remote employees with real-time app tracking, productivity insights, and optional screenshots. Start FREE with 1 employee. $5/seat for teams. Works on Mac & Windows.",
  keywords:
    "remote employee monitoring, productivity tracking, time tracking software, employee monitoring, remote team management, workforce analytics, app usage tracking",
  url: "https://trackex.app",
  image: "/og-image.png",
}

export const FEATURES = [
  {
    title: "Apps & Web Activity",
    description:
      "Track application and website usage to understand how time is spent across your team.",
    icon: "Monitor",
  },
  {
    title: "Real-Time Activity Tracking",
    description:
      "See exactly what apps and websites your team uses as they work. Instant visibility into productive vs unproductive time.",
    icon: "Activity",
  },
  {
    title: "Smart Idle Detection",
    description:
      "Automatically detects when employees step away. Accurate work time tracking without manual input.",
    icon: "Clock",
  },
  {
    title: "Productivity Scoring",
    description:
      "AI-powered categorization of apps as productive, neutral, or distracting. Get instant productivity percentages.",
    icon: "TrendingUp",
  },
  {
    title: "Custom App Rules",
    description:
      "Define your own productivity rules with flexible matching patterns. Categorize any app or website to fit your team's workflow.",
    icon: "Settings",
  },
  {
    title: "Optional Screenshots",
    description:
      "Periodic screen captures for accountability. Fully configurable intervals and completely optional.",
    icon: "Camera",
  },
  {
    title: "Detailed Analytics",
    description:
      "Daily, weekly, and monthly reports showing work patterns, top apps, and productivity trends.",
    icon: "BarChart3",
  },
  {
    title: "Team & Policy Management",
    description:
      "Organize employees into teams with custom policies. Configure work hours, idle thresholds, and privacy settings per team or individual.",
    icon: "Users",
  },
  {
    title: "Cross-Platform Agent",
    description:
      "Lightweight desktop agent for macOS and Windows. Silent background operation with minimal resource usage.",
    icon: "Laptop",
  },
]

export const PRICING = {
  starter: {
    name: "Free",
    price: 0,
    maxEmployees: 1,
    features: [
      "1 employee included",
      "Real-time app monitoring",
      "Productivity scoring",
      "Basic analytics & reports",
      "Idle time detection",
      "Mac & Windows support",
      "No credit card required",
    ],
    limitations: [
      "Manual screenshots only",
      "Limited historical data (7 days)",
      "Basic support only",
    ],
  },
  team: {
    name: "Team",
    price: 5,
    perEmployee: true,
    features: [
      "Everything in Free",
      "Unlimited employees",
      "On-demand screenshots",
      "90-day data retention",
      "Advanced productivity reports",
      "Team comparisons & insights",
      "Priority email support",
      "Custom app categorization",
    ],
  },
  autoScreenshots: {
    name: "Auto Screenshots",
    price: 1.5,
    perEmployee: true,
    description: "Automatic screenshots every 30 minutes (minimum interval)",
    code: "AUTO_SCREENSHOTS",
    monthlyPrice: 150, // $1.50 in cents per seat
    pricingType: "PER_LICENSE",
  },
  currency: "USD",
  // Stripe price IDs (configured via environment variables)
  stripePriceIds: {
    seat: process.env.STRIPE_SEAT_PRICE_ID || "",
    autoScreenshots: process.env.STRIPE_AUTO_SCREENSHOTS_PRICE_ID || "",
  },
  // Tier configurations with full details
  tiers: {
    STARTER: {
      name: "Free",
      monthlyPrice: 0,
      minSeats: 1,
      maxSeats: 1,
      dataRetentionDays: 7,
      features: [
        "Real-time activity tracking",
        "App usage monitoring",
        "Productivity scoring",
        "Basic reports",
        "7-day data retention",
        "Manual screenshots only",
        "Email support",
      ],
      stripePriceId: null,
    },
    TEAM: {
      name: "Team",
      monthlyPrice: 500, // $5 in cents per seat
      minSeats: 1,
      maxSeats: 10000,
      dataRetentionDays: 90,
      features: [
        "Everything in Free tier",
        "Unlimited employees",
        "On-demand screenshots",
        "90-day data retention",
        "Advanced reports",
        "Team comparisons",
        "Priority support",
        "Custom categorization",
      ],
      stripePriceId: process.env.STRIPE_SEAT_PRICE_ID || "",
    },
  } as Record<
    string,
    {
      name: string
      monthlyPrice: number
      minSeats: number
      maxSeats: number
      dataRetentionDays: number
      features: string[]
      stripePriceId: string | null
    }
  >,
  // Add-on configurations
  addOns: {
    AUTO_SCREENSHOTS: {
      code: "AUTO_SCREENSHOTS",
      name: "Auto Screenshots",
      description: "Automatic screenshots every 30 minutes (minimum interval)",
      monthlyPrice: 150, // $1.50 in cents per seat
      pricingType: "PER_LICENSE",
      stripePriceId: process.env.STRIPE_AUTO_SCREENSHOTS_PRICE_ID || "",
    },
  } as Record<
    string,
    {
      code: string
      name: string
      description: string
      monthlyPrice: number
      pricingType: string
      stripePriceId: string
    }
  >,
  // Billing cycle options
  billingCycles: {
    MONTHLY: {
      name: "Monthly",
      discountPercent: 0,
    },
  } as Record<string, { name: string; discountPercent: number }>,
}

// Free license configuration
export const FREE_LICENSE = {
  quota: 1,
  expirationDays: null, // Free licenses don't expire
  allowMultiple: false,
}

export const TRUST_INDICATORS = [
  "2-minute setup",
  "No credit card for free plan",
  "Mac & Windows",
  "GDPR compliant",
]

export const TESTIMONIALS = [
  {
    quote:
      "Finally found a tool that shows exactly what my remote VAs are doing. No more guessing if they're actually working.",
    author: "Sarah M.",
    role: "Agency Owner",
    rating: 5,
  },
  {
    quote:
      "We caught an employee gaming during work hours. TrackEx paid for itself in one day.",
    author: "Michael R.",
    role: "Startup Founder",
    rating: 5,
  },
  {
    quote:
      "Simple, effective, and my team doesn't feel micromanaged. The productivity insights are invaluable.",
    author: "Jessica L.",
    role: "Operations Manager",
    rating: 5,
  },
]

export const BLOG_POSTS = [
  {
    title: "5 Signs Your Remote Employee Isn't Actually Working",
    excerpt:
      "Discover the telltale signs of remote work fraud and how to address them professionally.",
    slug: "signs-remote-employee-not-working",
    category: "Management",
    readTime: "5 min",
    image: "/blog/remote-work.jpg",
  },
  {
    title: "How to Build Trust with Remote Teams",
    excerpt:
      "Transparency goes both ways. Learn how monitoring actually improves team relationships.",
    slug: "build-trust-remote-teams",
    category: "Culture",
    readTime: "4 min",
    image: "/blog/trust.jpg",
  },
  {
    title: "The Real Cost of Unproductive Employees",
    excerpt:
      "Calculate how much distracted work time is costing your business and how to fix it.",
    slug: "cost-unproductive-employees",
    category: "Business",
    readTime: "6 min",
    image: "/blog/productivity.jpg",
  },
]

export const STATS = [
  { value: "47%", label: "Average productivity increase" },
  { value: "3.2hrs", label: "Saved per employee weekly" },
  { value: "2min", label: "Setup time" },
  { value: "99.9%", label: "Uptime guarantee" },
]

// ================================
// TRIAL CONFIGURATION
// ================================

export const TRIAL = {
  durationDays: 30,
  maxEmployees: 1,
  defaultTier: "STARTER" as const,
  features: [
    "1 employee included",
    "Real-time app monitoring",
    "Productivity scoring",
    "Basic analytics & reports",
    "Idle time detection",
  ],
}

// ================================
// PRICING TYPES (Simplified for Stripe)
// ================================

export type PricingTier = "STARTER" | "TEAM"
export type BillingCycle = "MONTHLY"

// ================================
// SIMPLIFIED PRICING CONFIGURATION (Stripe)
// ================================

// ================================
// PRICING HELPER FUNCTIONS
// ================================

/**
 * Get Stripe price ID for a tier
 */
export function getStripePriceId(tier: PricingTier): string | null {
  const tierConfig = PRICING.tiers[tier]
  if (!tierConfig) return null
  return tierConfig.stripePriceId || null
}

/**
 * Get Stripe price ID for an add-on
 */
export function getAddOnStripePriceId(addOnCode: string): string | null {
  const addOnConfig = PRICING.addOns[addOnCode]
  if (!addOnConfig) return null
  return addOnConfig.stripePriceId || null
}

/**
 * Calculate price per seat for a tier (in cents)
 */
export function calculatePricePerSeat(tier: PricingTier): number {
  const tierConfig = PRICING.tiers[tier]
  if (!tierConfig) return 0
  return tierConfig.monthlyPrice
}

/**
 * Calculate add-on price (in cents)
 */
export function calculateAddOnPrice(
  addOnCode: string,
  quantity: number = 1
): number {
  const addOnConfig = PRICING.addOns[addOnCode]
  if (!addOnConfig) return 0

  if (addOnConfig.pricingType === "PER_LICENSE") {
    return addOnConfig.monthlyPrice * quantity
  }
  return addOnConfig.monthlyPrice
}

/**
 * Validate tier seat requirements
 */
export function validateTierMinimum(
  tier: PricingTier,
  quantity: number
): { valid: boolean; message?: string } {
  const tierConfig = PRICING.tiers[tier]
  if (!tierConfig) {
    return { valid: false, message: `Invalid tier: ${tier}` }
  }

  if (quantity < tierConfig.minSeats) {
    return {
      valid: false,
      message: `${tierConfig.name} requires at least ${tierConfig.minSeats} seat${tierConfig.minSeats > 1 ? "s" : ""}`,
    }
  }

  if (tierConfig.maxSeats && quantity > tierConfig.maxSeats) {
    return {
      valid: false,
      message: `${tierConfig.name} allows maximum ${tierConfig.maxSeats} seat${tierConfig.maxSeats > 1 ? "s" : ""}`,
    }
  }

  return { valid: true }
}

/**
 * Format price in cents to currency string
 */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

// Legacy function aliases for backward compatibility
export const getFanbasisPriceId = getStripePriceId
export const getAddOnFanbasisPriceId = getAddOnStripePriceId
