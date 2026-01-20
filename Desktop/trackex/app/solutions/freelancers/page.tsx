import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, AlertTriangle, CheckCircle2, Clock, BarChart3, FileText, ArrowRight, XCircle, Sparkles } from "lucide-react"
import Link from "next/link"
import { generateMetadata as generateSEOMetadata, generateBreadcrumbSchema } from "@/lib/seo"

export const metadata = generateSEOMetadata({
  title: "Free Employee Monitoring for Freelancers - Track 1 Employee Free",
  description: "TrackEx is free for freelancers and solo entrepreneurs. Monitor 1 employee (yourself or your first hire) completely free forever. No credit card required.",
  url: "/solutions/freelancers",
  keywords: "free employee monitoring, freelancer time tracking, solo entrepreneur productivity, free productivity software, self monitoring app",
})

const painPoints = [
  {
    icon: XCircle,
    title: "Can't Afford Expensive Tools",
    description: "Most monitoring software charges $10-20 per user. When you're bootstrapping, every dollar counts.",
  },
  {
    icon: XCircle,
    title: "No Accountability",
    description: "Working alone means no one holds you accountable. It's easy to drift into unproductive habits.",
  },
  {
    icon: XCircle,
    title: "Unclear Time Estimates",
    description: "When clients ask how long a task took, you're guessing. This leads to undercharging or awkward conversations.",
  },
  {
    icon: XCircle,
    title: "First Hire Anxiety",
    description: "You're ready to hire your first VA or contractor, but you're nervous about monitoring them effectively.",
  },
]

const benefits = [
  {
    icon: Sparkles,
    title: "Completely Free",
    description: "TrackEx is 100% free for 1 employee. No trial period, no credit card, no catch. Free forever.",
  },
  {
    icon: Clock,
    title: "Track Your Own Time",
    description: "Use it yourself to understand where your time goes. Improve your productivity with real data.",
  },
  {
    icon: FileText,
    title: "Client Billing Proof",
    description: "Export time reports for clients. Show exactly how you spent billable hours on their projects.",
  },
  {
    icon: BarChart3,
    title: "Self-Accountability",
    description: "Knowing you're being tracked (even by yourself) naturally makes you more productive.",
  },
]

export default function FreelancersPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Solutions", url: "/solutions/freelancers" },
    { name: "Freelancers", url: "/solutions/freelancers" },
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative px-4 py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-background to-background" />
          <div className="absolute top-20 right-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          
          <div className="container mx-auto max-w-4xl text-center relative">
            <Badge variant="secondary" className="mb-6 bg-emerald-500/10 text-emerald-600 border-emerald-200">
              <Sparkles className="w-3 h-3 mr-1" />
              100% Free
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              Free Productivity Tracking
              <br />
              <span className="text-primary">For Freelancers</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              TrackEx is completely free for 1 employee. Perfect for freelancers, solo entrepreneurs, or tracking your first hire.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/login">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/features">See All Features</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              No credit card • No trial period • Free forever
            </p>
          </div>
        </section>

        {/* Free Highlight */}
        <section className="px-4 py-12">
          <div className="container mx-auto max-w-4xl">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 md:p-12 text-center">
              <div className="text-7xl font-bold text-emerald-500 mb-4">$0</div>
              <div className="text-2xl font-semibold mb-2">Forever Free for 1 Employee</div>
              <p className="text-muted-foreground max-w-md mx-auto">
                Not a trial. Not a limited version. The full TrackEx experience, completely free.
              </p>
            </div>
          </div>
        </section>

        {/* Pain Points Section */}
        <section className="px-4 py-16 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 text-red-500 border-red-200">
                <AlertTriangle className="w-3 h-3 mr-1" />
                The Freelancer Struggle
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Solo Doesn't Mean Easy
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Freelancing is freedom, but it comes with challenges that expensive tools don't solve.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {painPoints.map((point) => (
                <div key={point.title} className="bg-card border border-red-100 dark:border-red-900/30 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                      <point.icon className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{point.title}</h3>
                      <p className="text-sm text-muted-foreground">{point.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="px-4 py-16">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <Badge className="mb-4">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Why TrackEx
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                The Free Solution for Freelancers
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Everything you need to track time, prove work, and stay productive.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* When to Upgrade */}
        <section className="px-4 py-16 bg-muted/30">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Grow?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              When you're ready to hire more people, upgrade to the Team plan at just $5/seat/month. No pressure—stay free as long as you want.
            </p>
            <Button variant="outline" asChild>
              <Link href="/pricing">View Team Pricing</Link>
            </Button>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-20 bg-primary">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-primary-foreground">
              Start Tracking Free Today
            </h2>
            <p className="text-xl text-primary-foreground/80 mb-8">
              No credit card. No trial. Just free productivity tracking for freelancers.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/login">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </div>
  )
}
