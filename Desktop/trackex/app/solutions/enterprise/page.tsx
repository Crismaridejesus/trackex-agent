import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, CheckCircle2, Shield, Server, Users, Code, Headphones, FileText, ArrowRight } from "lucide-react"
import Link from "next/link"
import { generateMetadata as generateSEOMetadata, generateBreadcrumbSchema } from "@/lib/seo"

export const metadata = generateSEOMetadata({
  title: "Enterprise Employee Monitoring - Custom Solutions & API Access",
  description: "TrackEx Enterprise offers custom solutions for large organizations. API access, dedicated support, SLA guarantees, and volume discounts. Contact us for pricing.",
  url: "/solutions/enterprise",
  keywords: "enterprise employee monitoring, corporate workforce tracking, enterprise time tracking, API employee monitoring, large scale team management",
})

const features = [
  {
    icon: Code,
    title: "API Access",
    description: "Full API access for custom integrations with your existing tools and workflows.",
  },
  {
    icon: Server,
    title: "Custom Deployment",
    description: "On-premise deployment options available for organizations with strict data requirements.",
  },
  {
    icon: Headphones,
    title: "Dedicated Support",
    description: "A dedicated account manager and priority support with guaranteed response times.",
  },
  {
    icon: FileText,
    title: "SLA Guarantee",
    description: "Enterprise-grade SLA with 99.9% uptime guarantee and compensation for downtime.",
  },
  {
    icon: Shield,
    title: "Advanced Security",
    description: "SOC 2 compliance, custom data retention policies, and audit logs for compliance.",
  },
  {
    icon: Users,
    title: "Volume Discounts",
    description: "Significant discounts for large teams. The more employees, the better the rate.",
  },
]

const useCases = [
  "Large corporations with 100+ remote employees",
  "Enterprises requiring API integrations",
  "Organizations needing on-premise deployment",
  "Companies with strict compliance requirements",
  "Businesses requiring dedicated support",
]

export default function EnterprisePage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Solutions", url: "/solutions/enterprise" },
    { name: "Enterprise", url: "/solutions/enterprise" },
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative px-4 py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
          
          <div className="container mx-auto max-w-4xl text-center relative">
            <Badge variant="secondary" className="mb-6 bg-white/10 text-white border-white/20">
              <Building2 className="w-3 h-3 mr-1" />
              Enterprise
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight text-white">
              TrackEx for
              <br />
              <span className="text-primary">Enterprise</span>
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Custom solutions for large organizations. API access, dedicated support, and enterprise-grade security for your workforce monitoring needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100" asChild>
                <Link href="/contact">
                  Contact Sales
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline-light" asChild>
                <Link href="/features">See All Features</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-4 py-16">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Enterprise Features
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Everything in the Team plan, plus enterprise-grade capabilities.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div key={feature.title} className="bg-card border border-border rounded-xl p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
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
              <p className="text-muted-foreground">
                Enterprise plan is ideal for organizations with specific requirements.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Custom Pricing
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Enterprise pricing is tailored to your organization's size and needs. Contact our sales team for a custom quote.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link href="/contact">Contact Sales</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/pricing">See Standard Pricing</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* What to Expect */}
        <section className="px-4 py-16 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold mb-8 text-center">What to Expect</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-xl font-bold text-primary">1</div>
                <h3 className="font-semibold mb-2">Discovery Call</h3>
                <p className="text-sm text-muted-foreground">We'll learn about your organization and specific requirements.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-xl font-bold text-primary">2</div>
                <h3 className="font-semibold mb-2">Custom Proposal</h3>
                <p className="text-sm text-muted-foreground">Receive a tailored solution and pricing based on your needs.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-xl font-bold text-primary">3</div>
                <h3 className="font-semibold mb-2">Onboarding</h3>
                <p className="text-sm text-muted-foreground">Dedicated support to get your entire organization up and running.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-20 bg-primary">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-primary-foreground">
              Let's Talk About Your Needs
            </h2>
            <p className="text-xl text-primary-foreground/80 mb-8">
              Our enterprise team is ready to build a solution that works for your organization.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/contact">
                Contact Enterprise Sales
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
