import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, AlertTriangle, CheckCircle2, Clock, BarChart3, Camera, ArrowRight, XCircle, TrendingUp, Shield } from "lucide-react"
import Link from "next/link"
import { generateMetadata as generateSEOMetadata, generateBreadcrumbSchema } from "@/lib/seo"

export const metadata = generateSEOMetadata({
  title: "Small Team Monitoring Software - $5/seat for Growing Teams",
  description: "TrackEx helps small teams stay productive as they grow. Real-time monitoring, screenshots, and analytics at just $5/seat/month. Perfect for 2-50 employees.",
  url: "/solutions/small-teams",
  keywords: "small team monitoring, startup employee tracking, growing team productivity, affordable team monitoring, small business time tracking",
})

const painPoints = [
  {
    icon: XCircle,
    title: "Growing Pains",
    description: "What worked with 3 people doesn't work with 10. You're losing visibility as your team expands.",
  },
  {
    icon: XCircle,
    title: "Inconsistent Productivity",
    description: "Some team members are crushing it while others... you're not sure. But you can't prove anything.",
  },
  {
    icon: XCircle,
    title: "Enterprise Tools Too Expensive",
    description: "Big monitoring solutions cost $15-25/user. At your size, that's a significant monthly expense.",
  },
  {
    icon: XCircle,
    title: "Manual Management Doesn't Scale",
    description: "You can't personally check in with everyone anymore. You need systems, not more meetings.",
  },
]

const features = [
  {
    icon: Users,
    title: "Team Dashboard",
    description: "See everyone's status at a glance. Who's online, who's productive, who might need help.",
  },
  {
    icon: Camera,
    title: "Screenshots Included",
    description: "Periodic screenshots come with the Team plan. Verify work is happening without constant check-ins.",
  },
  {
    icon: BarChart3,
    title: "Team Analytics",
    description: "Compare productivity across team members. Identify patterns and optimize your workflows.",
  },
  {
    icon: TrendingUp,
    title: "90-Day History",
    description: "Keep 90 days of productivity data. Track trends, identify improvements, and make data-driven decisions.",
  },
]

const pricing = {
  perSeat: 5,
  features: [
    "All monitoring features",
    "Screenshot capture",
    "90-day data retention",
    "Team analytics",
    "Priority support",
  ],
}

export default function SmallTeamsPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Solutions", url: "/solutions/small-teams" },
    { name: "Small Teams", url: "/solutions/small-teams" },
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative px-4 py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-background to-background" />
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          
          <div className="container mx-auto max-w-4xl text-center relative">
            <Badge variant="secondary" className="mb-6">
              <Users className="w-3 h-3 mr-1" />
              For Growing Teams
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              Scale Your Team
              <br />
              <span className="text-primary">Without Losing Visibility</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              As your team grows, TrackEx keeps you in the loop. Real-time monitoring, screenshots, and analytics at just $5/seat/month.
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

        {/* Pricing Highlight */}
        <section className="px-4 py-12">
          <div className="container mx-auto max-w-4xl">
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="text-5xl font-bold text-primary mb-2">${pricing.perSeat}</div>
                  <div className="text-xl font-semibold mb-4">per seat / month</div>
                  <ul className="space-y-2">
                    {pricing.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground mb-4">Example: 10-person team</div>
                  <div className="text-4xl font-bold mb-2">$50/month</div>
                  <div className="text-sm text-muted-foreground">That's less than a team lunch</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pain Points Section */}
        <section className="px-4 py-16 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 text-red-500 border-red-200">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Growing Team Challenges
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Growth Creates Blind Spots
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                The bigger your team, the harder it is to know what's really happening.
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

        {/* Features Section */}
        <section className="px-4 py-16">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <Badge className="mb-4">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Team Plan Features
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything You Need to Scale
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                The Team plan gives you visibility into your entire workforce.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature) => (
                <div key={feature.title} className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security Note */}
        <section className="px-4 py-16 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <div className="bg-card border border-border rounded-2xl p-8 md:p-12">
              <div className="flex items-start gap-6">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Privacy-First Monitoring</h3>
                  <p className="text-muted-foreground">
                    TrackEx is NOT a keylogger. We don't capture keystrokes, read emails, or track personal activity. 
                    Just app usage, time tracking, and optional screenshots. Your team will appreciate the transparency.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-20 bg-primary">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-primary-foreground">
              Start Growing With Confidence
            </h2>
            <p className="text-xl text-primary-foreground/80 mb-8">
              Get visibility into your team at just $5/seat/month. Try free with 1 employee first.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/login">
                  Start for Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline-light" asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
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
