"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Clock } from "lucide-react"
import { getAllPosts } from "@/lib/blog"

export function BlogSection() {
  const allPosts = getAllPosts()
  const latestPosts = allPosts.slice(0, 3)

  return (
    <section className="section-padding bg-muted/30">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">
              From the Blog
            </h2>
            <p className="text-muted-foreground">
              Insights on remote team management and productivity.
            </p>
          </div>
          <Link
            href="/blog"
            className="text-primary hover:text-primary/80 text-sm font-medium inline-flex items-center gap-1"
          >
            View all articles
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {latestPosts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <Card className="h-full border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-5">
                  <div className="text-xs font-medium text-primary mb-2">
                    Management
                  </div>
                  <h3 className="font-semibold mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {post.description}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{post.readingTime}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
