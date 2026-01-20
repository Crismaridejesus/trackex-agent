import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { BlogCard } from "@/components/blog/blog-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getAllPosts } from "@/lib/blog"
import { generateMetadata as generateSEOMetadata, generateBreadcrumbSchema } from "@/lib/seo"
import { BookOpen, ArrowRight } from "lucide-react"
import Link from "next/link"

export const metadata = generateSEOMetadata({
  title: "Blog - Remote Team Management Tips & Guides",
  description: "Learn best practices for monitoring remote teams, tracking employee productivity, and managing distributed workforces effectively. Expert guides and tips.",
  url: "/blog",
  keywords: "remote team management, employee monitoring blog, productivity tracking tips, remote work best practices, virtual assistant management",
})

export default function BlogPage() {
  const posts = getAllPosts()
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative px-4 py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="container mx-auto max-w-4xl text-center relative">
            <Badge variant="secondary" className="mb-6">
              <BookOpen className="w-3 h-3 mr-1" />
              TrackEx Blog
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              Remote Work Insights
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Tips, guides, and best practices for managing remote teams effectively. Learn from experts who've been there.
            </p>
          </div>
        </section>

        {/* Featured Post (if any) */}
        {posts.length > 0 && (
          <section className="px-4 py-12 border-b border-border">
            <div className="container mx-auto max-w-6xl">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl aspect-video flex items-center justify-center">
                  <BookOpen className="w-24 h-24 text-primary/30" />
                </div>
                <div>
                  <Badge className="mb-4">Featured</Badge>
                  <h2 className="text-2xl md:text-3xl font-bold mb-4">
                    <Link href={`/blog/${posts[0].slug}`} className="hover:text-primary transition-colors">
                      {posts[0].title}
                    </Link>
                  </h2>
                  <p className="text-muted-foreground mb-6 line-clamp-3">
                    {posts[0].description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                    <span>{posts[0].author}</span>
                    <span>•</span>
                    <span>{posts[0].readingTime}</span>
                  </div>
                  <Button asChild>
                    <Link href={`/blog/${posts[0].slug}`}>
                      Read Article
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Blog Posts Grid */}
        <section className="px-4 py-16">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold mb-8">All Articles</h2>
            {posts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map((post) => (
                  <BlogCard key={post.slug} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No articles yet</h3>
                <p className="text-muted-foreground">Check back soon for new content!</p>
              </div>
            )}
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="px-4 py-16 bg-muted/30">
          <div className="container mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold mb-4">Stay Updated</h2>
            <p className="text-muted-foreground mb-6">
              Get the latest remote work tips and TrackEx updates delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button>Subscribe</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              No spam. Unsubscribe anytime.
            </p>
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
