import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { generateMetadata as generateSEOMetadata, generateOrganizationSchema, generateBreadcrumbSchema } from "@/lib/seo"

export const metadata = generateSEOMetadata({
  title: "About Us - Our Mission to Simplify Remote Work",
  description: "Learn about TrackEx's mission to provide simple, privacy-first remote employee monitoring software. Built by a remote team, for remote teams.",
  url: "/about",
  keywords: "about trackex, remote monitoring company, employee tracking software company, privacy-first monitoring, remote work software",
})

export default function AboutPage() {
  const orgSchema = generateOrganizationSchema()
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "About", url: "/about" },
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-4 py-20 md:py-28">
          <div className="container mx-auto max-w-3xl text-center">
            <p className="text-primary font-medium mb-4">About TrackEx</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              Built by a Remote Team,
              <br />
              For Remote Teams
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We know the challenges of remote work because we live them every day. 
              TrackEx was built to give managers visibility without creating a surveillance culture.
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="px-4 py-16 bg-muted/30">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold mb-6">Our Mission</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Most employee monitoring tools are either too complicated or too invasive. 
                Enterprise solutions overwhelm teams with features nobody asked for. 
                Cheap alternatives feel like spyware.
              </p>
              <p>
                We built TrackEx to be different. Simple time tracking. App monitoring. 
                Productivity insights. That's it—no bloat, no invasive tactics.
              </p>
              <p>
                Our goal is to help remote teams stay productive and accountable while 
                respecting employee privacy. Good monitoring creates trust, not fear.
              </p>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="px-4 py-16">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold mb-8">What We Believe</h2>
            <div className="space-y-8">
              <div>
                <h3 className="font-semibold mb-2">Simplicity over features</h3>
                <p className="text-muted-foreground">
                  Every feature earns its place by solving a real problem. We resist feature bloat and focus on what actually matters.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Privacy is non-negotiable</h3>
                <p className="text-muted-foreground">
                  No keystroke logging. No reading emails. No invasive tracking. Employees should know exactly what's being monitored.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Transparency builds trust</h3>
                <p className="text-muted-foreground">
                  No hidden fees, no dark patterns, no surprise charges. What you see is what you get.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Free should mean free</h3>
                <p className="text-muted-foreground">
                  We offer a free tier because we remember bootstrapping. One employee, completely free, forever. No credit card required.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-20 bg-primary">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold mb-4 text-primary-foreground">
              Ready to Try TrackEx?
            </h2>
            <p className="text-primary-foreground/80 mb-8">
              Start monitoring your remote team for free. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/login">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline-light" asChild>
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </div>
  )
}
