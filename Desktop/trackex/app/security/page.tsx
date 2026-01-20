import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, Lock, Eye, Database, Server, FileCheck, UserCheck, Globe, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { generateMetadata as generateSEOMetadata, generateBreadcrumbSchema } from "@/lib/seo"

export const metadata = generateSEOMetadata({
  title: "Security & Privacy - How We Protect Your Data",
  description: "Learn how TrackEx protects your data with end-to-end encryption, secure authentication, and GDPR/CCPA compliance. Privacy-first employee monitoring.",
  url: "/security",
  keywords: "trackex security, employee monitoring privacy, data protection, GDPR compliant monitoring, secure employee tracking, encryption",
})

const securityFeatures = [
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description: "All data encrypted in transit with TLS 1.3 and at rest with AES-256.",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: Shield,
    title: "Secure Authentication",
    description: "Passwords hashed with bcrypt. Secure session management with HttpOnly cookies.",
    color: "from-emerald-500 to-emerald-600",
  },
  {
    icon: Eye,
    title: "Privacy-First Design",
    description: "No keystroke logging. No personal activity tracking. Only work metrics.",
    color: "from-violet-500 to-violet-600",
  },
  {
    icon: Database,
    title: "Data Minimization",
    description: "We collect only what's needed for productivity tracking. Nothing more.",
    color: "from-amber-500 to-amber-600",
  },
]

const commitments = [
  {
    icon: Globe,
    title: "GDPR & CCPA Compliant",
    description: "Full compliance with European and California privacy regulations.",
  },
  {
    icon: Server,
    title: "Secure Infrastructure",
    description: "Hosted on enterprise-grade servers with 99.9% uptime guarantee.",
  },
  {
    icon: FileCheck,
    title: "Regular Audits",
    description: "Periodic security assessments and penetration testing.",
  },
  {
    icon: UserCheck,
    title: "Transparent Monitoring",
    description: "Employees always know when and what is being tracked.",
  },
]

const notAKeylogger = [
  "We DO NOT capture keystrokes",
  "We DO NOT read emails or messages",
  "We DO NOT record audio or video",
  "We DO NOT access personal files",
]

export default function SecurityPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Security", url: "/security" },
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative px-4 py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-background to-background" />
          <div className="absolute top-20 right-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
          
          <div className="container mx-auto max-w-4xl text-center relative">
            <Badge variant="secondary" className="mb-6">
              <Shield className="w-3 h-3 mr-1" />
              Privacy-First
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              Security You Can Trust
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Your data security and employee privacy are our top priorities. Here's how we protect you.
            </p>
          </div>
        </section>

        {/* Security Features Grid */}
        <section className="px-4 py-16">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {securityFeatures.map((feature) => {
                const Icon = feature.icon
                return (
                  <div key={feature.title} className="bg-card border border-border rounded-2xl p-6 md:p-8">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Not a Keylogger Section */}
        <section className="px-4 py-16 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <div className="bg-card border-2 border-emerald-500/20 rounded-2xl p-8 md:p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                <Eye className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                TrackEx is <span className="text-emerald-500">NOT</span> a Keylogger
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                We believe monitoring should create accountability, not fear. We only track work-related productivity metrics—nothing invasive.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto text-left">
                {notAKeylogger.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Commitments */}
        <section className="px-4 py-16">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Our Security Commitments</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                A comprehensive approach to keeping your data safe and your team's privacy respected.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {commitments.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Data Handling */}
        <section className="px-4 py-16 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold mb-8 text-center">How We Handle Your Data</h2>
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-2">What We Collect</h3>
                <p className="text-muted-foreground text-sm">
                  Application names, window titles (for categorization), time stamps, idle time, and optional screenshots. That's it.
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-2">Data Retention</h3>
                <p className="text-muted-foreground text-sm">
                  Free plan: 7 days. Team plan: 90 days. Enterprise: Custom. You can request deletion at any time.
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-2">Data Portability</h3>
                <p className="text-muted-foreground text-sm">
                  Export your data anytime in CSV format. Delete your account and all data with one click.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-16">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Have Security Questions?</h2>
            <p className="text-muted-foreground mb-8">
              Our team is happy to discuss security, compliance, or answer any questions you have.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/contact">Contact Us</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/legal/privacy">Read Privacy Policy</Link>
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
