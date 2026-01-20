"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface TOCItem {
  id: string
  title: string
  level: number
}

interface TableOfContentsProps {
  items: TOCItem[]
}

export function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("")

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: "-100px 0px -80% 0px" }
    )

    items.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [items])

  if (items.length === 0) return null

  return (
    <div className="sticky top-24 hidden xl:block">
      <div className="space-y-2">
        <p className="font-semibold mb-4">Table of Contents</p>
        <nav className="space-y-2">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={cn(
                "block text-sm transition-colors hover:text-foreground",
                item.level === 3 && "pl-4",
                activeId === item.id
                  ? "text-foreground font-medium border-l-2 border-primary pl-4"
                  : "text-muted-foreground border-l-2 border-transparent pl-4"
              )}
              onClick={(e) => {
                e.preventDefault()
                const element = document.getElementById(item.id)
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              }}
            >
              {item.title}
            </a>
          ))}
        </nav>
      </div>
    </div>
  )
}

