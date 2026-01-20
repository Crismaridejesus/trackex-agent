import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, AlertTriangle, CheckCircle2, Clock, BarChart3, Eye, ArrowRight, XCircle, DollarSign, Shield } from "lucide-react"
import Link from "next/link"
import { generateMetadata as generateSEOMetadata, generateBreadcrumbSchema } from "@/lib/seo"

export const metadata = generateSEOMetadata({
  title: "Virtual Assistant Monitoring Software - Track VA Productivity",
  description: "Monitor your virtual assistants with TrackEx. Ensure your VAs are productive, verify billable hours, and get peace of mind knowing work is getting done.",
  url: "/solutions/virtual-assistants",
  keywords: "virtual assistant monitoring, VA tracking software, monitor virtual assistant, VA productivity tracking, virtual assistant time tracking",
})

const painPoints = [
  {
    icon: XCircle,
    title: "Paying for Nothing",
    description: "You're paying hourly rates but have no way to verify if your VA is actually working those hours or browsing social media.",
  },
  {
    icon: XCircle,
    title: "Quality Concerns",
    description: "Tasks take longer than expected, and you can't tell if it's the task complexity or your VA being distracted.",
  },
  {
    icon: XCircle,
    title: "Trust Without Proof",
    description: "You want to trust your VA, but without any visibility, doubts creep in. Are they really working when they say they are?",
  },
  {
    icon: XCircle,
    title: "Communication Gaps",
    description: "Your VA is in a different time zone, making real-time check-ins difficult. You only find out about issues after the fact.",
  },
]

const solutions = [
  {
    icon: Eye,
    title: "See What They're Working On",
    description: "Real-time view of active applications. Know if your VA is in Excel, Slack, or somewhere they shouldn't be.",
  },
  {
    icon: Clock,
    title: "Verify Billable Hours",
    description: "Automatic time tracking with idle detection. Pay only for actual productive work time, not claimed hours.",
  },
  {
    icon: BarChart3,
    title: "Productivity Reports",
    description: "Daily and weekly reports showing exactly how time was spent. No more guessing about VA productivity.",
  },
  {
    icon: Shield,
    title: "Build Trust Transparently",
    description: "VAs know they're being monitored. Good VAs love it—it proves they're doing great work.",
  },
]

const testimonial = {
  quote: "I was skeptical about my VA's hours. TrackEx showed me she was actually working 20% more than billed. Now I pay her fairly and trust her completely.",
  author: "Mike R.",
  role: "E-commerce Business Owner",
}

export default function VirtualAssistantsPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Solutions", url: "/solutions/virtual-assistants" },
    { name: "Virtual Assistants", url: "/solutions/virtual-assistants" },
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative px-4 py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-background to-background" />
          <div className="absolute top-20 right-20 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          
          <div className="container mx-auto max-w-4xl text-center relative">
            <Badge variant="secondary" className="mb-6">
              <Users className="w-3 h-3 mr-1" />
              For VA Management
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              Know Your VA Is
              <br />
              <span className="text-primary">Actually Working</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Stop wondering if you're paying for real work. TrackEx gives you proof of productivity so you can trust your virtual assistants with confidence.
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
                The VA Management Problem
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Every VA Client Worries About This
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                You hired a VA to save time. But now you spend time worrying if they're actually productive.
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
                How TrackEx Helps VA Clients
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Get the visibility you need to pay fairly and trust completely.
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

        {/* Testimonial */}
        <section className="px-4 py-16 bg-muted/30">
          <div className="container mx-auto max-w-3xl">
            <div className="bg-card border border-border rounded-2xl p-8 md:p-12 text-center">
              <DollarSign className="h-12 w-12 text-primary mx-auto mb-6" />
              <blockquote className="text-xl md:text-2xl font-medium mb-6 leading-relaxed">
                "{testimonial.quote}"
              </blockquote>
              <div>
                <div className="font-semibold">{testimonial.author}</div>
                <div className="text-sm text-muted-foreground">{testimonial.role}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Highlight */}
        <section className="px-4 py-16">
          <div className="container mx-auto max-w-4xl">
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-4">
                    Perfect for 1 VA?
                    <br />
                    <span className="text-primary">It's Free.</span>
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    If you have just one virtual assistant, TrackEx is completely free. No credit card required. No trial period. Free forever.
                  </p>
                  <Button size="lg" asChild>
                    <Link href="/login">Start for Free</Link>
                  </Button>
                </div>
                <div className="text-center">
                  <div className="text-6xl font-bold text-primary mb-2">$0</div>
                  <div className="text-muted-foreground">for 1 virtual assistant</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-20 bg-primary">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-primary-foreground">
              Start Trusting Your VA Today
            </h2>
            <p className="text-xl text-primary-foreground/80 mb-8">
              Get the proof you need to pay fairly and trust completely. Setup takes 2 minutes.
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
