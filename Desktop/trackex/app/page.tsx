import { BlogSection } from "@/components/landing/blog-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { FinalCTASection } from "@/components/landing/final-cta-section"
import { HeroSection } from "@/components/landing/hero-section"
import { HowItWorksSection } from "@/components/landing/how-it-works"
import { PerfectForSection } from "@/components/landing/perfect-for-section"
import { PricingSection } from "@/components/landing/pricing-section"
import { ProblemSolutionSection } from "@/components/landing/problem-solution-section"
import { SocialProofSection } from "@/components/landing/social-proof-section"
import { TrustSection } from "@/components/landing/trust-section"
import { Footer } from "@/components/layout/footer"
import { Header } from "@/components/layout/header"
import {
  generateFAQSchema,
  generateOrganizationSchema,
  generateProductSchema,
  generateMetadata as generateSEOMetadata,
} from "@/lib/seo"

// Force dynamic rendering to skip static generation error during build
export const dynamic = "force-dynamic"

export const metadata = generateSEOMetadata({
  title: "TrackEx - Remote Employee Monitoring & Productivity Tracking",
  description:
    "Monitor remote employees with real-time app tracking, automatic time tracking, and productivity scoring. Start FREE with 1 employee. $5/seat for teams. Works on Mac & Windows.",
  keywords:
    "remote employee monitoring, productivity tracking, time tracking software, employee monitoring, remote team management, workforce analytics, app usage tracking, virtual assistant monitoring",
})

export default function HomePage() {
  const orgSchema = generateOrganizationSchema()
  const productSchema = generateProductSchema()
  const faqSchema = generateFAQSchema([
    {
      question: "What is TrackEx?",
      answer:
        "TrackEx is a remote employee monitoring software that tracks time, monitors app usage, and measures productivity for distributed teams. It works on both Mac and Windows.",
    },
    {
      question: "Is TrackEx free?",
      answer:
        "Yes! TrackEx offers a free Starter plan for 1 employee with no credit card required. Paid plans start at $5 per employee per month.",
    },
    {
      question: "Does TrackEx capture keystrokes?",
      answer:
        "No. TrackEx is NOT a keylogger. We never capture keystrokes, read emails, or record content. We only track which applications are in use and for how long.",
    },
    {
      question: "How does idle detection work?",
      answer:
        "TrackEx automatically detects when an employee has been inactive for 2 minutes. This time is tracked separately from active work time.",
    },
    {
      question: "Can employees see when they're being monitored?",
      answer:
        "Yes. The TrackEx desktop agent shows a clear indicator when monitoring is active. We believe in transparent monitoring.",
    },
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <HeroSection />
        <SocialProofSection />
        <FeaturesSection />
        <ProblemSolutionSection />
        <HowItWorksSection />
        <PerfectForSection />
        <PricingSection />
        <TrustSection />
        <BlogSection />
        <FinalCTASection />
      </main>

      <Footer />

      {/* Schema.org markup for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </div>
  )
}
