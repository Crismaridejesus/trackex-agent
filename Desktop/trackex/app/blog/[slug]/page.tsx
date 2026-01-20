import { notFound } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { BlogHeader } from "@/components/blog/blog-header"
import { RelatedPosts } from "@/components/blog/related-posts"
import { getPostBySlug, getRelatedPosts, getAllPosts } from "@/lib/blog"
import { generateMetadata as generateSEOMetadata, generateArticleSchema } from "@/lib/seo"
import { promises as fs } from "fs"
import path from "path"
import { Metadata } from "next"

interface BlogPostPageProps {
  params: {
    slug: string
  }
}

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = getPostBySlug(params.slug)
  
  if (!post) {
    return {}
  }

  return generateSEOMetadata({
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    url: `/blog/${post.slug}`,
    type: "article",
    publishedTime: post.date,
    author: post.author,
  })
}

async function getPostContent(slug: string): Promise<string> {
  const contentPath = path.join(process.cwd(), "content", "blog", `${slug}.md`)
  try {
    const content = await fs.readFile(contentPath, "utf-8")
    return content
  } catch (error) {
    console.error("Error reading blog post:", error)
    return ""
  }
}

function parseMarkdownToHTML(markdown: string): string {
  // Simple markdown parsing (for production, consider using a library like react-markdown)
  let html = markdown
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 id="$1" class="text-2xl font-bold mt-8 mb-4">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 id="$1" class="text-3xl font-bold mt-12 mb-6">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '') // Remove H1 as we show it in BlogHeader
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline font-medium">$1</a>')
  
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
  
  // Paragraphs
  html = html.split('\n\n').map(para => {
    if (para.startsWith('<h') || para.trim() === '') return para
    return `<p class="mb-6 leading-relaxed text-lg">${para}</p>`
  }).join('\n')
  
  return html
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const post = getPostBySlug(params.slug)
  
  if (!post) {
    notFound()
  }

  const content = await getPostContent(params.slug)
  const htmlContent = parseMarkdownToHTML(content)
  const relatedPosts = getRelatedPosts(params.slug)

  const schema = generateArticleSchema({
    title: post.title,
    description: post.description,
    url: `/blog/${params.slug}`,
    publishedTime: post.date,
    author: post.author,
  })

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <article className="px-4 py-16 md:py-24">
          <div className="container mx-auto max-w-4xl">
            <BlogHeader
              title={post.title}
              description={post.description}
              date={post.date}
              author={post.author}
              readingTime={post.readingTime}
            />
            
            <div 
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
            
            <RelatedPosts posts={relatedPosts} />
          </div>
        </article>
      </main>
      
      <Footer />
      
      {/* Schema.org markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </div>
  )
}

