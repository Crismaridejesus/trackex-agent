import { SimpleLoginForm } from "@/components/auth/simple-login-form"
import { APP_NAME } from "@/lib/constants"
import Link from "next/link"
import { Shield, Clock, BarChart3 } from "lucide-react"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Login - TrackEx Dashboard",
  description: "Sign in to your TrackEx account to access your remote team monitoring dashboard. Track time, monitor productivity, and manage your workforce.",
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 mb-8">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">T</span>
            </div>
            <span className="font-bold text-xl">{APP_NAME}</span>
          </Link>
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
            <p className="text-muted-foreground">
              Sign in to access your dashboard
            </p>
          </div>
          
          {/* Form */}
          <SimpleLoginForm />
          
          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              Don't have an account?{" "}
              <Link href="/contact" className="text-primary font-medium hover:underline">
                Contact us
              </Link>
            </p>
          </div>
          
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
      
      {/* Right Side - Branding */}
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-primary-foreground">
          <h2 className="text-3xl font-bold mb-6">
            Monitor your remote team with confidence
          </h2>
          <p className="text-primary-foreground/80 mb-8">
            Get real-time visibility into your team's productivity without micromanaging.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Automatic Time Tracking</p>
                <p className="text-sm text-primary-foreground/70">Clock-in with idle detection</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Productivity Insights</p>
                <p className="text-sm text-primary-foreground/70">Smart app categorization</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Privacy-First</p>
                <p className="text-sm text-primary-foreground/70">No keystroke logging</p>
              </div>
            </div>
          </div>
          
          <div className="mt-10 pt-8 border-t border-white/20">
            <p className="text-sm text-primary-foreground/70">
              Free for 1 employee • No credit card required
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
