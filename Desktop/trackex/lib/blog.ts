export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  author: string
  readingTime: string
  keywords: string
  content: string
  relatedPosts?: string[]
}

export const blogPosts: BlogPost[] = [
  {
    slug: "remote-tracking-employee-attendance",
    title:
      "Remote Tracking Software for Employee Attendance: The 2026 Complete Guide",
    description:
      "Everything you need to know about tracking employee attendance remotely. From choosing the right software to implementation best practices for modern distributed teams.",
    date: "2026-01-12",
    author: "TrackEx Team",
    readingTime: "10 min read",
    keywords:
      "remote tracking software, tracking employee attendance, employee attendance tracking, remote workforce management, time tracking software",
    content: "",
    relatedPosts: ["monitoring-home-office-guide", "app-remote-monitoring"],
  },
  {
    slug: "employee-tracking-spreadsheet",
    title: "Employee Tracking Spreadsheet: Why You Need Better Tools in 2025",
    description:
      "Still using spreadsheets to track employee time? Learn why spreadsheets fail for modern teams and how to transition to better tracking solutions.",
    date: "2026-01-5",
    author: "TrackEx Team",
    readingTime: "6 min read",
    keywords:
      "employee tracking spreadsheet, time tracking spreadsheet, employee time tracking, spreadsheet alternatives",
    content: "",
    relatedPosts: [
      "monitoring-home-office-guide",
      "remote-tracking-employee-attendance",
    ],
  },
  {
    slug: "app-remote-monitoring",
    title:
      "App Remote Monitoring: How to Track Remote Employee Productivity Without Micromanaging",
    description:
      "Discover how app remote monitoring works, its benefits for remote teams, privacy considerations, and how to implement it effectively in your organization.",
    date: "2025-01-29",
    author: "TrackEx Team",
    readingTime: "7 min read",
    keywords:
      "app remote monitoring, remote productivity tracking, employee app monitoring, remote work tools",
    content: "",
    relatedPosts: [
      "employee-tracking-spreadsheet",
      "remote-tracking-employee-attendance",
    ],
  },
  {
    slug: "monitoring-home-office-guide",
    title: "Monitoring Home Office Employees: A Complete 2025 Guide",
    description:
      "Learn how to effectively monitor home office employees without micromanaging. Discover best practices, legal considerations, and the right tools for remote team management.",
    date: "2025-01-22",
    author: "TrackEx Team",
    readingTime: "8 min read",
    keywords:
      "monitoring home office, remote employee monitoring, home office tracking, work from home monitoring",
    content: "",
    relatedPosts: [
      "app-remote-monitoring",
      "remote-tracking-employee-attendance",
    ],
  },
]

export function getAllPosts(): BlogPost[] {
  return blogPosts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug)
}

export function getRelatedPosts(slug: string, limit: number = 2): BlogPost[] {
  const currentPost = getPostBySlug(slug)
  if (!currentPost || !currentPost.relatedPosts) return []

  return currentPost.relatedPosts
    .map((relatedSlug) => getPostBySlug(relatedSlug))
    .filter((post): post is BlogPost => post !== undefined)
    .slice(0, limit)
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function generateTableOfContents(
  content: string
): { id: string; title: string; level: number }[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm
  const toc: { id: string; title: string; level: number }[] = []

  let match
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length
    const title = match[2].trim()
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-")

    toc.push({ id, title, level })
  }

  return toc
}
