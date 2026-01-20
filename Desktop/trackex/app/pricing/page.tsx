import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { PricingSection } from "@/components/landing/pricing-section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { generateMetadata as generateSEOMetadata, generateProductSchema, generateFAQSchema, generateBreadcrumbSchema } from "@/lib/seo"
import { HelpCircle, MessageCircle } from "lucide-react"
import Link from "next/link"

export const metadata = generateSEOMetadata({
  title: "Pricing - Free for 1 Employee, $5/seat for Teams",
  description: "Simple, transparent pricing for remote employee monitoring. Start FREE with 1 employee, no credit card required. Scale to unlimited employees for $5/seat/month. Enterprise plans available.",
  url: "/pricing",
  keywords: "trackex pricing, employee monitoring cost, remote tracking software price, productivity software pricing, free employee monitoring",
})

const faqs = [
  {
    question: "Is TrackEx really free?",
    answer: "Yes! The Starter plan is completely free for 1 employee forever. No credit card required, no trial period—it's free as long as you need it.",
  },
  {
    question: "What happens when I add more employees?",
    answer: "When you need to add more than 1 employee, you can upgrade to the Team plan at $5 per employee per month. You only pay for the employees you add.",
  },
  {
    question: "Can I get automatic screenshots?",
    answer: "Yes! The Team plan includes hourly screenshots. For more frequent 30-minute screenshots, add $1.50 per employee per month.",
  },
  {
    question: "Is there a free trial for paid plans?",
    answer: "We offer a 14-day money-back guarantee on all paid plans. If you're not satisfied, we'll refund you—no questions asked.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and bank transfers for Enterprise customers.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes, you can cancel your subscription at any time. There are no long-term contracts or cancellation fees.",
  },
]

export default function PricingPage() {
  const productSchema = generateProductSchema()
  const faqSchema = generateFAQSchema(faqs)
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Pricing", url: "/pricing" },
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative px-4 py-16 md:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
          <div className="absolute top-10 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="container mx-auto max-w-4xl text-center relative">
            <Badge variant="secondary" className="mb-6">
              No credit card required
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free with 1 employee. Scale up only when you need to. No hidden fees, no surprises.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <PricingSection />

        {/* FAQ Section */}
        <section className="px-4 py-16">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-muted-foreground">
                Everything you need to know about TrackEx pricing.
              </p>
            </div>
            
            <div className="grid gap-6">
              {faqs.map((faq) => (
                <div key={faq.question} className="bg-card border border-border rounded-xl p-6">
                  <h3 className="font-semibold mb-2 flex items-start gap-3">
                    <HelpCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    {faq.question}
                  </h3>
                  <p className="text-muted-foreground pl-8">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-16 bg-muted/30">
          <div className="container mx-auto max-w-4xl text-center">
            <div className="bg-card border border-border rounded-2xl p-8 md:p-12">
              <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Our team is happy to help you find the right plan for your needs. Get in touch for custom Enterprise pricing or any other questions.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link href="/contact">Contact Sales</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">Start for Free</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </div>
  )
}
