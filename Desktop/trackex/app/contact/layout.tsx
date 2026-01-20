import { generateMetadata as generateSEOMetadata } from "@/lib/seo"

export const metadata = generateSEOMetadata({
  title: "Contact Us - Get in Touch with TrackEx",
  description: "Have questions about TrackEx remote employee monitoring? Contact our team for support, sales inquiries, or enterprise solutions. We respond within 24 hours.",
  url: "/contact",
  keywords: "contact trackex, trackex support, employee monitoring help, remote tracking support, trackex sales",
})

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
