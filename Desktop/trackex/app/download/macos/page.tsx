import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Download, Apple, Monitor, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { generateMetadata as generateSEOMetadata, generateBreadcrumbSchema } from "@/lib/seo"

export const metadata = generateSEOMetadata({
  title: "Download TrackEx for macOS - Employee Monitoring App",
  description: "Download the TrackEx desktop agent for macOS. Native Mac app for time tracking, app monitoring, and productivity tracking. Works on Apple Silicon and Intel Macs.",
  url: "/download/macos",
  keywords: "trackex mac download, macos employee monitoring, mac time tracking app, apple silicon monitoring software, mac productivity tracker",
})

const requirements = [
  "macOS 11 (Big Sur) or later",
  "Apple Silicon (M1/M2/M3) or Intel",
  "100 MB free disk space",
  "Internet connection",
]

const steps = [
  "Download the .dmg file",
  "Open and drag to Applications",
  "Launch TrackEx Agent",
  "Grant accessibility permissions",
  "Log in with your account",
]

export default function MacOSDownloadPage() {
  const downloadUrl = process.env.NEXT_PUBLIC_MACOS_DOWNLOAD_URL_ARM64 || process.env.NEXT_PUBLIC_MACOS_DOWNLOAD_URL || '/downloads/macOS/TrackEx_Agent_1.0.2_aarch64.dmg'
  const version = process.env.NEXT_PUBLIC_MACOS_DOWNLOAD_VERSION || '1.0.2'
  
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Download", url: "/download/macos" },
    { name: "macOS", url: "/download/macos" },
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-4 py-20 md:py-28">
          <div className="container mx-auto max-w-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Apple className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              TrackEx for Mac
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Lightweight time tracking and productivity monitoring for macOS.
            </p>
            
            <Button size="lg" className="mb-4" asChild>
              <a href={downloadUrl} download>
                <Download className="mr-2 h-5 w-5" />
                Download for Mac
              </a>
            </Button>
            
            <p className="text-sm text-muted-foreground">
              Version {version} • macOS 11+ • Apple Silicon & Intel
            </p>
          </div>
        </section>

        {/* Info Section */}
        <section className="px-4 py-16 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <div className="grid md:grid-cols-2 gap-12">
              {/* Requirements */}
              <div>
                <h2 className="text-lg font-semibold mb-4">System Requirements</h2>
                <ul className="space-y-2">
                  {requirements.map((req) => (
                    <li key={req} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Steps */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Installation</h2>
                <ol className="space-y-2">
                  {steps.map((step, i) => (
                    <li key={step} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* Alternative */}
        <section className="px-4 py-12">
          <div className="container mx-auto max-w-2xl text-center">
            <p className="text-muted-foreground mb-4">
              Need the Windows version?
            </p>
            <Button variant="outline" asChild>
              <Link href="/download/windows">
                <Monitor className="mr-2 h-4 w-4" />
                Download for Windows
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
