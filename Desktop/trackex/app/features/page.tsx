import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Activity, Camera, BarChart3, Users, Laptop, Shield, Zap, Download, CheckCircle2, ArrowRight } from "lucide-react"
import Link from "next/link"
import { generateMetadata as generateSEOMetadata, generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo"

export const metadata = generateSEOMetadata({
  title: "Features - Complete Remote Employee Monitoring Tools",
  description: "Discover TrackEx features: real-time app monitoring, automatic time tracking, productivity scoring, screenshot capture, and detailed analytics. Built for remote teams on Mac & Windows.",
  url: "/features",
  keywords: "remote employee monitoring features, app tracking software, productivity monitoring tools, time tracking features, screenshot monitoring, employee analytics",
})

const features = [
  {
    id: "time-tracking",
    icon: Clock,
    title: "Automatic Time Tracking",
    subtitle: "Never lose track of work hours again",
    description: "Employees clock in with one click and TrackEx handles the rest. Idle time is automatically detected after 2 minutes of inactivity, giving you accurate work hour reports without manual input.",
    highlights: [
      "One-click clock in/out",
      "Automatic idle detection",
      "Detailed time logs",
      "Export reports for payroll",
    ],
    color: "from-blue-500 to-blue-600",
  },
  {
    id: "app-monitoring",
    icon: Activity,
    title: "Real-Time App Monitoring",
    subtitle: "See exactly what your team is working on",
    description: "Get instant visibility into which applications and websites your team uses throughout the day. Understand where time goes and identify opportunities to improve productivity.",
    highlights: [
      "Live application tracking",
      "Historical usage data",
      "App categorization",
      "Usage trends & patterns",
    ],
    color: "from-emerald-500 to-emerald-600",
  },
  {
    id: "productivity",
    icon: BarChart3,
    title: "Productivity Scoring",
    subtitle: "AI-powered insights into team performance",
    description: "Applications are automatically categorized as productive, neutral, or unproductive. Get clear productivity percentages for each team member without subjective guesswork.",
    highlights: [
      "Automatic app categorization",
      "Productivity percentages",
      "Team comparisons",
      "Custom categories",
    ],
    color: "from-violet-500 to-violet-600",
  },
  {
    id: "screenshots",
    icon: Camera,
    title: "Screenshot Capture",
    subtitle: "Optional visual verification",
    description: "Take periodic screenshots to verify work activity. Fully configurable—turn it on or off, adjust frequency, and employees always know when it's active. Privacy-first design.",
    highlights: [
      "Configurable intervals",
      "On-demand captures",
      "Employee notification",
      "Team plan feature",
    ],
    color: "from-amber-500 to-amber-600",
  },
  {
    id: "reports",
    icon: Users,
    title: "Team Analytics",
    subtitle: "Data-driven management decisions",
    description: "Comprehensive reports showing work patterns, top applications, productivity trends, and team comparisons. Export data for meetings, payroll, or client billing.",
    highlights: [
      "Individual & team reports",
      "Trend analysis",
      "Export to CSV",
      "Custom date ranges",
    ],
    color: "from-rose-500 to-rose-600",
  },
  {
    id: "cross-platform",
    icon: Laptop,
    title: "Cross-Platform Support",
    subtitle: "Works on Mac and Windows",
    description: "Native desktop agents for both macOS and Windows ensure consistent tracking regardless of your team's hardware. Lightweight, battery-efficient, and automatic updates.",
    highlights: [
      "macOS native app",
      "Windows native app",
      "Low resource usage",
      "Auto-updates",
    ],
    color: "from-cyan-500 to-cyan-600",
  },
]

const additionalFeatures = [
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level TLS 1.3 encryption in transit and AES-256 at rest. Your data is always protected.",
  },
  {
    icon: Zap,
    title: "2-Minute Setup",
    description: "Download the agent, install, and start tracking. No IT department needed.",
  },
  {
    icon: Download,
    title: "Easy Installation",
    description: "Lightweight agent installs in seconds. Under 100MB and runs silently in background.",
  },
]

export default function FeaturesPage() {
  const pageSchema = generateWebPageSchema({
    title: "TrackEx Features - Remote Employee Monitoring Tools",
    description: "Complete feature list for TrackEx remote employee monitoring software",
    url: "/features",
  })
  
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Features", url: "/features" },
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative px-4 py-20 md:py-28 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          
          <div className="container mx-auto max-w-4xl text-center relative">
            <Badge variant="secondary" className="mb-6">
              6 Core Features • No Bloat
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              Everything You Need,
              <br />
              <span className="text-primary">Nothing You Don't</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Simple, powerful tools for monitoring remote teams. Each feature designed to give you clarity without overwhelming your workflow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/login">
                  Start for Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-4 py-20">
          <div className="container mx-auto max-w-6xl">
            <div className="space-y-24">
              {features.map((feature, index) => {
                const Icon = feature.icon
                const isEven = index % 2 === 0
                
                return (
                  <div 
                    key={feature.id} 
                    id={feature.id}
                    className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${!isEven ? 'lg:flex-row-reverse' : ''}`}
                  >
                    {/* Content */}
                    <div className={!isEven ? 'lg:order-2' : ''}>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <h2 className="text-3xl md:text-4xl font-bold mb-3">{feature.title}</h2>
                      <p className="text-lg text-primary font-medium mb-4">{feature.subtitle}</p>
                      <p className="text-muted-foreground mb-6 leading-relaxed">{feature.description}</p>
                      <ul className="grid grid-cols-2 gap-3">
                        {feature.highlights.map((item) => (
                          <li key={item} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Illustration */}
                    <div className={!isEven ? 'lg:order-1' : ''}>
                      <div className="relative">
                        <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-10 rounded-3xl blur-2xl`} />
                        <div className="relative bg-card border border-border rounded-2xl p-8 md:p-12">
                          {/* Mock UI */}
                          <div className="bg-muted rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                                <Icon className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <div className="h-3 w-24 bg-foreground/20 rounded" />
                                <div className="h-2 w-16 bg-foreground/10 rounded mt-1" />
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="h-8 bg-background rounded-lg border border-border" />
                              <div className="grid grid-cols-2 gap-3">
                                <div className="h-16 bg-background rounded-lg border border-border" />
                                <div className="h-16 bg-background rounded-lg border border-border" />
                              </div>
                              <div className="h-6 w-3/4 bg-primary/20 rounded" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Additional Features */}
        <section className="px-4 py-20 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Plus Everything Else You Need</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Built-in security, fast setup, and easy installation make TrackEx the simplest way to monitor your remote team.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {additionalFeatures.map((feature) => {
                const Icon = feature.icon
                return (
                  <div key={feature.title} className="bg-card border border-border rounded-xl p-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-20 bg-primary">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-primary-foreground">
              Ready to See It in Action?
            </h2>
            <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Start monitoring your remote team for free. No credit card required for 1 employee.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/login">Start for Free</Link>
              </Button>
              <Button size="lg" variant="outline-light" asChild>
                <Link href="/contact">Contact Sales</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </div>
  )
}
