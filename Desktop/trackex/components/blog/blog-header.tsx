import { Calendar, Clock, User } from "lucide-react"
import { formatDate } from "@/lib/blog"

interface BlogHeaderProps {
  title: string
  description: string
  date: string
  author: string
  readingTime: string
}

export function BlogHeader({ title, description, date, author, readingTime }: BlogHeaderProps) {
  return (
    <div className="max-w-4xl mx-auto text-center mb-12">
      <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">{title}</h1>
      
      <p className="text-xl text-muted-foreground mb-6 leading-relaxed">{description}</p>
      
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span>{author}</span>
        </div>
        
        <span>•</span>
        
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(date)}</span>
        </div>
        
        <span>•</span>
        
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>{readingTime}</span>
        </div>
      </div>
    </div>
  )
}

