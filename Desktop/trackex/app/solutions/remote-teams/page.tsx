import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Globe, AlertTriangle, CheckCircle2, Users, Clock, BarChart3, Eye, ArrowRight, XCircle } from "lucide-react"
import Link from "next/link"
import { generateMetadata as generateSEOMetadata, generateBreadcrumbSchema } from "@/lib/seo"

export const metadata = generateSEOMetadata({
  title: "Remote Team Monitoring Software - TrackEx for Distributed Teams",
  description: "Monitor your remote employees with TrackEx. Real-time app tracking, productivity insights, and time management for distributed teams across multiple time zones.",
  url: "/solutions/remote-teams",
  keywords: "remote team monitoring, distributed team management, remote employee tracking, work from home monitoring, remote workforce management",
})

const painPoints = [
  {
    icon: XCircle,
    title: "No Visibility",
    description: "You have no idea what your remote employees are actually doing during work hours. Are they working or watching Netflix?",
  },
  {
    icon: XCircle,
    title: "Time Zone Chaos",
    description: "Managing employees across different time zones makes it impossible to know who's online and when work is getting done.",
  },
  {
    icon: XCircle,
    title: "Trust Issues",
    description: "Without in-person oversight, it's hard to build trust. You find yourself constantly wondering if work is actually happening.",
  },
  {
    icon: XCircle,
    title: "Productivity Guessing",
    description: "You can't measure what you can't see. Remote work makes it nearly impossible to identify top performers vs. underperformers.",
  },
]

const solutions = [
  {
    icon: Eye,
    title: "Real-Time Visibility",
    description: "See exactly which apps your team is using right now. Know who's working on productive tasks and who might need support.",
  },
  {
    icon: Clock,
    title: "Automatic Time Tracking",
    description: "Clock-in/out with one click. Idle time detected automatically. No more manual timesheets or guesswork.",
  },
  {
    icon: BarChart3,
    title: "Productivity Insights",
    description: "Apps are categorized as productive, neutral, or unproductive. Get clear productivity percentages for every team member.",
  },
  {
    icon: Users,
    title: "Team Comparisons",
    description: "Compare productivity across team members. Identify who's crushing it and who might need additional support or training.",
  },
]

export default function RemoteTeamsPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Solutions", url: "/solutions/remote-teams" },
    { name: "Remote Teams", url: "/solutions/remote-teams" },
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
              <Globe className="w-3 h-3 mr-1" />
              For Remote Teams
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              Finally Know What Your
              <br />
              <span className="text-primary">Remote Team Is Doing</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Stop guessing. Start knowing. TrackEx gives you complete visibility into your distributed workforce—without micromanaging.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/login">
                  Start for Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/features">See All Features</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Pain Points Section */}
        <section className="px-4 py-16 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 text-red-500 border-red-200">
                <AlertTriangle className="w-3 h-3 mr-1" />
                The Remote Work Challenge
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Sound Familiar?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Managing remote teams is harder than it looks. These challenges are costing you time, money, and peace of mind.
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

        {/* Solutions Section */}
        <section className="px-4 py-16">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <Badge className="mb-4">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                TrackEx Solution
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                How TrackEx Solves This
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Simple tools that give you the visibility you need without creating a surveillance culture.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {solutions.map((solution) => (
                <div key={solution.title} className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <solution.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{solution.title}</h3>
                      <p className="text-sm text-muted-foreground">{solution.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="px-4 py-16 bg-primary">
          <div className="container mx-auto max-w-4xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-primary-foreground mb-2">47%</div>
                <div className="text-sm text-primary-foreground/70">Avg. productivity increase</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary-foreground mb-2">3.2h</div>
                <div className="text-sm text-primary-foreground/70">Saved per employee/week</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary-foreground mb-2">2min</div>
                <div className="text-sm text-primary-foreground/70">Setup time</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary-foreground mb-2">$0</div>
                <div className="text-sm text-primary-foreground/70">To start (1 employee free)</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-20">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Transform Your Remote Team?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of managers who finally have visibility into their remote workforce. Start free today.
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
            <p className="text-sm text-muted-foreground mt-6">
              No credit card required • Free for 1 employee forever
            </p>
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
