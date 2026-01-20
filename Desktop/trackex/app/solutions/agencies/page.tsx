import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Briefcase, AlertTriangle, CheckCircle2, Clock, BarChart3, Eye, ArrowRight, XCircle, FileText, Users } from "lucide-react"
import Link from "next/link"
import { generateMetadata as generateSEOMetadata, generateBreadcrumbSchema } from "@/lib/seo"

export const metadata = generateSEOMetadata({
  title: "Agency Team Monitoring - Track Contractors & Freelancers",
  description: "Monitor your agency's contractors and freelancers with TrackEx. Verify billable hours, ensure client deliverables, and manage distributed creative teams.",
  url: "/solutions/agencies",
  keywords: "agency team monitoring, contractor tracking, freelancer monitoring, agency productivity software, client billing verification",
})

const painPoints = [
  {
    icon: XCircle,
    title: "Client Billing Disputes",
    description: "Clients question your hours. Without proof, you're stuck defending estimates instead of showing actual work done.",
  },
  {
    icon: XCircle,
    title: "Contractor Accountability",
    description: "You're paying contractors by the hour, but you have no idea how those hours are actually being spent.",
  },
  {
    icon: XCircle,
    title: "Project Overruns",
    description: "Projects consistently go over budget. You can't pinpoint where time is being wasted until it's too late.",
  },
  {
    icon: XCircle,
    title: "Remote Team Chaos",
    description: "Your team is scattered across locations and time zones. Coordination feels impossible without constant check-ins.",
  },
]

const solutions = [
  {
    icon: FileText,
    title: "Client-Ready Reports",
    description: "Export detailed time logs showing exactly what work was done. Perfect for client billing and disputes.",
  },
  {
    icon: Eye,
    title: "Contractor Oversight",
    description: "See what apps contractors are using in real-time. Ensure they're focused on your projects, not side gigs.",
  },
  {
    icon: Clock,
    title: "Accurate Time Tracking",
    description: "Automatic tracking with idle detection means you only bill for actual productive work time.",
  },
  {
    icon: Users,
    title: "Team-Wide Visibility",
    description: "Dashboard shows all team members at once. Quickly spot who's online, who's productive, and who needs help.",
  },
]

const useCases = [
  "Marketing agencies with remote creative teams",
  "Development agencies managing multiple contractors",
  "Design studios with distributed freelancers",
  "Consulting firms tracking billable hours",
  "Outsourcing agencies managing offshore teams",
]

export default function AgenciesPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Solutions", url: "/solutions/agencies" },
    { name: "Agencies", url: "/solutions/agencies" },
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative px-4 py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-background to-background" />
          <div className="absolute top-20 left-20 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          
          <div className="container mx-auto max-w-4xl text-center relative">
            <Badge variant="secondary" className="mb-6">
              <Briefcase className="w-3 h-3 mr-1" />
              For Agencies
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              Prove Every Hour
              <br />
              <span className="text-primary">To Your Clients</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Stop defending billable hours. TrackEx gives you the proof you need to bill with confidence and manage contractors effectively.
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
                The Agency Struggle
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Agency Life Is Hard Enough
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Juggling clients, contractors, and deadlines is chaos. These problems make it worse.
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
                Built for Agency Workflows
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Tools that help you bill accurately, manage contractors, and deliver for clients.
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

        {/* Use Cases */}
        <section className="px-4 py-16 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Perfect For</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {useCases.map((useCase) => (
                <div key={useCase} className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm">{useCase}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="px-4 py-16">
          <div className="container mx-auto max-w-4xl">
            <div className="bg-card border border-border rounded-2xl p-8 md:p-12 text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Simple Pricing for Agencies
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Start free with 1 team member. Add more at $5/seat/month. No contracts, cancel anytime.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link href="/login">Start for Free</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/contact">Contact for Enterprise</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-20 bg-primary">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-primary-foreground">
              Bill With Confidence
            </h2>
            <p className="text-xl text-primary-foreground/80 mb-8">
              Get the proof you need for every billable hour. Your clients will thank you.
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
