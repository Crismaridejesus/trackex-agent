import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, User } from "lucide-react"
import { BlogPost, formatDate } from "@/lib/blog"

interface BlogCardProps {
  post: BlogPost
}

export function BlogCard({ post }: BlogCardProps) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <Card className="h-full hover:shadow-lg transition-shadow border-2 hover:border-primary/50">
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(post.date)}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{post.readingTime}</span>
            </div>
          </div>
          
          <CardTitle className="text-2xl leading-tight hover:text-primary transition-colors">
            {post.title}
          </CardTitle>
          
          <CardDescription className="text-base mt-2 line-clamp-3">
            {post.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{post.author}</span>
            </div>
            
            <Badge variant="secondary">Read More →</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

