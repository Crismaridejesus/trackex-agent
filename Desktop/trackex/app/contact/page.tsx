"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, MessageSquare, HelpCircle, Loader2 } from "lucide-react"
import { api } from "@/lib/api"

// Note: metadata must be exported from a Server Component parent, but this is a Client Component
// SEO is handled via the parent layout and dynamic meta tags

interface ContactFormData {
  name: string
  email: string
  company: string
  message: string
}

async function submitContactForm(data: ContactFormData) {
  return api.post<{ success: boolean }>('/api/contact', data)
}

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const contactMutation = useMutation({
    mutationFn: submitContactForm,
    onSuccess: () => {
      setSubmitted(true)
      setError("")
    },
    onError: (err) => {
      setError("Failed to send message. Please try again or email us directly.")
      console.error(err)
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    
    const formData = new FormData(e.currentTarget)
    const data: ContactFormData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      company: formData.get("company") as string,
      message: formData.get("message") as string,
    }

    contactMutation.mutate(data)
  }

  const loading = contactMutation.isPending

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-4 py-16 md:py-24 bg-gradient-to-b from-blue-50/30 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
            <div className="absolute top-20 right-20 w-64 h-64 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 left-20 w-64 h-64 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl"></div>
          </div>
          
          <div className="container mx-auto max-w-4xl text-center relative z-10">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-blue-600 dark:text-blue-400">
              Get in Touch
            </h1>
            <p className="text-xl text-muted-foreground">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>
        </section>

        {/* Contact Form & Info */}
        <section className="px-4 py-16">
          <div className="container mx-auto max-w-5xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div>
                <Card className="border-2 border-blue-200 dark:border-blue-800 shadow-xl bg-white dark:bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-2xl text-blue-600 dark:text-blue-400">Send us a Message</CardTitle>
                    <CardDescription>
                      Fill out the form below and we'll get back to you within 24 hours.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {submitted ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-50 dark:bg-green-950/50 border-2 border-green-200 dark:border-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-green-600 dark:text-green-400">Message Sent!</h3>
                        <p className="text-muted-foreground">
                          Thank you for contacting us. We'll respond within 24 hours.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg text-red-600 dark:text-red-400 text-sm">
                            {error}
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label htmlFor="name">Name</Label>
                          <Input id="name" name="name" placeholder="Your name" required disabled={loading} />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" name="email" type="email" placeholder="you@company.com" required disabled={loading} />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="company">Company (optional)</Label>
                          <Input id="company" name="company" placeholder="Your company name" disabled={loading} />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="message">Message</Label>
                          <textarea
                            id="message"
                            name="message"
                            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Tell us how we can help..."
                            required
                            disabled={loading}
                          />
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30" 
                          size="lg"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            "Send Message"
                          )}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Contact Info & FAQ */}
              <div className="space-y-8">
                {/* Direct Contact */}
                <div>
                  <h2 className="text-2xl font-bold mb-6">Other Ways to Reach Us</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center flex-shrink-0">
                        <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Email Support</h3>
                        <p className="text-muted-foreground text-sm">support@trackex.com</p>
                        <p className="text-muted-foreground text-sm">We typically respond within 24 hours</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Sales Inquiries</h3>
                        <p className="text-muted-foreground text-sm">sales@trackex.com</p>
                        <p className="text-muted-foreground text-sm">For enterprise plans and custom solutions</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick FAQ */}
                <div>
                  <h2 className="text-2xl font-bold mb-6">Quick Answers</h2>
                  
                  <div className="space-y-4">
                    <div className="border-l-2 border-blue-600 dark:border-blue-400 pl-4">
                      <h3 className="font-semibold mb-1 flex items-center gap-2">
                        <HelpCircle className="h-4 w-4" />
                        Is it really free?
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Yes! Up to 3 employees are completely free forever. No credit card required.
                      </p>
                    </div>

                    <div className="border-l-2 border-blue-600 dark:border-blue-400 pl-4">
                      <h3 className="font-semibold mb-1 flex items-center gap-2">
                        <HelpCircle className="h-4 w-4" />
                        How long does setup take?
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Less than 5 minutes total. Install the desktop agent and you're done.
                      </p>
                    </div>

                    <div className="border-l-2 border-blue-600 dark:border-blue-400 pl-4">
                      <h3 className="font-semibold mb-1 flex items-center gap-2">
                        <HelpCircle className="h-4 w-4" />
                        Do you offer refunds?
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Yes, we offer a 14-day money-back guarantee for all paid plans.
                      </p>
                    </div>

                    <div className="border-l-2 border-blue-600 dark:border-blue-400 pl-4">
                      <h3 className="font-semibold mb-1 flex items-center gap-2">
                        <HelpCircle className="h-4 w-4" />
                        What platforms do you support?
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Both macOS and Windows. The desktop agent works on both platforms.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  )
}

